begin;
create or replace function public.payment_record_capture(p_booking_id uuid,p_order_id text,p_payment_id text,p_amount_paise integer,p_currency text,p_fully_refunded boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; o app_private.payment_orders; previous app_private.captured_payments;
begin
  perform app_private.expire_payment_holds();
  select * into b from public.bookings where id=p_booking_id for update;
  select * into o from app_private.payment_orders where booking_id=b.id for update;
  if not found or o.provider_order_id is distinct from p_order_id or p_payment_id is null or p_payment_id!~'^pay_[a-zA-Z0-9]{1,100}$'
    or b.amount_paise is distinct from p_amount_paise or b.currency is distinct from p_currency or p_fully_refunded is null
    then raise exception 'PAYMENT_MISMATCH'; end if;
  select * into previous from app_private.captured_payments where payment_id=p_payment_id;
  if found then
    if previous.booking_id<>b.id or previous.order_id<>p_order_id then raise exception 'PAYMENT_MISMATCH'; end if;
    if p_fully_refunded then
      update app_private.captured_payments set refund_state='processed' where payment_id=p_payment_id;
      if o.paid_payment_id=p_payment_id then
        if b.status in ('awaiting_payment','confirmed') then
          update public.bookings set status='cancelled',updated_at=clock_timestamp() where id=b.id;
          insert into public.booking_events(booking_id,actor_id,action) values(b.id,b.learner_id,'cancelled');
        end if;
        update public.booking_payment_status set state='refunded',updated_at=clock_timestamp() where booking_id=b.id;
      end if;
    end if;
    return;
  end if;
  insert into app_private.captured_payments(payment_id,booking_id,order_id,refund_state)
    values(p_payment_id,b.id,p_order_id,case when p_fully_refunded then 'processed' else null end);
  if o.paid_payment_id is not null then
    if not p_fully_refunded then perform app_private.queue_refund(p_payment_id); end if;
    return;
  end if;
  update app_private.payment_orders set paid_payment_id=p_payment_id where booking_id=b.id;
  if p_fully_refunded then
    if b.status in ('awaiting_payment','confirmed') then
      update public.bookings set status='cancelled',updated_at=clock_timestamp() where id=b.id;
      insert into public.booking_events(booking_id,actor_id,action) values(b.id,b.learner_id,'cancelled');
    end if;
    update public.booking_payment_status set state='refunded',updated_at=clock_timestamp() where booking_id=b.id;
  elsif b.status='awaiting_payment' and b.hold_expires_at>clock_timestamp() then
    update public.bookings set status='confirmed',updated_at=clock_timestamp() where id=b.id;
    update public.booking_payment_status set state='paid',updated_at=clock_timestamp() where booking_id=b.id;
    insert into public.booking_events(booking_id,actor_id,action) values(b.id,b.learner_id,'confirmed');
  else
    -- Time can advance after the initial expiry sweep while capture is recorded.
    -- Complete the expiry transition before queuing the refund obligation.
    if b.status='awaiting_payment' then
      update public.bookings set status='expired',updated_at=clock_timestamp() where id=b.id;
      insert into public.booking_events(booking_id,actor_id,action) values(b.id,b.learner_id,'expired');
    end if;
    perform app_private.queue_refund(p_payment_id);
  end if;
end; $$;

create or replace function public.payment_finish_job(p_job_id uuid,p_token uuid,p_done boolean,p_error text default null)
returns void language plpgsql security definer set search_path='' as $$
declare j app_private.payment_jobs;
begin
  if p_done is null or (p_error is not null and p_error!~'^[A-Z_]{1,60}$') then raise exception 'INVALID_INPUT'; end if;
  select * into j from app_private.payment_jobs where id=p_job_id and lease_token=p_token and leased_until>clock_timestamp() for update;
  if not found then raise exception 'LEASE_LOST'; end if;
  update app_private.payment_jobs set state=case when p_done then 'done' when attempts>=12 then 'action_required' else 'ready' end,
    available_at=clock_timestamp()+least(300,10*power(2,least(attempts,5))) * interval '1 second',
    lease_token=null,leased_until=null,last_error=p_error where id=j.id;
  if not p_done and j.attempts>=12 then
    if j.kind='refund' then
      update app_private.captured_payments set refund_state='action_required' where payment_id=j.payment_id and refund_state<>'processed';
    end if;
    update public.booking_payment_status set state='action_required',updated_at=clock_timestamp()
      where booking_id=j.booking_id and state in ('awaiting_payment','refund_pending','expired');
  end if;
end; $$;

commit;
