// Schema-derived contracts for this migration. Regenerate with the Supabase CLI
// after applying migrations; see README. Public profile rows never include email.
export type Profile = {
  id: string;
  username: string;
  full_name: string;
  created_at: string;
};
export type Mentor = {
  user_id: string;
  headline: string;
  bio: string;
  expertise: string[];
  is_listed: boolean;
  created_at: string;
};
export type Slot = {
  id: string;
  mentor_id: string;
  starts_at: string;
  ends_at: string;
  is_open: boolean;
  created_at: string;
};
export type AvailableSlot = Pick<
  Slot,
  "id" | "mentor_id" | "starts_at" | "ends_at"
>;
export type Booking = {
  id: string;
  slot_id: string;
  mentor_id: string;
  learner_id: string;
  request_key: string;
  starts_at: string;
  ends_at: string;
  status: "confirmed" | "cancelled" | "completed";
  created_at: string;
  updated_at: string;
};
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      mentor_profiles: Table<Mentor>;
      availability_slots: Table<Slot>;
      bookings: Table<Booking>;
      booking_events: Table<{
        id: number;
        booking_id: string;
        actor_id: string;
        action: string;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      save_mentor_profile: {
        Args: { p_headline: string; p_bio: string; p_expertise: string[] };
        Returns: undefined;
      };
      create_availability: {
        Args: { p_starts_at: string; p_ends_at: string };
        Returns: Slot[];
      };
      close_availability: { Args: { p_slot_id: string }; Returns: undefined };
      get_available_slots: {
        Args: { p_mentor_id: string };
        Returns: AvailableSlot[];
      };
      book_free_intro: {
        Args: { p_slot_id: string; p_request_key: string };
        Returns: Booking[];
      };
      cancel_free_intro: { Args: { p_booking_id: string }; Returns: Booking[] };
      complete_free_intro: {
        Args: { p_booking_id: string };
        Returns: Booking[];
      };
      set_booking_meeting: {
        Args: { p_booking_id: string; p_join_url: string };
        Returns: undefined;
      };
      get_booking_join_url: { Args: { p_booking_id: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
