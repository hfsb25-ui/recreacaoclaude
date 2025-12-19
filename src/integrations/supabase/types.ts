export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          age_group_id: string
          created_at: string
          description: string | null
          end_time: string
          id: string
          is_master: boolean
          name: string
          start_time: string
        }
        Insert: {
          activity_date: string
          age_group_id: string
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          is_master?: boolean
          name: string
          start_time: string
        }
        Update: {
          activity_date?: string
          age_group_id?: string
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          is_master?: boolean
          name?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_age_group_id_fkey"
            columns: ["age_group_id"]
            isOneToOne: false
            referencedRelation: "age_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_checkins: {
        Row: {
          activity_id: string
          checked_in_at: string | null
          guest_id: string
          id: string
          points_earned: number | null
        }
        Insert: {
          activity_id: string
          checked_in_at?: string | null
          guest_id: string
          id?: string
          points_earned?: number | null
        }
        Update: {
          activity_id?: string
          checked_in_at?: string | null
          guest_id?: string
          id?: string
          points_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_checkins_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_checkins_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_ratings: {
        Row: {
          activity_id: string
          comment: string | null
          created_at: string
          guest_name: string
          id: string
          rating: number
          room_number: string | null
        }
        Insert: {
          activity_id: string
          comment?: string | null
          created_at?: string
          guest_name: string
          id?: string
          rating: number
          room_number?: string | null
        }
        Update: {
          activity_id?: string
          comment?: string | null
          created_at?: string
          guest_name?: string
          id?: string
          rating?: number
          room_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_ratings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      age_groups: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          created_at: string | null
          current_level: number | null
          id: string
          name: string
          pin_code: string
          room_number: string
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_level?: number | null
          id?: string
          name: string
          pin_code: string
          room_number: string
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_level?: number | null
          id?: string
          name?: string
          pin_code?: string
          room_number?: string
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      levels: {
        Row: {
          badge_emoji: string
          created_at: string | null
          id: string
          level_number: number
          min_points: number
          name: string
        }
        Insert: {
          badge_emoji: string
          created_at?: string | null
          id?: string
          level_number: number
          min_points: number
          name: string
        }
        Update: {
          badge_emoji?: string
          created_at?: string | null
          id?: string
          level_number?: number
          min_points?: number
          name?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          guest_id: string
          id: string
          minutes_before: number | null
          notify_before_activity: boolean | null
          notify_new_activities: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          id?: string
          minutes_before?: number | null
          notify_before_activity?: boolean | null
          notify_new_activities?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          id?: string
          minutes_before?: number | null
          notify_before_activity?: boolean | null
          notify_new_activities?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: true
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          guest_id: string | null
          id: string
          p256dh: string
          updated_at: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          guest_id?: string | null
          id?: string
          p256dh: string
          updated_at?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          guest_id?: string | null
          id?: string
          p256dh?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          period_number: number
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          period_number: number
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          period_number?: number
          start_date?: string
        }
        Relationships: []
      }
      ranking_winners: {
        Row: {
          created_at: string | null
          final_position: number
          guest_id: string | null
          guest_name: string
          id: string
          prize_name: string
          ranking_period_id: string
          room_number: string
          total_checkins: number
          total_points: number
        }
        Insert: {
          created_at?: string | null
          final_position: number
          guest_id?: string | null
          guest_name: string
          id?: string
          prize_name: string
          ranking_period_id: string
          room_number: string
          total_checkins: number
          total_points: number
        }
        Update: {
          created_at?: string | null
          final_position?: number
          guest_id?: string | null
          guest_name?: string
          id?: string
          prize_name?: string
          ranking_period_id?: string
          room_number?: string
          total_checkins?: number
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "ranking_winners_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_winners_ranking_period_id_fkey"
            columns: ["ranking_period_id"]
            isOneToOne: false
            referencedRelation: "ranking_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      reset_config: {
        Row: {
          created_at: string | null
          id: string
          reset_day_1: number
          reset_day_2: number
          reset_time: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reset_day_1: number
          reset_day_2: number
          reset_time?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reset_day_1?: number
          reset_day_2?: number
          reset_time?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          footer_text: string | null
          id: string
          logo_url: string | null
          pdf_settings: Json | null
          site_name: string | null
          splash_animation_type: string | null
          splash_duration: number | null
          splash_gradient_from: string | null
          splash_gradient_to: string | null
          splash_gradient_via: string | null
          splash_icon: string | null
          splash_subtitle: string | null
          splash_title: string | null
          updated_at: string
          updated_by: string | null
          weather_city_name: string | null
          weather_latitude: number | null
          weather_longitude: number | null
        }
        Insert: {
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          pdf_settings?: Json | null
          site_name?: string | null
          splash_animation_type?: string | null
          splash_duration?: number | null
          splash_gradient_from?: string | null
          splash_gradient_to?: string | null
          splash_gradient_via?: string | null
          splash_icon?: string | null
          splash_subtitle?: string | null
          splash_title?: string | null
          updated_at?: string
          updated_by?: string | null
          weather_city_name?: string | null
          weather_latitude?: number | null
          weather_longitude?: number | null
        }
        Update: {
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          pdf_settings?: Json | null
          site_name?: string | null
          splash_animation_type?: string | null
          splash_duration?: number | null
          splash_gradient_from?: string | null
          splash_gradient_to?: string | null
          splash_gradient_via?: string | null
          splash_icon?: string | null
          splash_subtitle?: string | null
          splash_title?: string | null
          updated_at?: string
          updated_by?: string | null
          weather_city_name?: string | null
          weather_latitude?: number | null
          weather_longitude?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "gestor" | "recreador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["gestor", "recreador"],
    },
  },
} as const
