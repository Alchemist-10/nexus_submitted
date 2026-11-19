import type { Database as Generated } from "./database.generated";
// PostgreSQL function arguments accept SQL NULL; introspection currently omits
// that distinction. NULL explicitly clears an accepted answer.
export type Database = Omit<Generated, "public"> & {
  public: Omit<Generated["public"], "Functions"> & {
    Functions: Omit<
      Generated["public"]["Functions"],
      "accept_community_answer"
    > & {
      accept_community_answer: {
        Args: { p_post_id: string; p_answer_id: string | null };
        Returns: undefined;
      };
    };
  };
};
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Mentor = Database["public"]["Tables"]["mentor_profiles"]["Row"];
export type Slot = Database["public"]["Tables"]["availability_slots"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type AvailableSlot =
  Database["public"]["Functions"]["get_available_slots"]["Returns"][number];
