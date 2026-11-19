"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  bookingSchema,
  idSchema,
  databaseError,
  type ActionState,
} from "@/lib/validation";
import { paymentConfigured } from "./server";
import { parseINR } from "./shared";

export async function reservePaidSession(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  if (!paymentConfigured())
    return {
      error:
        "Test checkout is being set up. Please try again once payments are enabled.",
    };
  const parsed = bookingSchema.safeParse(Object.fromEntries(form));
  const source = String(form.get("sourcePostId") || "");
  if (!parsed.success || (source && !idSchema.safeParse(source).success))
    return { error: "Refresh and choose a valid slot." };
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("reserve_paid_session", {
    p_slot_id: parsed.data.slotId,
    p_request_key: parsed.data.requestKey,
    ...(source ? { p_post_id: source } : {}),
  });
  if (error) return { error: databaseError(error.message) };
  if (!data?.[0]) return { error: "The slot could not be reserved." };
  revalidatePath("/", "layout");
  redirect(`/checkout/${data[0].id}`);
}
export async function saveMentorPrice(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  let amount: number | null;
  try {
    amount = parseINR(String(form.get("price") || ""));
  } catch {
    return {
      error:
        "Enter a price from ₹1 to ₹25,000, with at most two decimal places, or leave blank to disable paid sessions.",
    };
  }
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("set_mentor_price", {
    p_amount_paise: amount,
  });
  if (error) return { error: databaseError(error.message) };
  revalidatePath("/", "layout");
  return {
    success:
      amount === null
        ? "Paid follow-ups disabled. Free introductions remain available."
        : "Your follow-up session price has been saved.",
  };
}
