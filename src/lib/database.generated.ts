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
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
          starts_at: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ends_at: string;
          id?: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
          starts_at: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          learner_id?: string;
          mentor_id?: string;
          request_key?: string;
          slot_id?: string;
          starts_at?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
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
        ];
      };
      mentor_profiles: {
        Row: {
          bio: string;
          created_at: string;
          expertise: string[];
          headline: string;
          is_listed: boolean;
          user_id: string;
        };
        Insert: {
          bio?: string;
          created_at?: string;
          expertise?: string[];
          headline: string;
          is_listed?: boolean;
          user_id: string;
        };
        Update: {
          bio?: string;
          created_at?: string;
          expertise?: string[];
          headline?: string;
          is_listed?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          username: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id: string;
          username: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          username?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      book_free_intro: {
        Args: { p_request_key: string; p_slot_id: string };
        Returns: {
          created_at: string;
          ends_at: string;
          id: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
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
          created_at: string;
          ends_at: string;
          id: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
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
      complete_free_intro: {
        Args: { p_booking_id: string };
        Returns: {
          created_at: string;
          ends_at: string;
          id: string;
          learner_id: string;
          mentor_id: string;
          request_key: string;
          slot_id: string;
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
      save_mentor_profile: {
        Args: { p_bio: string; p_expertise: string[]; p_headline: string };
        Returns: undefined;
      };
      set_booking_meeting: {
        Args: { p_booking_id: string; p_join_url: string };
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
