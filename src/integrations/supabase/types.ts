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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      car_photos: {
        Row: {
          car_id: string
          created_at: string
          id: string
          image_url: string
          position: number
        }
        Insert: {
          car_id: string
          created_at?: string
          id?: string
          image_url: string
          position?: number
        }
        Update: {
          car_id?: string
          created_at?: string
          id?: string
          image_url?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "car_photos_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          brand: string
          car_condition: string | null
          car_meet: boolean
          created_at: string
          delivered_by_user_id: string | null
          edition: string | null
          engine: string | null
          finitions: string | null
          garage_group_id: string | null
          id: string
          image_url: string | null
          latitude: number | null
          license_plate: string | null
          location_name: string | null
          location_precision: string | null
          longitude: number | null
          miniature_maker: string | null
          model: string
          modified: boolean
          modified_comment: string | null
          parked: boolean
          photo_source: string | null
          quality_rating: number | null
          rarity_rating: number | null
          seen_on_road: boolean
          stock: boolean
          user_id: string
          vehicle_type: string
          year: number
        }
        Insert: {
          brand: string
          car_condition?: string | null
          car_meet?: boolean
          created_at?: string
          delivered_by_user_id?: string | null
          edition?: string | null
          engine?: string | null
          finitions?: string | null
          garage_group_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          license_plate?: string | null
          location_name?: string | null
          location_precision?: string | null
          longitude?: number | null
          miniature_maker?: string | null
          model: string
          modified?: boolean
          modified_comment?: string | null
          parked?: boolean
          photo_source?: string | null
          quality_rating?: number | null
          rarity_rating?: number | null
          seen_on_road?: boolean
          stock?: boolean
          user_id: string
          vehicle_type?: string
          year: number
        }
        Update: {
          brand?: string
          car_condition?: string | null
          car_meet?: boolean
          created_at?: string
          delivered_by_user_id?: string | null
          edition?: string | null
          engine?: string | null
          finitions?: string | null
          garage_group_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          license_plate?: string | null
          location_name?: string | null
          location_precision?: string | null
          longitude?: number | null
          miniature_maker?: string | null
          model?: string
          modified?: boolean
          modified_comment?: string | null
          parked?: boolean
          photo_source?: string | null
          quality_rating?: number | null
          rarity_rating?: number | null
          seen_on_road?: boolean
          stock?: boolean
          user_id?: string
          vehicle_type?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cars_garage_group_id_fkey"
            columns: ["garage_group_id"]
            isOneToOne: false
            referencedRelation: "garage_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          car_id: string
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          car_id: string
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          car_id?: string
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_car"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: []
      }
      garage_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          id: string
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      owned_vehicles: {
        Row: {
          car_id: string | null
          created_at: string
          id: string
          license_plate: string
          user_id: string
        }
        Insert: {
          car_id?: string | null
          created_at?: string
          id?: string
          license_plate: string
          user_id: string
        }
        Update: {
          car_id?: string | null
          created_at?: string
          id?: string
          license_plate?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owned_vehicles_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          language: string
          last_delivery_at: string | null
          pinned_car_id: string | null
          theme: string | null
          user_id: string
          username: string | null
          username_locked: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          language?: string
          last_delivery_at?: string | null
          pinned_car_id?: string | null
          theme?: string | null
          user_id: string
          username?: string | null
          username_locked?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          language?: string
          last_delivery_at?: string | null
          pinned_car_id?: string | null
          theme?: string | null
          user_id?: string
          username?: string | null
          username_locked?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: never
        Returns: {
          avatar_url: string
          avg_quality: number
          avg_rarity: number
          car_count: number
          car_level: number
          user_id: string
          username: string
        }[]
      }
      normalize_license_plate: { Args: { plate: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
