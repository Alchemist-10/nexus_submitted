"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  bookingSchema,
  idSchema,
  meetingSchema,
  mentorSchema,
  slotSchema,
  databaseError,
  type ActionState,
} from "@/lib/validation";

function refreshed() {
  revalidatePath("/", "layout");
}

export async function bookFreeIntro(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = bookingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Refresh this page and select a valid slot." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("book_free_intro", {
    p_slot_id: parsed.data.slotId,
    p_request_key: parsed.data.requestKey,
  });
  if (error) return { error: databaseError(error.message) };
  refreshed();
  redirect("/dashboard?notice=booked");
}

export async function saveMentor(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = mentorSchema.safeParse({
    headline: form.get("headline"),
    bio: form.get("bio"),
    expertise: String(form.get("expertise") || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message || "Check your mentor profile.",
    };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_mentor_profile", {
    p_headline: parsed.data.headline,
    p_bio: parsed.data.bio,
    p_expertise: parsed.data.expertise,
  });
  if (error) return { error: databaseError(error.message) };
  refreshed();
  return {
    success:
      "Your mentor profile is published. Add an introductory slot below.",
  };
}

export async function createSlot(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = slotSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error:
        parsed.error.issues[0]?.message || "Choose valid start and end times.",
    };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_availability", {
    p_starts_at: parsed.data.startsAt,
    p_ends_at: parsed.data.endsAt,
  });
  if (error) return { error: databaseError(error.message) };
  refreshed();
  return { success: "Your slot is available for booking." };
}

export async function closeSlot(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = idSchema.safeParse(form.get("slotId"));
  if (!parsed.success) return { error: "Invalid slot." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("close_availability", {
    p_slot_id: parsed.data,
  });
  if (error) return { error: databaseError(error.message) };
  refreshed();
  return { success: "Slot closed." };
}

export async function cancelBooking(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = idSchema.safeParse(form.get("bookingId"));
  if (!parsed.success) return { error: "Invalid booking." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_free_intro", {
    p_booking_id: parsed.data,
  });
  if (error) return { error: databaseError(error.message) };
  refreshed();
  return {
    success: "Booking cancelled. The free introduction is available again.",
  };
}

export async function completeBooking(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = idSchema.safeParse(form.get("bookingId"));
  if (!parsed.success) return { error: "Invalid booking." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("complete_free_intro", {
    p_booking_id: parsed.data,
  });
  if (error) return { error: databaseError(error.message) };
  refreshed();
  return { success: "Introduction marked complete." };
}

export async function saveMeeting(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = meetingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message || "Enter a valid meeting link.",
    };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_booking_meeting", {
    p_booking_id: parsed.data.bookingId,
    p_join_url: parsed.data.joinUrl,
  });
  if (error) return { error: databaseError(error.message) };
  refreshed();
  return { success: "Meeting link saved privately for this session." };
}
