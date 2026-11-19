import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Video } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { idSchema, databaseError, meetingSchema } from "@/lib/validation";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: url, error } = await supabase.rpc("get_booking_join_url", {
    p_booking_id: id,
  });
  const valid = url
    ? meetingSchema.safeParse({ bookingId: id, joinUrl: url }).success
    : false;
  return (
    <div className="shell narrow page-space">
      <div className="panel join-panel">
        <Video size={32} />
        <span className="eyebrow">YOUR INTRODUCTION</span>
        <h1>A conversation away.</h1>
        {error || !valid ? (
          <p className="feedback">
            {databaseError(error?.message || "MEETING_NOT_READY")}
          </p>
        ) : (
          <>
            <p className="lead">
              Your private meeting link is ready. It opens in a new tab.
            </p>
            <a
              className="button"
              href={url!}
              target="_blank"
              rel="noreferrer noopener"
            >
              Join video call <ArrowUpRight size={18} />
            </a>
          </>
        )}
        <p className="muted">
          Access opens 15 minutes before your call. Please keep the meeting link
          private.
        </p>
        <Link className="text-link" href="/dashboard">
          Back to your sessions
        </Link>
      </div>
    </div>
  );
}
