import { ActionForm } from "@/components/action-form";
import { completeBooking } from "@/features/bookings/actions";
export function EndSessionForm({ bookingId }: { bookingId: string }) {
  return (
    <details className="end-session">
      <summary>End session</summary>
      <p className="muted">
        Finished your call? This ends the Nexus session, removes its join
        access, and lets the student rate you. End the Google Meet call for
        everyone separately.
      </p>
      <ActionForm
        action={completeBooking}
        submitLabel="End session & unlock rating"
      >
        <input type="hidden" name="bookingId" value={bookingId} />
      </ActionForm>
    </details>
  );
}
