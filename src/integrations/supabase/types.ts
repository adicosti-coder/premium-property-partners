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
      blog_articles: {
        Row: {
          author_name: string
          category: string
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          category?: string
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          article_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          guest_name: string | null
          id: string
          property_id: number
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          guest_name?: string | null
          id?: string
          property_id: number
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          guest_name?: string | null
          id?: string
          property_id?: number
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      complex_images: {
        Row: {
          complex_id: string
          created_at: string
          display_order: number
          id: string
          image_path: string
          is_primary: boolean
        }
        Insert: {
          complex_id: string
          created_at?: string
          display_order?: number
          id?: string
          image_path: string
          is_primary?: boolean
        }
        Update: {
          complex_id?: string
          created_at?: string
          display_order?: number
          id?: string
          image_path?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "complex_images_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "residential_complexes"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          property_id: string
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          property_id: string
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          property_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          calculated_net_profit: number | null
          calculated_yearly_profit: number | null
          created_at: string
          email: string | null
          follow_up_date: string | null
          id: string
          is_read: boolean
          message: string | null
          name: string
          property_area: number
          property_type: string
          simulation_data: Json | null
          source: string | null
          whatsapp_number: string
        }
        Insert: {
          calculated_net_profit?: number | null
          calculated_yearly_profit?: number | null
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          name: string
          property_area: number
          property_type: string
          simulation_data?: Json | null
          source?: string | null
          whatsapp_number: string
        }
        Update: {
          calculated_net_profit?: number | null
          calculated_yearly_profit?: number | null
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          name?: string
          property_area?: number
          property_type?: string
          simulation_data?: Json | null
          source?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      local_tips: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          tip_en: string
          tip_ro: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          tip_en: string
          tip_ro: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          tip_en?: string
          tip_ro?: string
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_records: {
        Row: {
          cost: number
          created_at: string
          date: string
          description: string | null
          id: string
          image_url: string | null
          invoice_url: string | null
          property_id: string
          title: string
          updated_at: string
        }
        Insert: {
          cost?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          invoice_url?: string | null
          property_id: string
          title: string
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          invoice_url?: string | null
          property_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      owner_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_used: boolean
          property_id: string
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          property_id: string
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          property_id?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_codes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          property_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date: string
          property_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          property_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_properties: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      points_of_interest: {
        Row: {
          address: string | null
          category: string
          created_at: string
          description: string | null
          description_en: string | null
          display_order: number
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          name_en: string
          phone: string | null
          rating: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category: string
          created_at?: string
          description?: string | null
          description_en?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          name_en: string
          phone?: string | null
          rating?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          description?: string | null
          description_en?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          name_en?: string
          phone?: string | null
          rating?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          notifications_enabled: boolean | null
          preferred_locations: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          notifications_enabled?: boolean | null
          preferred_locations?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          notifications_enabled?: boolean | null
          preferred_locations?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          booking_url: string
          created_at: string
          description_en: string
          description_ro: string
          display_order: number
          features: string[]
          id: string
          image_path: string | null
          is_active: boolean
          location: string
          name: string
          tag: string
          updated_at: string
        }
        Insert: {
          booking_url: string
          created_at?: string
          description_en: string
          description_ro: string
          display_order?: number
          features?: string[]
          id?: string
          image_path?: string | null
          is_active?: boolean
          location: string
          name: string
          tag: string
          updated_at?: string
        }
        Update: {
          booking_url?: string
          created_at?: string
          description_en?: string
          description_ro?: string
          display_order?: number
          features?: string[]
          id?: string
          image_path?: string | null
          is_active?: boolean
          location?: string
          name?: string
          tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      property_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_path: string
          is_primary: boolean
          property_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_path: string
          is_primary?: boolean
          property_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_path?: string
          is_primary?: boolean
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      residential_complexes: {
        Row: {
          created_at: string
          description_en: string
          description_ro: string
          display_order: number
          id: string
          is_active: boolean
          location: string
          name: string
          property_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en: string
          description_ro: string
          display_order?: number
          id?: string
          is_active?: boolean
          location: string
          name: string
          property_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string
          description_ro?: string
          display_order?: number
          id?: string
          is_active?: boolean
          location?: string
          name?: string
          property_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          hero_badge_en: string | null
          hero_badge_ro: string | null
          hero_cta_primary_en: string | null
          hero_cta_primary_ro: string | null
          hero_cta_secondary_en: string | null
          hero_cta_secondary_ro: string | null
          hero_highlight_en: string | null
          hero_highlight_ro: string | null
          hero_image_filename: string | null
          hero_image_url: string | null
          hero_subtitle_en: string | null
          hero_subtitle_ro: string | null
          hero_tags_en: string[] | null
          hero_tags_ro: string[] | null
          hero_title_en: string | null
          hero_title_ro: string | null
          hero_video_filename: string | null
          hero_video_url: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hero_badge_en?: string | null
          hero_badge_ro?: string | null
          hero_cta_primary_en?: string | null
          hero_cta_primary_ro?: string | null
          hero_cta_secondary_en?: string | null
          hero_cta_secondary_ro?: string | null
          hero_highlight_en?: string | null
          hero_highlight_ro?: string | null
          hero_image_filename?: string | null
          hero_image_url?: string | null
          hero_subtitle_en?: string | null
          hero_subtitle_ro?: string | null
          hero_tags_en?: string[] | null
          hero_tags_ro?: string[] | null
          hero_title_en?: string | null
          hero_title_ro?: string | null
          hero_video_filename?: string | null
          hero_video_url?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hero_badge_en?: string | null
          hero_badge_ro?: string | null
          hero_cta_primary_en?: string | null
          hero_cta_primary_ro?: string | null
          hero_cta_secondary_en?: string | null
          hero_cta_secondary_ro?: string | null
          hero_highlight_en?: string | null
          hero_highlight_ro?: string | null
          hero_image_filename?: string | null
          hero_image_url?: string | null
          hero_subtitle_en?: string | null
          hero_subtitle_ro?: string | null
          hero_tags_en?: string[] | null
          hero_tags_ro?: string[] | null
          hero_title_en?: string | null
          hero_title_ro?: string | null
          hero_video_filename?: string | null
          hero_video_url?: string | null
          id?: string
          updated_at?: string
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
      video_testimonials: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          location: string
          months_as_client: number
          name: string
          property_en: string
          property_ro: string
          quote_en: string
          quote_ro: string
          rating: number
          role_en: string
          role_ro: string
          updated_at: string
          youtube_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          location: string
          months_as_client?: number
          name: string
          property_en: string
          property_ro: string
          quote_en: string
          quote_ro: string
          rating?: number
          role_en: string
          role_ro: string
          updated_at?: string
          youtube_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          location?: string
          months_as_client?: number
          name?: string
          property_en?: string
          property_ro?: string
          quote_en?: string
          quote_ro?: string
          rating?: number
          role_en?: string
          role_ro?: string
          updated_at?: string
          youtube_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "owner"
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
      app_role: ["admin", "moderator", "user", "owner"],
    },
  },
} as const
