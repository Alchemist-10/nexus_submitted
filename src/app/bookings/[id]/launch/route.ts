import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { idSchema, meetingSchema } from "@/lib/validation";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success)
    return new NextResponse("Not found", { status: 404 });
  const db = await createSupabaseServerClient();
  const { data: url, error } = await db.rpc("get_booking_join_url", {
    p_booking_id: id,
  });
  const valid =
    !error &&
    url &&
    meetingSchema.safeParse({ bookingId: id, joinUrl: url }).success;
  const response = NextResponse.redirect(
    valid ? url : new URL(`/bookings/${id}/join`, request.url),
    { status: 303 },
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
