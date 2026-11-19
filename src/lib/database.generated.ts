export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      availability_slots: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          is_open: boolean;
          mentor_id: string;
          starts_at: string;
        };
        Insert: {
          created_at?: string;
          ends_at: string;
          id?: string;
          is_open?: boolean;
          mentor_id: string;
          starts_at: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          is_open?: boolean;
          mentor_id?: string;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_slots_mentor_id_fkey";
            columns: ["mentor_id"];
            isOneToOne: false;
            referencedRelation: "mentor_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      booking_events: {
        Row: {
          action: string;
          actor_id: string;
          booking_id: string;
          created_at: string;
          id: number;
        };
        Insert: {
          action: string;
          actor_id: string;
          booking_id: string;
          created_at?: string;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string;
          booking_id?: string;
          created_at?: string;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "booking_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "member_activity_counts";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "booking_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_events_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_meetings: {
        Row: {
          booking_id: string;
          join_url: string;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          join_url: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          join_url?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_meetings_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_participants: {
        Row: {
          active: boolean;
          booking_id: string;
          ends_at: string;
          starts_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          booking_id: string;
          ends_at: string;
          starts_at: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          booking_id?: string;
          ends_at?: string;
          starts_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_participants_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "member_activity_counts";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "booking_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_payment_status: {
        Row: {
          booking_id: string;
          state: string;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          state: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          state?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_payment_status_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          amount_paise: number;
          created_at: string;
          currency: string;
          ends_at: string;
          hold_expires_at: string | null;
          id: string;
          kind: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
          source_post_id: string | null;
          starts_at: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount_paise?: number;
          created_at?: string;
          currency?: string;
          ends_at: string;
          hold_expires_at?: string | null;
          id?: string;
          kind?: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
          source_post_id?: string | null;
          starts_at: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount_paise?: number;
          created_at?: string;
          currency?: string;
          ends_at?: string;
          hold_expires_at?: string | null;
          id?: string;
          kind?: string;
          learner_id?: string;
          mentor_id?: string;
          request_key?: string;
          slot_id?: string;
          source_post_id?: string | null;
          starts_at?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "member_activity_counts";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "bookings_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_mentor_id_fkey";
            columns: ["mentor_id"];
            isOneToOne: false;
            referencedRelation: "member_activity_counts";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "bookings_mentor_id_fkey";
            columns: ["mentor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_slot_id_mentor_id_starts_at_ends_at_fkey";
            columns: ["slot_id", "mentor_id", "starts_at", "ends_at"];
            isOneToOne: false;
            referencedRelation: "availability_slots";
            referencedColumns: ["id", "mentor_id", "starts_at", "ends_at"];
          },
          {
            foreignKeyName: "bookings_source_post_id_fkey";
            columns: ["source_post_id"];
            isOneToOne: false;
            referencedRelation: "community_post_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_source_post_id_fkey";
            columns: ["source_post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      community_answers: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          post_id: string;
        };
        Insert: {
          author_id?: string;
          body: string;
          created_at?: string;
          id?: string;
          post_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_answers_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "member_activity_counts";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "community_answers_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_answers_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_post_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_answers_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      community_posts: {
        Row: {
          accepted_answer_id: string | null;
          author_id: string;
          body: string;
          category: string;
          created_at: string;
          id: string;
          image_paths: string[];
          stuck_on: string;
          tags: string[];
          title: string;
        };
        Insert: {
          accepted_answer_id?: string | null;
          author_id?: string;
          body: string;
          category: string;
          created_at?: string;
          id?: string;
          image_paths?: string[];
          stuck_on: string;
          tags: string[];
          title: string;
        };
        Update: {
          accepted_answer_id?: string | null;
          author_id?: string;
          body?: string;
          category?: string;
          created_at?: string;
          id?: string;
          image_paths?: string[];
          stuck_on?: string;
          tags?: string[];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accepted_answer_same_post";
            columns: ["accepted_answer_id", "id"];
            isOneToOne: false;
            referencedRelation: "community_answer_summaries";
            referencedColumns: ["id", "post_id"];
          },
          {
            foreignKeyName: "accepted_answer_same_post";
            columns: ["accepted_answer_id", "id"];
            isOneToOne: false;
            referencedRelation: "community_answers";
            referencedColumns: ["id", "post_id"];
          },
          {
            foreignKeyName: "community_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "member_activity_counts";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "community_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      community_reports: {
        Row: {
          created_at: string;
          id: number;
          post_id: string;
          reason: string;
          reporter_id: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          post_id: string;
          reason: string;
          reporter_id?: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          post_id?: string;
          reason?: string;
          reporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_reports_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_post_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_reports_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "member_activity_counts";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "community_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      community_votes: {
        Row: {
          answer_id: string | null;
          created_at: string;
          id: number;
          post_id: string | null;
          voter_id: string;
        };
        Insert: {
          answer_id?: string | null;
          created_at?: string;
          id?: never;
          post_id?: string | null;
          voter_id?: string;
        };
        Update: {
          answer_id?: string | null;
          created_at?: string;
          id?: never;
          post_id?: string | null;
          voter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_votes_answer_id_fkey";
            columns: ["answer_id"];
            isOneToOne: false;
            referencedRelation: "community_answer_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_votes_answer_id_fkey";
            columns: ["answer_id"];
            isOneToOne: false;
            referencedRelation: "community_answers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_votes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_post_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_votes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_votes_voter_id_fkey";
            columns: ["voter_id"];
            isOneToOne: false;
            referencedRelation: "member_activity_counts";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "community_votes_voter_id_fkey";
            columns: ["voter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mentor_profiles: {
        Row: {
          bio: string;
          created_at: string;
          expertise: string[];
          headline: string;
          is_listed: boolean;
          session_price_paise: number | null;
          user_id: string;
        };
        Insert: {
          bio?: string;
          created_at?: string;
          expertise?: string[];
          headline: string;
          is_listed?: boolean;
          session_price_paise?: number | null;
          user_id: string;
        };
        Update: {
          bio?: string;
          created_at?: string;
          expertise?: string[];
          headline?: string;
          is_listed?: boolean;
          session_price_paise?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "member_activity_counts";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "mentor_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mentor_ratings: {
        Row: {
          booking_id: string;
          created_at: string;
          score: number;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          score: number;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          score?: number;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_ratings_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          avatar_variant: number;
          bio: string;
          created_at: string;
          full_name: string;
          id: string;
          username: string;
        };
        Insert: {
          avatar_path?: string | null;
          avatar_variant?: number;
          bio?: string;
          created_at?: string;
          full_name: string;
          id: string;
          username: string;
        };
        Update: {
          avatar_path?: string | null;
          avatar_variant?: number;
          bio?: string;
          created_at?: string;
          full_name?: string;
          id?: string;
          username?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      community_answer_summaries: {
        Row: {
          author_avatar_path: string | null;
          author_avatar_variant: number | null;
          author_id: string | null;
          author_name: string | null;
          author_username: string | null;
          body: string | null;
          created_at: string | null;
          id: string | null;
          is_mentor: boolean | null;
          post_id: string | null;
          upvotes: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "community_answers_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "member_activity_counts";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "community_answers_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_answers_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_post_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_answers_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      community_post_summaries: {
        Row: {
          accepted_answer_id: string | null;
          answer_count: number | null;
          author_avatar_path: string | null;
          author_avatar_variant: number | null;
          author_id: string | null;
          author_name: string | null;
          author_username: string | null;
          body: string | null;
          category: string | null;
          created_at: string | null;
          id: string | null;
          image_paths: string[] | null;
          stuck_on: string | null;
          tags: string[] | null;
          title: string | null;
          upvotes: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "accepted_answer_same_post";
            columns: ["accepted_answer_id", "id"];
            isOneToOne: false;
            referencedRelation: "community_answer_summaries";
            referencedColumns: ["id", "post_id"];
          },
          {
            foreignKeyName: "accepted_answer_same_post";
            columns: ["accepted_answer_id", "id"];
            isOneToOne: false;
            referencedRelation: "community_answers";
            referencedColumns: ["id", "post_id"];
          },
          {
            foreignKeyName: "community_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "member_activity_counts";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "community_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      member_activity_counts: {
        Row: {
          answer_count: number | null;
          helpful_answer_count: number | null;
          post_count: number | null;
          profile_id: string | null;
        };
        Insert: {
          answer_count?: never;
          helpful_answer_count?: never;
          post_count?: never;
          profile_id?: string | null;
        };
        Update: {
          answer_count?: never;
          helpful_answer_count?: never;
          post_count?: never;
          profile_id?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_community_answer: {
        Args: { p_answer_id: string; p_post_id: string };
        Returns: undefined;
      };
      book_free_intro: {
        Args: { p_request_key: string; p_slot_id: string };
        Returns: {
          amount_paise: number;
          created_at: string;
          currency: string;
          ends_at: string;
          hold_expires_at: string | null;
          id: string;
          kind: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
          source_post_id: string | null;
          starts_at: string;
          status: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      book_post_intro: {
        Args: { p_post_id: string; p_request_key: string; p_slot_id: string };
        Returns: {
          amount_paise: number;
          created_at: string;
          currency: string;
          ends_at: string;
          hold_expires_at: string | null;
          id: string;
          kind: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
          source_post_id: string | null;
          starts_at: string;
          status: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      cancel_free_intro: {
        Args: { p_booking_id: string };
        Returns: {
          amount_paise: number;
          created_at: string;
          currency: string;
          ends_at: string;
          hold_expires_at: string | null;
          id: string;
          kind: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
          source_post_id: string | null;
          starts_at: string;
          status: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      close_availability: { Args: { p_slot_id: string }; Returns: undefined };
      community_skill_key: { Args: { p_skill: string }; Returns: string };
      complete_free_intro: {
        Args: { p_booking_id: string };
        Returns: {
          amount_paise: number;
          created_at: string;
          currency: string;
          ends_at: string;
          hold_expires_at: string | null;
          id: string;
          kind: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
          source_post_id: string | null;
          starts_at: string;
          status: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_availability: {
        Args: { p_ends_at: string; p_starts_at: string };
        Returns: {
          created_at: string;
          ends_at: string;
          id: string;
          is_open: boolean;
          mentor_id: string;
          starts_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "availability_slots";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      get_available_slots: {
        Args: { p_mentor_id: string };
        Returns: {
          ends_at: string;
          id: string;
          mentor_id: string;
          starts_at: string;
        }[];
      };
      get_booking_join_url: { Args: { p_booking_id: string }; Returns: string };
      get_mentor_ratings: {
        Args: { p_mentor_ids: string[] };
        Returns: {
          average_rating: number;
          mentor_id: string;
          rating_count: number;
        }[];
      };
      payment_attach_order: {
        Args: {
          p_amount_paise: number;
          p_booking_id: string;
          p_currency: string;
          p_order_id: string;
          p_token: string;
        };
        Returns: undefined;
      };
      payment_claim_jobs: {
        Args: { p_booking_id?: string; p_limit?: number };
        Returns: Json[];
      };
      payment_claim_order: { Args: { p_booking_id: string }; Returns: Json };
      payment_finish_job: {
        Args: {
          p_done: boolean;
          p_error?: string;
          p_job_id: string;
          p_token: string;
        };
        Returns: undefined;
      };
      payment_get_context: { Args: { p_booking_id: string }; Returns: Json };
      payment_lookup_order: { Args: { p_order_id: string }; Returns: string };
      payment_record_capture: {
        Args: {
          p_amount_paise: number;
          p_booking_id: string;
          p_currency: string;
          p_fully_refunded?: boolean;
          p_order_id: string;
          p_payment_id: string;
        };
        Returns: undefined;
      };
      payment_record_refund: {
        Args: {
          p_payment_id: string;
          p_processed: boolean;
          p_refund_id: string;
        };
        Returns: undefined;
      };
      payment_webhook_event: {
        Args: { p_complete?: boolean; p_event_id: string; p_order_id: string };
        Returns: string;
      };
      rate_mentor: {
        Args: { p_booking_id: string; p_score: number };
        Returns: undefined;
      };
      recommend_post_mentors: {
        Args: { p_post_id: string };
        Returns: {
          accepted_answers: number;
          answer_upvotes: number;
          full_name: string;
          headline: string;
          matched_tags: string[];
          mentor_id: string;
          next_available: string;
        }[];
      };
      reserve_paid_session: {
        Args: { p_post_id?: string; p_request_key: string; p_slot_id: string };
        Returns: {
          amount_paise: number;
          created_at: string;
          currency: string;
          ends_at: string;
          hold_expires_at: string | null;
          id: string;
          kind: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
          source_post_id: string | null;
          starts_at: string;
          status: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      save_mentor_profile: {
        Args: { p_bio: string; p_expertise: string[]; p_headline: string };
        Returns: undefined;
      };
      set_booking_meeting: {
        Args: { p_booking_id: string; p_join_url: string };
        Returns: undefined;
      };
      set_mentor_price: {
        Args: { p_amount_paise: number };
        Returns: undefined;
      };
      update_public_profile: {
        Args: {
          p_avatar_path: string;
          p_avatar_variant: number;
          p_bio: string;
          p_full_name: string;
          p_username: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
