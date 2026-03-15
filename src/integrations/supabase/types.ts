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
      car_likes: {
        Row: {
          car_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          car_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          car_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_likes_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
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
          estimated_price: number | null
          estimated_price_at: string | null
          finitions: string | null
          garage_group_id: string | null
          generation: string | null
          id: string
          image_url: string | null
          latitude: number | null
          license_plate: string | null
          linked_car_id: string | null
          location_name: string | null
          location_precision: string | null
          longitude: number | null
          model: string
          modified: boolean
          modified_comment: string | null
          parked: boolean
          photo_source: string | null
          quality_rating: number | null
          rarity_rating: number | null
          seen_on_road: boolean
          stock: boolean
          units_produced: number | null
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
          estimated_price?: number | null
          estimated_price_at?: string | null
          finitions?: string | null
          garage_group_id?: string | null
          generation?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          license_plate?: string | null
          linked_car_id?: string | null
          location_name?: string | null
          location_precision?: string | null
          longitude?: number | null
          model: string
          modified?: boolean
          modified_comment?: string | null
          parked?: boolean
          photo_source?: string | null
          quality_rating?: number | null
          rarity_rating?: number | null
          seen_on_road?: boolean
          stock?: boolean
          units_produced?: number | null
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
          estimated_price?: number | null
          estimated_price_at?: string | null
          finitions?: string | null
          garage_group_id?: string | null
          generation?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          license_plate?: string | null
          linked_car_id?: string | null
          location_name?: string | null
          location_precision?: string | null
          longitude?: number | null
          model?: string
          modified?: boolean
          modified_comment?: string | null
          parked?: boolean
          photo_source?: string | null
          quality_rating?: number | null
          rarity_rating?: number | null
          seen_on_road?: boolean
          stock?: boolean
          units_produced?: number | null
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
          {
            foreignKeyName: "cars_linked_car_id_fkey"
            columns: ["linked_car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_replies_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "channel_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_subscriptions: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_subscriptions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_topics: {
        Row: {
          body: string
          channel_id: string
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          channel_id: string
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          channel_id?: string
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_topics_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
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
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          receiver_id: string
          sender_id: string
          video_url: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
          video_url?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      dm_conversation_status: {
        Row: {
          created_at: string
          id: string
          other_user_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          other_user_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          other_user_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          feature: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          feature: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          feature?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
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
      game_cards: {
        Row: {
          adaptability: number
          archetype: string
          brand: string
          hp: number
          id: string
          image_url: string | null
          model: string
          name: string
          power: number
          rarity: string
          resilience: number
          speed: number
        }
        Insert: {
          adaptability: number
          archetype: string
          brand: string
          hp: number
          id?: string
          image_url?: string | null
          model: string
          name: string
          power: number
          rarity: string
          resilience: number
          speed: number
        }
        Update: {
          adaptability?: number
          archetype?: string
          brand?: string
          hp?: number
          id?: string
          image_url?: string | null
          model?: string
          name?: string
          power?: number
          rarity?: string
          resilience?: number
          speed?: number
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
      map_pois: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          invulnerable_until: string | null
          latitude: number
          longitude: number
          name: string
          owner_team: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          invulnerable_until?: string | null
          latitude: number
          longitude: number
          name: string
          owner_team?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          invulnerable_until?: string | null
          latitude?: number
          longitude?: number
          name?: string
          owner_team?: string | null
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
      page_views: {
        Row: {
          duration_ms: number | null
          entered_at: string
          id: string
          page: string
          user_id: string
        }
        Insert: {
          duration_ms?: number | null
          entered_at?: string
          id?: string
          page: string
          user_id: string
        }
        Update: {
          duration_ms?: number | null
          entered_at?: string
          id?: string
          page?: string
          user_id?: string
        }
        Relationships: []
      }
      poi_battle_cards: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          side: string
          stat_value: number
          team_color: string
          user_game_card_id: string
          user_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          side?: string
          stat_value?: number
          team_color: string
          user_game_card_id: string
          user_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          side?: string
          stat_value?: number
          team_color?: string
          user_game_card_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poi_battle_cards_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "poi_battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poi_battle_cards_user_game_card_id_fkey"
            columns: ["user_game_card_id"]
            isOneToOne: false
            referencedRelation: "user_game_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      poi_battles: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          phase: string
          poi_id: string
          resolved: boolean
          started_at: string
          winner_team: string | null
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          phase?: string
          poi_id: string
          resolved?: boolean
          started_at?: string
          winner_team?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          phase?: string
          poi_id?: string
          resolved?: boolean
          started_at?: string
          winner_team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poi_battles_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "map_pois"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coins: number
          created_at: string
          emblem_slot_1: string | null
          emblem_slot_2: string | null
          emblem_slot_3: string | null
          id: string
          is_map_marker: boolean
          is_premium: boolean
          is_temp: boolean
          language: string
          last_coin_sent_at: string | null
          last_delivery_at: string | null
          notify_channels: boolean
          notify_dms: boolean
          pinned_car_id: string | null
          premium_until: string | null
          role: string
          team_color: string | null
          temp_expires_at: string | null
          theme: string | null
          total_xp: number
          user_id: string
          username: string | null
          username_locked: boolean
        }
        Insert: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          emblem_slot_1?: string | null
          emblem_slot_2?: string | null
          emblem_slot_3?: string | null
          id?: string
          is_map_marker?: boolean
          is_premium?: boolean
          is_temp?: boolean
          language?: string
          last_coin_sent_at?: string | null
          last_delivery_at?: string | null
          notify_channels?: boolean
          notify_dms?: boolean
          pinned_car_id?: string | null
          premium_until?: string | null
          role?: string
          team_color?: string | null
          temp_expires_at?: string | null
          theme?: string | null
          total_xp?: number
          user_id: string
          username?: string | null
          username_locked?: boolean
        }
        Update: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          emblem_slot_1?: string | null
          emblem_slot_2?: string | null
          emblem_slot_3?: string | null
          id?: string
          is_map_marker?: boolean
          is_premium?: boolean
          is_temp?: boolean
          language?: string
          last_coin_sent_at?: string | null
          last_delivery_at?: string | null
          notify_channels?: boolean
          notify_dms?: boolean
          pinned_car_id?: string | null
          premium_until?: string | null
          role?: string
          team_color?: string | null
          temp_expires_at?: string | null
          theme?: string | null
          total_xp?: number
          user_id?: string
          username?: string | null
          username_locked?: boolean
        }
        Relationships: []
      }
      spotter_usage: {
        Row: {
          id: string
          usage_date: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          usage_date?: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          usage_date?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          body: string
          created_at: string
          id: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      temp_access: {
        Row: {
          access_code: string
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          access_code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          access_code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      user_booster_cooldown: {
        Row: {
          id: string
          last_opened_at: string
          next_available_at: string | null
          stored_count: number
          user_id: string
        }
        Insert: {
          id?: string
          last_opened_at?: string
          next_available_at?: string | null
          stored_count?: number
          user_id: string
        }
        Update: {
          id?: string
          last_opened_at?: string
          next_available_at?: string | null
          stored_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_deck: {
        Row: {
          card_ids: string[]
          deck_index: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_ids?: string[]
          deck_index?: number
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_ids?: string[]
          deck_index?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_game_cards: {
        Row: {
          card_id: string
          condition: string | null
          damaged_uses_remaining: number
          id: string
          obtained_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          condition?: string | null
          damaged_uses_remaining?: number
          id?: string
          obtained_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          condition?: string | null
          damaged_uses_remaining?: number
          id?: string
          obtained_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_game_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "game_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_owned_styles: {
        Row: {
          id: string
          obtained_at: string
          obtained_via: string
          style_id: string
          user_id: string
        }
        Insert: {
          id?: string
          obtained_at?: string
          obtained_via?: string
          style_id: string
          user_id: string
        }
        Update: {
          id?: string
          obtained_at?: string
          obtained_via?: string
          style_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_purchased_boosters: {
        Row: {
          id: string
          pending_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          pending_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          pending_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_xp_gains: {
        Row: {
          amount: number
          created_at: string
          id: string
          source: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          source?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          emblem_slot_1: string | null
          emblem_slot_2: string | null
          emblem_slot_3: string | null
          is_premium: boolean | null
          pinned_car_id: string | null
          role: string | null
          total_xp: number | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          emblem_slot_1?: string | null
          emblem_slot_2?: string | null
          emblem_slot_3?: string | null
          is_premium?: boolean | null
          pinned_car_id?: string | null
          role?: string | null
          total_xp?: number | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          emblem_slot_1?: string | null
          emblem_slot_2?: string | null
          emblem_slot_3?: string | null
          is_premium?: boolean | null
          pinned_car_id?: string | null
          role?: string | null
          total_xp?: number | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      achievement_xp_for_level: { Args: { p_level: number }; Returns: number }
      add_coins: { Args: { p_amount: number }; Returns: undefined }
      add_purchased_boosters: { Args: { pack_size: number }; Returns: Json }
      buy_premium_coins: { Args: { p_plan: string }; Returns: Json }
      claim_daily_boosters: { Args: never; Returns: Json }
      consume_daily_booster: { Args: never; Returns: Json }
      consume_purchased_booster: { Args: never; Returns: boolean }
      get_admin_role_counts: {
        Args: never
        Returns: {
          admin_count: number
          map_marker_count: number
          premium_count: number
        }[]
      }
      get_admin_stats: {
        Args: never
        Returns: {
          open_tickets: number
          total_deliveries: number
          total_dms: number
          total_messages: number
          total_miniatures: number
          total_spots: number
          total_tickets: number
          total_users: number
        }[]
      }
      get_autospotter_status: { Args: never; Returns: Json }
      get_leaderboard: {
        Args: never
        Returns: {
          avatar_url: string
          avg_quality: number
          avg_rarity: number
          car_count: number
          car_level: number
          total_estimated_price: number
          user_id: string
          username: string
        }[]
      }
      get_temp_login: {
        Args: { p_code: string }
        Returns: {
          email: string
        }[]
      }
      get_top_features: {
        Args: { p_limit?: number }
        Returns: {
          feature: string
          use_count: number
        }[]
      }
      get_top_pages: {
        Args: { p_limit?: number }
        Returns: {
          avg_duration_ms: number
          page: string
          visit_count: number
        }[]
      }
      get_users_for_admin: {
        Args: never
        Returns: {
          car_count: number
          created_at: string
          email: string
          is_map_marker: boolean
          is_premium: boolean
          role: string
          user_id: string
          username: string
        }[]
      }
      get_users_search: {
        Args: { p_query: string }
        Returns: {
          car_count: number
          created_at: string
          email: string
          is_map_marker: boolean
          is_premium: boolean
          role: string
          user_id: string
          username: string
        }[]
      }
      grant_coins_for_spot: {
        Args: { p_rarity_rating: number }
        Returns: undefined
      }
      increment_total_xp:
        | { Args: { amount?: number }; Returns: undefined }
        | { Args: { amount?: number; source?: string }; Returns: undefined }
      insert_booster_cards: {
        Args: { p_card_ids: string[]; p_conditions: string[] }
        Returns: Json
      }
      is_staff: { Args: { p_user_id: string }; Returns: boolean }
      normalize_license_plate: { Args: { plate: string }; Returns: string }
      process_booster_style_drop: { Args: never; Returns: Json }
      recompute_user_total_xp: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      repair_card: { Args: { p_user_game_card_id: string }; Returns: Json }
      resolve_poi_battle: { Args: { p_battle_id: string }; Returns: Json }
      send_coins_to_friend: {
        Args: { p_amount: number; p_to_user_id: string }
        Returns: Json
      }
      spotter_level_from_count: { Args: { p_count: number }; Returns: number }
      total_achievement_xp_for_spotter: {
        Args: { p_spot_count: number }
        Returns: number
      }
      unlock_style: {
        Args: { p_price: number; p_style_id: string }
        Returns: Json
      }
      update_friendship_status: {
        Args: { p_friendship_id: string; p_new_status: string }
        Returns: undefined
      }
      use_autospotter: { Args: never; Returns: Json }
      user_can_manage_pois: { Args: never; Returns: boolean }
      xp_for_car: {
        Args: {
          p_photo_source: string
          p_rarity_rating: number
          p_vehicle_type: string
        }
        Returns: number
      }
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
