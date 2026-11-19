import type { Database } from "./database.generated";

export type { Database };
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Mentor = Database["public"]["Tables"]["mentor_profiles"]["Row"];
export type Slot = Database["public"]["Tables"]["availability_slots"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type AvailableSlot =
  Database["public"]["Functions"]["get_available_slots"]["Returns"][number];
