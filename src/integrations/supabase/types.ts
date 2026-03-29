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
      admin_access_logs: {
        Row: {
          accessed_at: string
          action_type: string
          admin_user_id: string
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          action_type: string
          admin_user_id: string
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          action_type?: string
          admin_user_id?: string
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_alert_subscriptions: {
        Row: {
          alert_types: string[]
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          alert_types?: string[]
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          alert_types?: string[]
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      advanced_simulations: {
        Row: {
          average_stay_duration: number
          classic_rent: number
          cleaning_cost_per_stay: number
          created_at: string
          diff_vs_classic: number
          id: string
          management_fee: number
          monthly_fixed_costs: number
          net_with_system: number
          net_without_system: number
          nightly_rate: number
          occupancy_uplift: number
          occupancy_without_system: number
          payment_processing_fee: number
          percent_vs_classic: number
          platform_commission: number
          rate_uplift: number
          scenario: string
          user_id: string
        }
        Insert: {
          average_stay_duration?: number
          classic_rent?: number
          cleaning_cost_per_stay?: number
          created_at?: string
          diff_vs_classic?: number
          id?: string
          management_fee?: number
          monthly_fixed_costs?: number
          net_with_system?: number
          net_without_system?: number
          nightly_rate?: number
          occupancy_uplift?: number
          occupancy_without_system?: number
          payment_processing_fee?: number
          percent_vs_classic?: number
          platform_commission?: number
          rate_uplift?: number
          scenario?: string
          user_id: string
        }
        Update: {
          average_stay_duration?: number
          classic_rent?: number
          cleaning_cost_per_stay?: number
          created_at?: string
          diff_vs_classic?: number
          id?: string
          management_fee?: number
          monthly_fixed_costs?: number
          net_with_system?: number
          net_without_system?: number
          nightly_rate?: number
          occupancy_uplift?: number
          occupancy_without_system?: number
          payment_processing_fee?: number
          percent_vs_classic?: number
          platform_commission?: number
          rate_uplift?: number
          scenario?: string
          user_id?: string
        }
        Relationships: []
      }
      advisor_cache: {
        Row: {
          content: Json
          created_at: string
          id: string
          language: string
          property_slug: string
          updated_at: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          language?: string
          property_slug: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          language?: string
          property_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_votes: {
        Row: {
          created_at: string
          id: string
          submission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          submission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "user_article_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_article_views: {
        Row: {
          article_id: string
          id: string
          session_id: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          article_id: string
          id?: string
          session_id: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          article_id?: string
          id?: string
          session_id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_article_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_articles: {
        Row: {
          author_name: string
          category: string
          content: string
          content_en: string | null
          cover_image: string | null
          created_at: string
          excerpt: string
          excerpt_en: string | null
          id: string
          is_premium: boolean
          is_published: boolean
          published_at: string | null
          slug: string
          tags: string[]
          title: string
          title_en: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          author_name?: string
          category?: string
          content: string
          content_en?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt: string
          excerpt_en?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          published_at?: string | null
          slug: string
          tags?: string[]
          title: string
          title_en?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_name?: string
          category?: string
          content?: string
          content_en?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string
          excerpt_en?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          published_at?: string | null
          slug?: string
          tags?: string[]
          title?: string
          title_en?: string | null
          updated_at?: string
          view_count?: number
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
          ical_event_uid: string | null
          ical_source_id: string | null
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
          ical_event_uid?: string | null
          ical_source_id?: string | null
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
          ical_event_uid?: string | null
          ical_source_id?: string | null
          id?: string
          property_id?: number
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_ical_source_id_fkey"
            columns: ["ical_source_id"]
            isOneToOne: false
            referencedRelation: "ical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      captcha_logs: {
        Row: {
          created_at: string
          error_codes: string[] | null
          form_type: string
          hostname: string | null
          id: string
          ip_address: string | null
          score: number | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          error_codes?: string[] | null
          form_type: string
          hostname?: string | null
          id?: string
          ip_address?: string | null
          score?: number | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          error_codes?: string[] | null
          form_type?: string
          hostname?: string | null
          id?: string
          ip_address?: string | null
          score?: number | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          language: string | null
          last_activity_at: string
          lead_qualified: boolean | null
          lead_type: string | null
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          language?: string | null
          last_activity_at?: string
          lead_qualified?: boolean | null
          lead_type?: string | null
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          language?: string | null
          last_activity_at?: string
          lead_qualified?: boolean | null
          lead_type?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tokens_used: number | null
          tool_name: string | null
          tool_result: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tokens_used?: number | null
          tool_name?: string | null
          tool_result?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tokens_used?: number | null
          tool_name?: string | null
          tool_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_ratings: {
        Row: {
          conversation_id: string | null
          created_at: string
          feedback: string | null
          id: string
          rating: number
          session_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          rating: number
          session_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_ratings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_appointments: {
        Row: {
          appointment_type: string
          contact_email: string | null
          contact_name: string
          contact_phone: string
          conversation_id: string | null
          created_at: string
          id: string
          notes: string | null
          preferred_date: string | null
          preferred_time_slot: string | null
          property_interest: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          webhook_sent: boolean | null
        }
        Insert: {
          appointment_type: string
          contact_email?: string | null
          contact_name: string
          contact_phone: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time_slot?: string | null
          property_interest?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          webhook_sent?: boolean | null
        }
        Update: {
          appointment_type?: string
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time_slot?: string | null
          property_interest?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          webhook_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_appointments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      community_article_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          submission_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          submission_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          submission_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_article_comments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "user_article_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      community_badges: {
        Row: {
          code: string
          color: string
          created_at: string
          description_en: string
          description_ro: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name_en: string
          name_ro: string
          requirement_type: string
          requirement_value: number
          tier: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          description_en: string
          description_ro: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_ro: string
          requirement_type: string
          requirement_value?: number
          tier?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          description_en?: string
          description_ro?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_ro?: string
          requirement_type?: string
          requirement_value?: number
          tier?: string
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
      contest_periods: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          name: string
          prize_description: string
          start_date: string
          updated_at: string
          winner_announced_at: string | null
          winner_submission_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          prize_description?: string
          start_date: string
          updated_at?: string
          winner_announced_at?: string | null
          winner_submission_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          prize_description?: string
          start_date?: string
          updated_at?: string
          winner_announced_at?: string | null
          winner_submission_id?: string | null
        }
        Relationships: []
      }
      cta_analytics: {
        Row: {
          created_at: string
          cta_type: string
          id: string
          metadata: Json | null
          page_path: string
          property_id: string | null
          property_name: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          cta_type: string
          id?: string
          metadata?: Json | null
          page_path: string
          property_id?: string | null
          property_name?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          cta_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string
          property_id?: string | null
          property_name?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      discount_code_uses: {
        Row: {
          code_id: string
          discount_amount: number
          final_amount: number
          id: string
          nights: number
          original_amount: number
          property_name: string | null
          used_at: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          code_id: string
          discount_amount: number
          final_amount: number
          id?: string
          nights?: number
          original_amount: number
          property_name?: string | null
          used_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          code_id?: string
          discount_amount?: number
          final_amount?: number
          id?: string
          nights?: number
          original_amount?: number
          property_name?: string | null
          used_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_booking_nights: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_booking_nights?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_booking_nights?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      email_ab_assignments: {
        Row: {
          created_at: string
          id: string
          subject_used: string
          test_id: string
          user_id: string
          variant: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_used: string
          test_id: string
          user_id: string
          variant: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_used?: string
          test_id?: string
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_ab_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "email_ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ab_tests: {
        Row: {
          created_at: string
          email_type: string
          id: string
          is_active: boolean
          updated_at: string
          variant_a_subject: string
          variant_b_subject: string
        }
        Insert: {
          created_at?: string
          email_type: string
          id?: string
          is_active?: boolean
          updated_at?: string
          variant_a_subject: string
          variant_b_subject: string
        }
        Update: {
          created_at?: string
          email_type?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          variant_a_subject?: string
          variant_b_subject?: string
        }
        Relationships: []
      }
      email_campaign_sends: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string
          status: string
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          id?: string
          opened_at?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          campaign_type: string
          click_count: number | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          open_count: number | null
          recipient_filter: Json | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          campaign_type?: string
          click_count?: number | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          open_count?: number | null
          recipient_filter?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          click_count?: number | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          open_count?: number | null
          recipient_filter?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_click_tracking: {
        Row: {
          clicked_at: string
          email_type: string
          id: string
          ip_address: string | null
          link_type: string
          user_agent: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          clicked_at?: string
          email_type: string
          id?: string
          ip_address?: string | null
          link_type: string
          user_agent?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          clicked_at?: string
          email_type?: string
          id?: string
          ip_address?: string | null
          link_type?: string
          user_agent?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      email_open_tracking: {
        Row: {
          ab_assignment_id: string | null
          email_type: string
          followup_email_id: string | null
          id: string
          ip_address: string | null
          opened_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          ab_assignment_id?: string | null
          email_type: string
          followup_email_id?: string | null
          id?: string
          ip_address?: string | null
          opened_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          ab_assignment_id?: string | null
          email_type?: string
          followup_email_id?: string | null
          id?: string
          ip_address?: string | null
          opened_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_open_tracking_ab_assignment_id_fkey"
            columns: ["ab_assignment_id"]
            isOneToOne: false
            referencedRelation: "email_ab_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_open_tracking_followup_email_id_fkey"
            columns: ["followup_email_id"]
            isOneToOne: false
            referencedRelation: "simulation_followup_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
      guest_guides: {
        Row: {
          access_instructions: string | null
          access_video_url: string | null
          additional_notes: string | null
          booking_id: string
          check_in_date: string
          check_in_time: string | null
          check_out_date: string
          check_out_time: string | null
          created_at: string | null
          id: string
          parking_gps_lat: number | null
          parking_gps_lng: number | null
          parking_instructions: string | null
          pin_code: string | null
          property_image: string | null
          property_name: string
          updated_at: string | null
          whatsapp_number: string | null
          wifi_name: string | null
          wifi_password: string | null
        }
        Insert: {
          access_instructions?: string | null
          access_video_url?: string | null
          additional_notes?: string | null
          booking_id: string
          check_in_date: string
          check_in_time?: string | null
          check_out_date: string
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          parking_gps_lat?: number | null
          parking_gps_lng?: number | null
          parking_instructions?: string | null
          pin_code?: string | null
          property_image?: string | null
          property_name: string
          updated_at?: string | null
          whatsapp_number?: string | null
          wifi_name?: string | null
          wifi_password?: string | null
        }
        Update: {
          access_instructions?: string | null
          access_video_url?: string | null
          additional_notes?: string | null
          booking_id?: string
          check_in_date?: string
          check_in_time?: string | null
          check_out_date?: string
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          parking_gps_lat?: number | null
          parking_gps_lng?: number | null
          parking_instructions?: string | null
          pin_code?: string | null
          property_image?: string | null
          property_name?: string
          updated_at?: string | null
          whatsapp_number?: string | null
          wifi_name?: string | null
          wifi_password?: string | null
        }
        Relationships: []
      }
      ical_sources: {
        Row: {
          created_at: string
          events_count: number | null
          ical_url: string
          id: string
          is_active: boolean
          label: string
          last_sync_error: string | null
          last_synced_at: string | null
          property_id: string
          pynbooking_room: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          events_count?: number | null
          ical_url: string
          id?: string
          is_active?: boolean
          label?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          property_id: string
          pynbooking_room?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          events_count?: number | null
          ical_url?: string
          id?: string
          is_active?: boolean
          label?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          property_id?: string
          pynbooking_room?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_sources_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_sync_logs: {
        Row: {
          created_at: string
          deleted_bookings: number
          duration_ms: number | null
          error_message: string | null
          events_found: number
          id: string
          new_bookings: number
          property_id: string | null
          source_id: string | null
          sync_type: string
          updated_bookings: number
        }
        Insert: {
          created_at?: string
          deleted_bookings?: number
          duration_ms?: number | null
          error_message?: string | null
          events_found?: number
          id?: string
          new_bookings?: number
          property_id?: string | null
          source_id?: string | null
          sync_type?: string
          updated_bookings?: number
        }
        Update: {
          created_at?: string
          deleted_bookings?: number
          duration_ms?: number | null
          error_message?: string | null
          events_found?: number
          id?: string
          new_bookings?: number
          property_id?: string | null
          source_id?: string | null
          sync_type?: string
          updated_bookings?: number
        }
        Relationships: [
          {
            foreignKeyName: "ical_sync_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ical_sync_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      image_caption_cache: {
        Row: {
          caption: string
          created_at: string | null
          id: string
          image_url: string
          language: string
          property_name: string
          updated_at: string | null
        }
        Insert: {
          caption: string
          created_at?: string | null
          id?: string
          image_url: string
          language?: string
          property_name: string
          updated_at?: string | null
        }
        Update: {
          caption?: string
          created_at?: string | null
          id?: string
          image_url?: string
          language?: string
          property_name?: string
          updated_at?: string | null
        }
        Relationships: []
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
          image_url: string | null
          is_active: boolean
          tip_en: string
          tip_ro: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          tip_en: string
          tip_ro: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
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
      poi_favorites: {
        Row: {
          created_at: string
          id: string
          poi_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poi_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poi_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poi_favorites_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "points_of_interest"
            referencedColumns: ["id"]
          },
        ]
      }
      poi_import_events: {
        Row: {
          created_at: string
          id: string
          imported_by: string | null
          imported_count: number
          shared_link_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imported_by?: string | null
          imported_count?: number
          shared_link_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imported_by?: string | null
          imported_count?: number
          shared_link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poi_import_events_shared_link_id_fkey"
            columns: ["shared_link_id"]
            isOneToOne: false
            referencedRelation: "shared_poi_links"
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
          image_fetch_attempted_at: string | null
          image_fetch_failed: boolean
          image_source: string | null
          image_url: string | null
          is_active: boolean
          is_premium: boolean
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
          image_fetch_attempted_at?: string | null
          image_fetch_failed?: boolean
          image_source?: string | null
          image_url?: string | null
          is_active?: boolean
          is_premium?: boolean
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
          image_fetch_attempted_at?: string | null
          image_fetch_failed?: boolean
          image_source?: string | null
          image_url?: string | null
          is_active?: boolean
          is_premium?: boolean
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
          email: string | null
          full_name: string | null
          id: string
          notifications_enabled: boolean | null
          preferred_locations: string[] | null
          share_email_on_import: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          notifications_enabled?: boolean | null
          preferred_locations?: string[] | null
          share_email_on_import?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notifications_enabled?: boolean | null
          preferred_locations?: string[] | null
          share_email_on_import?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          amenities: string[] | null
          amenities_en: string[] | null
          annual_tax: number | null
          apartments_in_building: number | null
          balconies: number | null
          base_price_per_night: number | null
          bathrooms: number | null
          bedrooms: number | null
          booking_rating: number | null
          booking_review_count: number | null
          booking_url: string
          built_area: number | null
          capacity: number | null
          capital_necesar: number | null
          check_in_time: string | null
          check_out_time: string | null
          compartimentare: string | null
          construction_type: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description_en: string
          description_ro: string
          display_order: number
          energy_class: string | null
          estimated_revenue: string | null
          features: string[]
          floor: string | null
          furnished: string | null
          has_ac: boolean | null
          has_cellar: boolean | null
          has_elevator: boolean | null
          has_storage: boolean | null
          heating_type: string | null
          house_rules: string[] | null
          house_rules_en: string[] | null
          id: string
          image_path: string | null
          images: string[] | null
          intercom_type: string | null
          is_active: boolean
          land_area: number | null
          latitude: number | null
          listing_type: string | null
          location: string
          long_description_en: string | null
          long_description_ro: string | null
          longitude: number | null
          monthly_maintenance: number | null
          name: string
          orientation: string | null
          parking: string | null
          price_per_sqm: number | null
          property_code: string | null
          property_condition: string | null
          renovation_year: number | null
          roi_percentage: string | null
          size: number | null
          slug: string | null
          source_platform: string | null
          source_url: string | null
          status_operativ: string | null
          tag: string
          terrace_area: number | null
          total_building_floors: number | null
          updated_at: string
          usable_area: number | null
          view_type: string | null
          weekend_price_per_night: number | null
          year_built: number | null
        }
        Insert: {
          amenities?: string[] | null
          amenities_en?: string[] | null
          annual_tax?: number | null
          apartments_in_building?: number | null
          balconies?: number | null
          base_price_per_night?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          booking_rating?: number | null
          booking_review_count?: number | null
          booking_url: string
          built_area?: number | null
          capacity?: number | null
          capital_necesar?: number | null
          check_in_time?: string | null
          check_out_time?: string | null
          compartimentare?: string | null
          construction_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description_en: string
          description_ro: string
          display_order?: number
          energy_class?: string | null
          estimated_revenue?: string | null
          features?: string[]
          floor?: string | null
          furnished?: string | null
          has_ac?: boolean | null
          has_cellar?: boolean | null
          has_elevator?: boolean | null
          has_storage?: boolean | null
          heating_type?: string | null
          house_rules?: string[] | null
          house_rules_en?: string[] | null
          id?: string
          image_path?: string | null
          images?: string[] | null
          intercom_type?: string | null
          is_active?: boolean
          land_area?: number | null
          latitude?: number | null
          listing_type?: string | null
          location: string
          long_description_en?: string | null
          long_description_ro?: string | null
          longitude?: number | null
          monthly_maintenance?: number | null
          name: string
          orientation?: string | null
          parking?: string | null
          price_per_sqm?: number | null
          property_code?: string | null
          property_condition?: string | null
          renovation_year?: number | null
          roi_percentage?: string | null
          size?: number | null
          slug?: string | null
          source_platform?: string | null
          source_url?: string | null
          status_operativ?: string | null
          tag: string
          terrace_area?: number | null
          total_building_floors?: number | null
          updated_at?: string
          usable_area?: number | null
          view_type?: string | null
          weekend_price_per_night?: number | null
          year_built?: number | null
        }
        Update: {
          amenities?: string[] | null
          amenities_en?: string[] | null
          annual_tax?: number | null
          apartments_in_building?: number | null
          balconies?: number | null
          base_price_per_night?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          booking_rating?: number | null
          booking_review_count?: number | null
          booking_url?: string
          built_area?: number | null
          capacity?: number | null
          capital_necesar?: number | null
          check_in_time?: string | null
          check_out_time?: string | null
          compartimentare?: string | null
          construction_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description_en?: string
          description_ro?: string
          display_order?: number
          energy_class?: string | null
          estimated_revenue?: string | null
          features?: string[]
          floor?: string | null
          furnished?: string | null
          has_ac?: boolean | null
          has_cellar?: boolean | null
          has_elevator?: boolean | null
          has_storage?: boolean | null
          heating_type?: string | null
          house_rules?: string[] | null
          house_rules_en?: string[] | null
          id?: string
          image_path?: string | null
          images?: string[] | null
          intercom_type?: string | null
          is_active?: boolean
          land_area?: number | null
          latitude?: number | null
          listing_type?: string | null
          location?: string
          long_description_en?: string | null
          long_description_ro?: string | null
          longitude?: number | null
          monthly_maintenance?: number | null
          name?: string
          orientation?: string | null
          parking?: string | null
          price_per_sqm?: number | null
          property_code?: string | null
          property_condition?: string | null
          renovation_year?: number | null
          roi_percentage?: string | null
          size?: number | null
          slug?: string | null
          source_platform?: string | null
          source_url?: string | null
          status_operativ?: string | null
          tag?: string
          terrace_area?: number | null
          total_building_floors?: number | null
          updated_at?: string
          usable_area?: number | null
          view_type?: string | null
          weekend_price_per_night?: number | null
          year_built?: number | null
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
          is_published: boolean
          original_url: string | null
          property_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_path: string
          is_primary?: boolean
          is_published?: boolean
          original_url?: string | null
          property_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_path?: string
          is_primary?: boolean
          is_published?: boolean
          original_url?: string | null
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
      property_live_data: {
        Row: {
          booking_com_url: string | null
          booking_url: string | null
          created_at: string
          id: string
          last_price_update: string | null
          last_rating_update: string | null
          price_per_night: number | null
          property_slug: string
          rating: number | null
          reviews_count: number | null
          scrape_error: string | null
          updated_at: string
        }
        Insert: {
          booking_com_url?: string | null
          booking_url?: string | null
          created_at?: string
          id?: string
          last_price_update?: string | null
          last_rating_update?: string | null
          price_per_night?: number | null
          property_slug: string
          rating?: number | null
          reviews_count?: number | null
          scrape_error?: string | null
          updated_at?: string
        }
        Update: {
          booking_com_url?: string | null
          booking_url?: string | null
          created_at?: string
          id?: string
          last_price_update?: string | null
          last_rating_update?: string | null
          price_per_night?: number | null
          property_slug?: string
          rating?: number | null
          reviews_count?: number | null
          scrape_error?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      property_pricing: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          label: string
          price_per_night: number
          property_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          label: string
          price_per_night: number
          property_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          label?: string
          price_per_night?: number
          property_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_pricing_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_reviews: {
        Row: {
          admin_reply: string | null
          admin_reply_at: string | null
          admin_reply_by: string | null
          booking_id: string | null
          booking_review_id: string | null
          content: string | null
          created_at: string
          guest_country: string | null
          guest_email: string | null
          guest_name: string
          id: string
          is_published: boolean
          property_id: string
          rating: number
          review_date: string | null
          source: string
          title: string | null
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          admin_reply_by?: string | null
          booking_id?: string | null
          booking_review_id?: string | null
          content?: string | null
          created_at?: string
          guest_country?: string | null
          guest_email?: string | null
          guest_name: string
          id?: string
          is_published?: boolean
          property_id: string
          rating: number
          review_date?: string | null
          source?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          admin_reply_by?: string | null
          booking_id?: string | null
          booking_review_id?: string | null
          content?: string | null
          created_at?: string
          guest_country?: string | null
          guest_email?: string | null
          guest_name?: string
          id?: string
          is_published?: boolean
          property_id?: string
          rating?: number
          review_date?: string | null
          source?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_views: {
        Row: {
          id: string
          page_path: string | null
          property_id: string
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          page_path?: string | null
          property_id: string
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          page_path?: string | null
          property_id?: string
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_listings: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          features: string[] | null
          floor: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          last_seen_at: string | null
          location: string | null
          price: number | null
          price_per_sqm: number | null
          prospect_type: string
          rating: number | null
          review_count: number | null
          rooms: number | null
          score: number | null
          score_breakdown: Json | null
          scraped_at: string | null
          size: number | null
          source_platform: string
          source_url: string
          status: string | null
          tags: string[]
          title: string | null
          updated_at: string | null
          year_built: number | null
          zone: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: string[] | null
          floor?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          last_seen_at?: string | null
          location?: string | null
          price?: number | null
          price_per_sqm?: number | null
          prospect_type?: string
          rating?: number | null
          review_count?: number | null
          rooms?: number | null
          score?: number | null
          score_breakdown?: Json | null
          scraped_at?: string | null
          size?: number | null
          source_platform: string
          source_url: string
          status?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string | null
          year_built?: number | null
          zone?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: string[] | null
          floor?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          last_seen_at?: string | null
          location?: string | null
          price?: number | null
          price_per_sqm?: number | null
          prospect_type?: string
          rating?: number | null
          review_count?: number | null
          rooms?: number | null
          score?: number | null
          score_breakdown?: Json | null
          scraped_at?: string | null
          size?: number | null
          source_platform?: string
          source_url?: string
          status?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string | null
          year_built?: number | null
          zone?: string | null
        }
        Relationships: []
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
      referrals: {
        Row: {
          admin_notes: string | null
          contacted_at: string | null
          contract_signed_at: string | null
          created_at: string
          id: string
          meeting_date: string | null
          owner_email: string
          owner_message: string | null
          owner_name: string
          owner_phone: string
          property_location: string | null
          property_rooms: number | null
          property_type: string | null
          referrer_email: string
          referrer_name: string
          referrer_phone: string | null
          referrer_user_id: string | null
          reward_check_in: string | null
          reward_check_out: string | null
          reward_granted_at: string | null
          reward_property_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          contacted_at?: string | null
          contract_signed_at?: string | null
          created_at?: string
          id?: string
          meeting_date?: string | null
          owner_email: string
          owner_message?: string | null
          owner_name: string
          owner_phone: string
          property_location?: string | null
          property_rooms?: number | null
          property_type?: string | null
          referrer_email: string
          referrer_name: string
          referrer_phone?: string | null
          referrer_user_id?: string | null
          reward_check_in?: string | null
          reward_check_out?: string | null
          reward_granted_at?: string | null
          reward_property_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          contacted_at?: string | null
          contract_signed_at?: string | null
          created_at?: string
          id?: string
          meeting_date?: string | null
          owner_email?: string
          owner_message?: string | null
          owner_name?: string
          owner_phone?: string
          property_location?: string | null
          property_rooms?: number | null
          property_type?: string | null
          referrer_email?: string
          referrer_name?: string
          referrer_phone?: string | null
          referrer_user_id?: string | null
          reward_check_in?: string | null
          reward_check_out?: string | null
          reward_granted_at?: string | null
          reward_property_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_reward_property_id_fkey"
            columns: ["reward_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      residential_complexes: {
        Row: {
          created_at: string
          description_en: string
          description_ro: string
          display_order: number
          features: string[] | null
          features_en: string[] | null
          id: string
          is_active: boolean
          latitude: number | null
          location: string
          longitude: number | null
          meta_description_en: string | null
          meta_description_ro: string | null
          meta_title_en: string | null
          meta_title_ro: string | null
          name: string
          neighborhood: string | null
          property_count: number
          seo_keywords: string[] | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en: string
          description_ro: string
          display_order?: number
          features?: string[] | null
          features_en?: string[] | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          location: string
          longitude?: number | null
          meta_description_en?: string | null
          meta_description_ro?: string | null
          meta_title_en?: string | null
          meta_title_ro?: string | null
          name: string
          neighborhood?: string | null
          property_count?: number
          seo_keywords?: string[] | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string
          description_ro?: string
          display_order?: number
          features?: string[] | null
          features_en?: string[] | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          meta_description_en?: string | null
          meta_description_ro?: string | null
          meta_title_en?: string | null
          meta_title_ro?: string | null
          name?: string
          neighborhood?: string | null
          property_count?: number
          seo_keywords?: string[] | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rewrite_cache: {
        Row: {
          created_at: string | null
          id: string
          language: string
          listing_type: string
          property_title: string
          rewritten_full: string | null
          rewritten_short: string | null
          rewritten_title: string | null
          tone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          language?: string
          listing_type?: string
          property_title: string
          rewritten_full?: string | null
          rewritten_short?: string | null
          rewritten_title?: string | null
          tone?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string
          listing_type?: string
          property_title?: string
          rewritten_full?: string | null
          rewritten_short?: string | null
          rewritten_title?: string | null
          tone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scraper_lead_status_history: {
        Row: {
          changed_at: string
          id: string
          lead_id: string
          new_status: string
          old_status: string | null
        }
        Insert: {
          changed_at?: string
          id?: string
          lead_id: string
          new_status: string
          old_status?: string | null
        }
        Update: {
          changed_at?: string
          id?: string
          lead_id?: string
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraper_lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "scraper_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_leads: {
        Row: {
          admin_notes: string | null
          created_at: string
          extra_profit_3y: number
          id: string
          lead_score: number
          listing_type: string
          monthly_extra: number
          original_price: number
          source: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          url: string
          whatsapp_message: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          extra_profit_3y?: number
          id?: string
          lead_score?: number
          listing_type?: string
          monthly_extra?: number
          original_price?: number
          source?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          url: string
          whatsapp_message?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          extra_profit_3y?: number
          id?: string
          lead_score?: number
          listing_type?: string
          monthly_extra?: number
          original_price?: number
          source?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          url?: string
          whatsapp_message?: string | null
        }
        Relationships: []
      }
      shared_poi_links: {
        Row: {
          created_at: string
          description: string | null
          id: string
          import_count: number
          last_imported_at: string | null
          name: string | null
          poi_ids: string[]
          share_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          import_count?: number
          last_imported_at?: string | null
          name?: string | null
          poi_ids: string[]
          share_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          import_count?: number
          last_imported_at?: string | null
          name?: string | null
          poi_ids?: string[]
          share_code?: string
          user_id?: string
        }
        Relationships: []
      }
      simulation_followup_emails: {
        Row: {
          created_at: string
          email_type: string
          id: string
          sent_at: string
          simulation_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email_type?: string
          id?: string
          sent_at?: string
          simulation_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email_type?: string
          id?: string
          sent_at?: string
          simulation_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_followup_emails_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "user_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          conversion_alert_enabled: boolean | null
          conversion_rate_threshold: number | null
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
          last_conversion_alert_at: string | null
          last_spam_alert_at: string | null
          spam_alert_enabled: boolean | null
          spam_rate_threshold: number | null
          updated_at: string
          weekly_report_enabled: boolean | null
          weekly_report_recipients: string[] | null
        }
        Insert: {
          conversion_alert_enabled?: boolean | null
          conversion_rate_threshold?: number | null
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
          last_conversion_alert_at?: string | null
          last_spam_alert_at?: string | null
          spam_alert_enabled?: boolean | null
          spam_rate_threshold?: number | null
          updated_at?: string
          weekly_report_enabled?: boolean | null
          weekly_report_recipients?: string[] | null
        }
        Update: {
          conversion_alert_enabled?: boolean | null
          conversion_rate_threshold?: number | null
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
          last_conversion_alert_at?: string | null
          last_spam_alert_at?: string | null
          spam_alert_enabled?: boolean | null
          spam_rate_threshold?: number | null
          updated_at?: string
          weekly_report_enabled?: boolean | null
          weekly_report_recipients?: string[] | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      translation_cache: {
        Row: {
          created_at: string | null
          id: string
          source_lang: string
          source_text_hash: string
          target_lang: string
          translated: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_lang?: string
          source_text_hash: string
          target_lang?: string
          translated: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          source_lang?: string
          source_text_hash?: string
          target_lang?: string
          translated?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_article_submissions: {
        Row: {
          admin_feedback: string | null
          content: string
          contest_period_id: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          vote_count: number
        }
        Insert: {
          admin_feedback?: string | null
          content: string
          contest_period_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          vote_count?: number
        }
        Update: {
          admin_feedback?: string | null
          content?: string
          contest_period_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_article_submissions_contest_period_id_fkey"
            columns: ["contest_period_id"]
            isOneToOne: false
            referencedRelation: "contest_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "community_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
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
      user_simulations: {
        Row: {
          city: string
          created_at: string
          id: string
          location: string
          monthly_income: number
          property_area: number | null
          realtrurst_income: number
          realtrust_yearly: number
          rooms: string
          user_id: string
          yearly_income: number
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          location: string
          monthly_income: number
          property_area?: number | null
          realtrurst_income: number
          realtrust_yearly: number
          rooms: string
          user_id: string
          yearly_income: number
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          location?: string
          monthly_income?: number
          property_area?: number | null
          realtrurst_income?: number
          realtrust_yearly?: number
          rooms?: string
          user_id?: string
          yearly_income?: number
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
      booking_availability: {
        Row: {
          check_in: string | null
          check_out: string | null
          id: string | null
          property_id: number | null
          status: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          id?: string | null
          property_id?: number | null
          status?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          id?: string | null
          property_id?: number | null
          status?: string | null
        }
        Relationships: []
      }
      public_site_settings: {
        Row: {
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
          id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      anonymize_ip_address: { Args: { ip_address: string }; Returns: string }
      check_and_award_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_cta_rate_limit: { Args: { p_session_id: string }; Returns: boolean }
      cleanup_old_tracking_data: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_public_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          id: string
        }[]
      }
      get_shared_poi_link: {
        Args: { p_share_code: string }
        Returns: {
          created_at: string
          description: string | null
          id: string
          import_count: number
          last_imported_at: string | null
          name: string | null
          poi_ids: string[]
          share_code: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "shared_poi_links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      validate_chat_session: {
        Args: { p_session_id: string }
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
