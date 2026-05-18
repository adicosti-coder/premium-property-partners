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
      admin_audit_log: {
        Row: {
          action: string
          actor_label: string | null
          actor_user_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          severity: string
        }
        Insert: {
          action: string
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          severity?: string
        }
        Update: {
          action?: string
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          severity?: string
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
      agency_blocklist: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          notes: string | null
          phone_normalized: string | null
          reason: string
          source_prospect_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          notes?: string | null
          phone_normalized?: string | null
          reason?: string
          source_prospect_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          notes?: string | null
          phone_normalized?: string | null
          reason?: string
          source_prospect_id?: string | null
        }
        Relationships: []
      }
      agency_detection_settings: {
        Row: {
          enabled: boolean
          id: boolean
          multi_listing_threshold: number
          multi_listing_window_days: number
          suspicion_threshold: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: boolean
          multi_listing_threshold?: number
          multi_listing_window_days?: number
          suspicion_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: boolean
          multi_listing_threshold?: number
          multi_listing_window_days?: number
          suspicion_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      agency_keywords: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          keyword: string
          notes: string | null
          type: Database["public"]["Enums"]["agency_keyword_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          keyword: string
          notes?: string | null
          type: Database["public"]["Enums"]["agency_keyword_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          keyword?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["agency_keyword_type"]
        }
        Relationships: []
      }
      agency_whitelist: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          notes: string | null
          phone_normalized: string | null
          reason: string
          source_prospect_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          notes?: string | null
          phone_normalized?: string | null
          reason?: string
          source_prospect_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          notes?: string | null
          phone_normalized?: string | null
          reason?: string
          source_prospect_id?: string | null
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
      automation_anomalies: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          baseline: number | null
          context: Json
          created_at: string
          delta_pct: number | null
          id: string
          metric: string
          notified: boolean
          observed: number | null
          severity: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          baseline?: number | null
          context?: Json
          created_at?: string
          delta_pct?: number | null
          id?: string
          metric: string
          notified?: boolean
          observed?: number | null
          severity?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          baseline?: number | null
          context?: Json
          created_at?: string
          delta_pct?: number | null
          id?: string
          metric?: string
          notified?: boolean
          observed?: number | null
          severity?: string
        }
        Relationships: []
      }
      automation_approvals: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          evidence: Json
          expires_at: string
          id: string
          job_key: string
          proposal: Json
          rejected_reason: string | null
          severity: string
          status: string
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          evidence?: Json
          expires_at?: string
          id?: string
          job_key: string
          proposal?: Json
          rejected_reason?: string | null
          severity?: string
          status?: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          evidence?: Json
          expires_at?: string
          id?: string
          job_key?: string
          proposal?: Json
          rejected_reason?: string | null
          severity?: string
          status?: string
        }
        Relationships: []
      }
      automation_jobs: {
        Row: {
          category: string
          config: Json
          consecutive_failures: number
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          job_key: string
          label: string
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          schedule: string | null
          total_runs: number
          total_successes: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          category: string
          config?: Json
          consecutive_failures?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          job_key: string
          label: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          schedule?: string | null
          total_runs?: number
          total_successes?: number
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          config?: Json
          consecutive_failures?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          job_key?: string
          label?: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          schedule?: string | null
          total_runs?: number
          total_successes?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          job_key: string
          output_summary: Json
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job_key: string
          output_summary?: Json
          started_at?: string
          status: string
          triggered_by?: string | null
        }
        Update: {
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job_key?: string
          output_summary?: Json
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_job_key_fkey"
            columns: ["job_key"]
            isOneToOne: false
            referencedRelation: "automation_jobs"
            referencedColumns: ["job_key"]
          },
        ]
      }
      automation_settings: {
        Row: {
          enabled: boolean
          id: boolean
          paused_reason: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: boolean
          paused_reason?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: boolean
          paused_reason?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          geo_location: string | null
          id: string
          is_premium: boolean
          is_published: boolean
          main_image_url: string | null
          meta_description: string | null
          meta_title: string | null
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
          geo_location?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          main_image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
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
          geo_location?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          main_image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
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
      communication_logs: {
        Row: {
          autopilot_run_id: string | null
          channel: string
          created_at: string
          direction: string
          duration_seconds: number | null
          from_number: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          outcome: string | null
          prospect_listing_id: string | null
          scraper_lead_id: string | null
          source: string
          status: string | null
          to_number: string | null
          voice_session_id: string | null
        }
        Insert: {
          autopilot_run_id?: string | null
          channel?: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          from_number?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          outcome?: string | null
          prospect_listing_id?: string | null
          scraper_lead_id?: string | null
          source?: string
          status?: string | null
          to_number?: string | null
          voice_session_id?: string | null
        }
        Update: {
          autopilot_run_id?: string | null
          channel?: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          from_number?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          outcome?: string | null
          prospect_listing_id?: string | null
          scraper_lead_id?: string | null
          source?: string
          status?: string | null
          to_number?: string | null
          voice_session_id?: string | null
        }
        Relationships: []
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
      cron_job_registry: {
        Row: {
          description: string | null
          expected_interval_minutes: number
          grace_minutes: number
          is_active: boolean
          job_name: string
          last_alert_at: string | null
        }
        Insert: {
          description?: string | null
          expected_interval_minutes: number
          grace_minutes?: number
          is_active?: boolean
          job_name: string
          last_alert_at?: string | null
        }
        Update: {
          description?: string | null
          expected_interval_minutes?: number
          grace_minutes?: number
          is_active?: boolean
          job_name?: string
          last_alert_at?: string | null
        }
        Relationships: []
      }
      cron_run_log: {
        Row: {
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: number
          job_name: string
          started_at: string
          status: string
        }
        Insert: {
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: number
          job_name: string
          started_at?: string
          status: string
        }
        Update: {
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: number
          job_name?: string
          started_at?: string
          status?: string
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
      e2e_test_runs: {
        Row: {
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: number
          parent_run_id: number | null
          recovery_notified_at: string | null
          retry_count: number
          retry_scheduled_at: string | null
          run_at: string
          status: string
          test_type: string
        }
        Insert: {
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: number
          parent_run_id?: number | null
          recovery_notified_at?: string | null
          retry_count?: number
          retry_scheduled_at?: string | null
          run_at?: string
          status: string
          test_type: string
        }
        Update: {
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: number
          parent_run_id?: number | null
          recovery_notified_at?: string | null
          retry_count?: number
          retry_scheduled_at?: string | null
          run_at?: string
          status?: string
          test_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "e2e_test_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "e2e_test_runs"
            referencedColumns: ["id"]
          },
        ]
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
      evaluare_section_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          label: string | null
          page_path: string | null
          section_id: string
          session_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          label?: string | null
          page_path?: string | null
          section_id: string
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          label?: string | null
          page_path?: string | null
          section_id?: string
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      external_keys_health: {
        Row: {
          checked_at: string
          details: Json | null
          id: number
          is_valid: boolean
          message: string | null
          provider: string
          status_code: number | null
        }
        Insert: {
          checked_at?: string
          details?: Json | null
          id?: number
          is_valid: boolean
          message?: string | null
          provider: string
          status_code?: number | null
        }
        Update: {
          checked_at?: string
          details?: Json | null
          id?: number
          is_valid?: boolean
          message?: string | null
          provider?: string
          status_code?: number | null
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
          public_access_token: string
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
          public_access_token?: string
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
          public_access_token?: string
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
      pdf_funnel_events: {
        Row: {
          created_at: string
          email: string | null
          id: string
          metadata: Json | null
          session_id: string
          source: string | null
          step: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          source?: string | null
          step: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          source?: string | null
          step?: string
        }
        Relationships: []
      }
      phone_intelligence: {
        Row: {
          carrier_name: string | null
          category: string | null
          country_code: string | null
          is_blacklisted: boolean | null
          is_unreachable: boolean | null
          last_seen: string | null
          line_type: string | null
          lookup_at: string | null
          lookup_error: string | null
          phone_number: string
        }
        Insert: {
          carrier_name?: string | null
          category?: string | null
          country_code?: string | null
          is_blacklisted?: boolean | null
          is_unreachable?: boolean | null
          last_seen?: string | null
          line_type?: string | null
          lookup_at?: string | null
          lookup_error?: string | null
          phone_number: string
        }
        Update: {
          carrier_name?: string | null
          category?: string | null
          country_code?: string | null
          is_blacklisted?: boolean | null
          is_unreachable?: boolean | null
          last_seen?: string | null
          line_type?: string | null
          lookup_at?: string | null
          lookup_error?: string | null
          phone_number?: string
        }
        Relationships: []
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
          comfort_level: string | null
          compartimentare: string | null
          construction_type: string | null
          created_at: string
          description_en: string
          description_ro: string
          destination: string | null
          display_order: number
          energy_class: string | null
          estimated_revenue: string | null
          expert_insight_en: string | null
          expert_insight_ro: string | null
          features: string[]
          floor: string | null
          furnished: string | null
          has_ac: boolean | null
          has_cellar: boolean | null
          has_elevator: boolean | null
          has_storage: boolean | null
          heating_type: string | null
          height_regime: string | null
          house_rules: string[] | null
          house_rules_en: string[] | null
          id: string
          image_path: string | null
          images: string[] | null
          intercom_type: string | null
          is_active: boolean
          kitchens: number | null
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
          property_subtype: string | null
          renovation_year: number | null
          roi_percentage: string | null
          rooms: number | null
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
          comfort_level?: string | null
          compartimentare?: string | null
          construction_type?: string | null
          created_at?: string
          description_en: string
          description_ro: string
          destination?: string | null
          display_order?: number
          energy_class?: string | null
          estimated_revenue?: string | null
          expert_insight_en?: string | null
          expert_insight_ro?: string | null
          features?: string[]
          floor?: string | null
          furnished?: string | null
          has_ac?: boolean | null
          has_cellar?: boolean | null
          has_elevator?: boolean | null
          has_storage?: boolean | null
          heating_type?: string | null
          height_regime?: string | null
          house_rules?: string[] | null
          house_rules_en?: string[] | null
          id?: string
          image_path?: string | null
          images?: string[] | null
          intercom_type?: string | null
          is_active?: boolean
          kitchens?: number | null
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
          property_subtype?: string | null
          renovation_year?: number | null
          roi_percentage?: string | null
          rooms?: number | null
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
          comfort_level?: string | null
          compartimentare?: string | null
          construction_type?: string | null
          created_at?: string
          description_en?: string
          description_ro?: string
          destination?: string | null
          display_order?: number
          energy_class?: string | null
          estimated_revenue?: string | null
          expert_insight_en?: string | null
          expert_insight_ro?: string | null
          features?: string[]
          floor?: string | null
          furnished?: string | null
          has_ac?: boolean | null
          has_cellar?: boolean | null
          has_elevator?: boolean | null
          has_storage?: boolean | null
          heating_type?: string | null
          height_regime?: string | null
          house_rules?: string[] | null
          house_rules_en?: string[] | null
          id?: string
          image_path?: string | null
          images?: string[] | null
          intercom_type?: string | null
          is_active?: boolean
          kitchens?: number | null
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
          property_subtype?: string | null
          renovation_year?: number | null
          roi_percentage?: string | null
          rooms?: number | null
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
      property_contact_details: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          property_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          property_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_contact_details_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      property_listings: {
        Row: {
          admin_notes: string | null
          ai_analysis: Json | null
          annual_operating_costs: number | null
          bathrooms: number | null
          created_at: string
          description: string | null
          estimated_monthly_revenue: number | null
          id: string
          images: string[] | null
          initial_setup_cost: number | null
          investment_score: number | null
          listing_category: Database["public"]["Enums"]["listing_category"]
          location: string | null
          price: number | null
          property_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          roi_percentage: number | null
          rooms: number | null
          size: number | null
          status: Database["public"]["Enums"]["listing_status"]
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          annual_operating_costs?: number | null
          bathrooms?: number | null
          created_at?: string
          description?: string | null
          estimated_monthly_revenue?: number | null
          id?: string
          images?: string[] | null
          initial_setup_cost?: number | null
          investment_score?: number | null
          listing_category?: Database["public"]["Enums"]["listing_category"]
          location?: string | null
          price?: number | null
          property_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          roi_percentage?: number | null
          rooms?: number | null
          size?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          annual_operating_costs?: number | null
          bathrooms?: number | null
          created_at?: string
          description?: string | null
          estimated_monthly_revenue?: number | null
          id?: string
          images?: string[] | null
          initial_setup_cost?: number | null
          investment_score?: number | null
          listing_category?: Database["public"]["Enums"]["listing_category"]
          location?: string | null
          price?: number | null
          property_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          roi_percentage?: number | null
          rooms?: number | null
          size?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      property_requests: {
        Row: {
          bedrooms: string | null
          budget_range: string | null
          created_at: string
          email: string | null
          id: string
          is_read: boolean
          message: string | null
          name: string
          phone: string
          preferred_area: string | null
          property_type: string | null
          source_page: string | null
          source_property_slug: string | null
        }
        Insert: {
          bedrooms?: string | null
          budget_range?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          name: string
          phone: string
          preferred_area?: string | null
          property_type?: string | null
          source_page?: string | null
          source_property_slug?: string | null
        }
        Update: {
          bedrooms?: string | null
          budget_range?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          name?: string
          phone?: string
          preferred_area?: string | null
          property_type?: string | null
          source_page?: string | null
          source_property_slug?: string | null
        }
        Relationships: []
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
      prospect_alert_settings: {
        Row: {
          dominance_critical_ratio: number
          dominance_min_total: number
          dominance_warning_ratio: number
          email_min_severity: string
          id: number
          notifications_enabled: boolean
          recipient_emails: string[]
          recipient_phones: string[]
          sms_min_severity: string
          spike_critical_ratio: number
          spike_min_count: number
          spike_warning_ratio: number
          surge_threshold: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          dominance_critical_ratio?: number
          dominance_min_total?: number
          dominance_warning_ratio?: number
          email_min_severity?: string
          id?: number
          notifications_enabled?: boolean
          recipient_emails?: string[]
          recipient_phones?: string[]
          sms_min_severity?: string
          spike_critical_ratio?: number
          spike_min_count?: number
          spike_warning_ratio?: number
          surge_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          dominance_critical_ratio?: number
          dominance_min_total?: number
          dominance_warning_ratio?: number
          email_min_severity?: string
          id?: number
          notifications_enabled?: boolean
          recipient_emails?: string[]
          recipient_phones?: string[]
          sms_min_severity?: string
          spike_critical_ratio?: number
          spike_min_count?: number
          spike_warning_ratio?: number
          surge_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      prospect_listings: {
        Row: {
          admin_notes: string | null
          agency_classified_at: string | null
          agency_suspicion_reason: string | null
          agency_suspicion_score: number | null
          ai_score_breakdown: Json | null
          ai_scored_at: string | null
          assigned_to: string | null
          auto_blacklist_reason: string | null
          auto_blacklisted_at: string | null
          auto_call_triggered_at: string | null
          call_summary: string | null
          callback_attempts: number
          campaign_run_id: string | null
          category: Database["public"]["Enums"]["offer_category"] | null
          consecutive_failures: number
          contact_name: string | null
          contact_phone: string | null
          conversion_probability: number | null
          created_at: string | null
          currency: string | null
          dedup_key: string | null
          description: string | null
          do_not_call: boolean
          do_not_call_at: string | null
          do_not_call_reason: string | null
          duplicate_of: string | null
          features: string[] | null
          floor: string | null
          followup_sent_at: string | null
          id: string
          images: string[] | null
          invalid_reason: string | null
          is_active: boolean | null
          last_callback_window: string | null
          last_failure_reason: string | null
          last_retry_at: string | null
          last_seen_at: string | null
          lead_score: number | null
          lifecycle_status: Database["public"]["Enums"]["lead_lifecycle_status"]
          location: string | null
          marked_invalid_at: string | null
          migrated_from_scraper_id: string | null
          next_callback_at: string | null
          owner_sentiment: string | null
          persona_generated_at: string | null
          persona_snapshot: Json | null
          phone_normalized: string | null
          pre_campaign_status: string | null
          predictive_score: number | null
          price: number | null
          price_per_sqm: number | null
          prospect_type: string
          rating: number | null
          rejection_reason: string | null
          retry_count: number
          review_count: number | null
          rooms: number | null
          score: number | null
          score_breakdown: Json | null
          scraped_at: string | null
          search_keywords: string[]
          size: number | null
          source_platform: string
          source_url: string
          status: string | null
          tags: string[]
          title: string | null
          tts_context_key: string | null
          undervaluation_percent: number | null
          updated_at: string | null
          urgency_level: number | null
          voice_call_session_id: string | null
          year_built: number | null
          zone: string | null
        }
        Insert: {
          admin_notes?: string | null
          agency_classified_at?: string | null
          agency_suspicion_reason?: string | null
          agency_suspicion_score?: number | null
          ai_score_breakdown?: Json | null
          ai_scored_at?: string | null
          assigned_to?: string | null
          auto_blacklist_reason?: string | null
          auto_blacklisted_at?: string | null
          auto_call_triggered_at?: string | null
          call_summary?: string | null
          callback_attempts?: number
          campaign_run_id?: string | null
          category?: Database["public"]["Enums"]["offer_category"] | null
          consecutive_failures?: number
          contact_name?: string | null
          contact_phone?: string | null
          conversion_probability?: number | null
          created_at?: string | null
          currency?: string | null
          dedup_key?: string | null
          description?: string | null
          do_not_call?: boolean
          do_not_call_at?: string | null
          do_not_call_reason?: string | null
          duplicate_of?: string | null
          features?: string[] | null
          floor?: string | null
          followup_sent_at?: string | null
          id?: string
          images?: string[] | null
          invalid_reason?: string | null
          is_active?: boolean | null
          last_callback_window?: string | null
          last_failure_reason?: string | null
          last_retry_at?: string | null
          last_seen_at?: string | null
          lead_score?: number | null
          lifecycle_status?: Database["public"]["Enums"]["lead_lifecycle_status"]
          location?: string | null
          marked_invalid_at?: string | null
          migrated_from_scraper_id?: string | null
          next_callback_at?: string | null
          owner_sentiment?: string | null
          persona_generated_at?: string | null
          persona_snapshot?: Json | null
          phone_normalized?: string | null
          pre_campaign_status?: string | null
          predictive_score?: number | null
          price?: number | null
          price_per_sqm?: number | null
          prospect_type?: string
          rating?: number | null
          rejection_reason?: string | null
          retry_count?: number
          review_count?: number | null
          rooms?: number | null
          score?: number | null
          score_breakdown?: Json | null
          scraped_at?: string | null
          search_keywords?: string[]
          size?: number | null
          source_platform: string
          source_url: string
          status?: string | null
          tags?: string[]
          title?: string | null
          tts_context_key?: string | null
          undervaluation_percent?: number | null
          updated_at?: string | null
          urgency_level?: number | null
          voice_call_session_id?: string | null
          year_built?: number | null
          zone?: string | null
        }
        Update: {
          admin_notes?: string | null
          agency_classified_at?: string | null
          agency_suspicion_reason?: string | null
          agency_suspicion_score?: number | null
          ai_score_breakdown?: Json | null
          ai_scored_at?: string | null
          assigned_to?: string | null
          auto_blacklist_reason?: string | null
          auto_blacklisted_at?: string | null
          auto_call_triggered_at?: string | null
          call_summary?: string | null
          callback_attempts?: number
          campaign_run_id?: string | null
          category?: Database["public"]["Enums"]["offer_category"] | null
          consecutive_failures?: number
          contact_name?: string | null
          contact_phone?: string | null
          conversion_probability?: number | null
          created_at?: string | null
          currency?: string | null
          dedup_key?: string | null
          description?: string | null
          do_not_call?: boolean
          do_not_call_at?: string | null
          do_not_call_reason?: string | null
          duplicate_of?: string | null
          features?: string[] | null
          floor?: string | null
          followup_sent_at?: string | null
          id?: string
          images?: string[] | null
          invalid_reason?: string | null
          is_active?: boolean | null
          last_callback_window?: string | null
          last_failure_reason?: string | null
          last_retry_at?: string | null
          last_seen_at?: string | null
          lead_score?: number | null
          lifecycle_status?: Database["public"]["Enums"]["lead_lifecycle_status"]
          location?: string | null
          marked_invalid_at?: string | null
          migrated_from_scraper_id?: string | null
          next_callback_at?: string | null
          owner_sentiment?: string | null
          persona_generated_at?: string | null
          persona_snapshot?: Json | null
          phone_normalized?: string | null
          pre_campaign_status?: string | null
          predictive_score?: number | null
          price?: number | null
          price_per_sqm?: number | null
          prospect_type?: string
          rating?: number | null
          rejection_reason?: string | null
          retry_count?: number
          review_count?: number | null
          rooms?: number | null
          score?: number | null
          score_breakdown?: Json | null
          scraped_at?: string | null
          search_keywords?: string[]
          size?: number | null
          source_platform?: string
          source_url?: string
          status?: string | null
          tags?: string[]
          title?: string | null
          tts_context_key?: string | null
          undervaluation_percent?: number | null
          updated_at?: string | null
          urgency_level?: number | null
          voice_call_session_id?: string | null
          year_built?: number | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_listings_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "prospect_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_rejection_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          category: string
          created_at: string
          id: string
          message: string
          metric: Json
          notification_channels: string[] | null
          notification_error: string | null
          notified_at: string | null
          rejection_reason: string | null
          severity: string
          signature: string
          source_platform: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          metric?: Json
          notification_channels?: string[] | null
          notification_error?: string | null
          notified_at?: string | null
          rejection_reason?: string | null
          severity: string
          signature: string
          source_platform?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          metric?: Json
          notification_channels?: string[] | null
          notification_error?: string | null
          notified_at?: string | null
          rejection_reason?: string | null
          severity?: string
          signature?: string
          source_platform?: string | null
          status?: string
          title?: string
          updated_at?: string
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
          id: string
          updated_at: string | null
        }
        Insert: {
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
          id: string
          updated_at?: string | null
        }
        Update: {
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
          updated_at?: string | null
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
      saved_comparisons: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          session_id: string | null
          share_code: string
          shared_via: string[] | null
          updated_at: string | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items: Json
          session_id?: string | null
          share_code?: string
          shared_via?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          session_id?: string | null
          share_code?: string
          shared_via?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
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
            referencedRelation: "scraper_leads_archive_2026"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_leads_archive_2026: {
        Row: {
          admin_notes: string | null
          agency_name: string | null
          ai_insight: Json | null
          ai_insight_generated_at: string | null
          auto_call_triggered_at: string | null
          call_summary: string | null
          category: Database["public"]["Enums"]["scraper_lead_category"] | null
          conversion_probability: number | null
          created_at: string
          estimated_roi: number | null
          extra_profit_3y: number
          follow_up_at: string | null
          followup_sent_at: string | null
          id: string
          is_priority: boolean | null
          lead_score: number
          lifecycle_status: Database["public"]["Enums"]["scraper_lead_status"]
          listing_type: string
          location: string | null
          monthly_extra: number
          neighborhood_slug: string | null
          original_price: number
          phone: string | null
          predicted_market_value: number | null
          prediction_generated_at: string | null
          prediction_reasoning: string | null
          prospect_category: string | null
          search_keyword: string | null
          seo_description: string | null
          snoozed_until: string | null
          source: string | null
          status: string
          tags: string[]
          title: string
          undervaluation_percent: number | null
          updated_at: string
          url: string
          whatsapp_message: string | null
        }
        Insert: {
          admin_notes?: string | null
          agency_name?: string | null
          ai_insight?: Json | null
          ai_insight_generated_at?: string | null
          auto_call_triggered_at?: string | null
          call_summary?: string | null
          category?: Database["public"]["Enums"]["scraper_lead_category"] | null
          conversion_probability?: number | null
          created_at?: string
          estimated_roi?: number | null
          extra_profit_3y?: number
          follow_up_at?: string | null
          followup_sent_at?: string | null
          id?: string
          is_priority?: boolean | null
          lead_score?: number
          lifecycle_status?: Database["public"]["Enums"]["scraper_lead_status"]
          listing_type?: string
          location?: string | null
          monthly_extra?: number
          neighborhood_slug?: string | null
          original_price?: number
          phone?: string | null
          predicted_market_value?: number | null
          prediction_generated_at?: string | null
          prediction_reasoning?: string | null
          prospect_category?: string | null
          search_keyword?: string | null
          seo_description?: string | null
          snoozed_until?: string | null
          source?: string | null
          status?: string
          tags?: string[]
          title: string
          undervaluation_percent?: number | null
          updated_at?: string
          url: string
          whatsapp_message?: string | null
        }
        Update: {
          admin_notes?: string | null
          agency_name?: string | null
          ai_insight?: Json | null
          ai_insight_generated_at?: string | null
          auto_call_triggered_at?: string | null
          call_summary?: string | null
          category?: Database["public"]["Enums"]["scraper_lead_category"] | null
          conversion_probability?: number | null
          created_at?: string
          estimated_roi?: number | null
          extra_profit_3y?: number
          follow_up_at?: string | null
          followup_sent_at?: string | null
          id?: string
          is_priority?: boolean | null
          lead_score?: number
          lifecycle_status?: Database["public"]["Enums"]["scraper_lead_status"]
          listing_type?: string
          location?: string | null
          monthly_extra?: number
          neighborhood_slug?: string | null
          original_price?: number
          phone?: string | null
          predicted_market_value?: number | null
          prediction_generated_at?: string | null
          prediction_reasoning?: string | null
          prospect_category?: string | null
          search_keyword?: string | null
          seo_description?: string | null
          snoozed_until?: string | null
          source?: string | null
          status?: string
          tags?: string[]
          title?: string
          undervaluation_percent?: number | null
          updated_at?: string
          url?: string
          whatsapp_message?: string | null
        }
        Relationships: []
      }
      scraper_quick_reply_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          display_order: number
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          display_order?: number
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scraper_scan_logs: {
        Row: {
          archived_skipped: number | null
          blacklisted_skipped: number | null
          id: string
          new_count: number | null
          scanned_at: string | null
          total_processed: number | null
        }
        Insert: {
          archived_skipped?: number | null
          blacklisted_skipped?: number | null
          id?: string
          new_count?: number | null
          scanned_at?: string | null
          total_processed?: number | null
        }
        Update: {
          archived_skipped?: number | null
          blacklisted_skipped?: number | null
          id?: string
          new_count?: number | null
          scanned_at?: string | null
          total_processed?: number | null
        }
        Relationships: []
      }
      scraper_search_keywords: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          owner_filters: Json
          platform: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          owner_filters?: Json
          platform?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          owner_filters?: Json
          platform?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_ab_metrics: {
        Row: {
          clicks: number
          created_at: string
          ctr: number | null
          day: string
          id: string
          impressions: number
          source: string
          updated_at: string
          url_path: string
          variant: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          ctr?: number | null
          day?: string
          id?: string
          impressions?: number
          source?: string
          updated_at?: string
          url_path: string
          variant: string
        }
        Update: {
          clicks?: number
          created_at?: string
          ctr?: number | null
          day?: string
          id?: string
          impressions?: number
          source?: string
          updated_at?: string
          url_path?: string
          variant?: string
        }
        Relationships: []
      }
      seo_andrei_bridge: {
        Row: {
          auto_dial_response: Json | null
          call_session_id: string | null
          created_at: string
          id: string
          last_retry_at: string | null
          match_reason: string | null
          matched_keywords: string[] | null
          opportunity_id: string | null
          page: string | null
          parent_bridge_id: string | null
          prospect_id: string | null
          query: string | null
          retry_count: number
          score_after: number | null
          score_before: number | null
          status: string
          triggered_at: string
          triggered_date: string
        }
        Insert: {
          auto_dial_response?: Json | null
          call_session_id?: string | null
          created_at?: string
          id?: string
          last_retry_at?: string | null
          match_reason?: string | null
          matched_keywords?: string[] | null
          opportunity_id?: string | null
          page?: string | null
          parent_bridge_id?: string | null
          prospect_id?: string | null
          query?: string | null
          retry_count?: number
          score_after?: number | null
          score_before?: number | null
          status?: string
          triggered_at?: string
          triggered_date?: string
        }
        Update: {
          auto_dial_response?: Json | null
          call_session_id?: string | null
          created_at?: string
          id?: string
          last_retry_at?: string | null
          match_reason?: string | null
          matched_keywords?: string[] | null
          opportunity_id?: string | null
          page?: string | null
          parent_bridge_id?: string | null
          prospect_id?: string | null
          query?: string | null
          retry_count?: number
          score_after?: number | null
          score_before?: number | null
          status?: string
          triggered_at?: string
          triggered_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_andrei_bridge_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "seo_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_andrei_bridge_parent_bridge_id_fkey"
            columns: ["parent_bridge_id"]
            isOneToOne: false
            referencedRelation: "seo_andrei_bridge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_andrei_bridge_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospect_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_anomaly_log: {
        Row: {
          alert_key: string
          id: number
          payload: Json
          sent_at: string
        }
        Insert: {
          alert_key: string
          id?: number
          payload?: Json
          sent_at?: string
        }
        Update: {
          alert_key?: string
          id?: number
          payload?: Json
          sent_at?: string
        }
        Relationships: []
      }
      seo_audit_log: {
        Row: {
          action: string
          applied_at: string
          applied_by: string | null
          audit_id: string | null
          batch_id: string
          category: string | null
          id: string
          payload: Json | null
          reverted: boolean
          reverted_at: string | null
          source: string
          url_path: string
        }
        Insert: {
          action: string
          applied_at?: string
          applied_by?: string | null
          audit_id?: string | null
          batch_id: string
          category?: string | null
          id?: string
          payload?: Json | null
          reverted?: boolean
          reverted_at?: string | null
          source?: string
          url_path: string
        }
        Update: {
          action?: string
          applied_at?: string
          applied_by?: string | null
          audit_id?: string | null
          batch_id?: string
          category?: string | null
          id?: string
          payload?: Json | null
          reverted?: boolean
          reverted_at?: string | null
          source?: string
          url_path?: string
        }
        Relationships: []
      }
      seo_audit_snapshots: {
        Row: {
          alert_reason: string | null
          alert_triggered: boolean
          audit_id: string | null
          created_at: string
          delta_local: number | null
          delta_overall: number | null
          id: string
          language: string
          local_relevance_score: number
          overall_score: number
          pdf_storage_path: string | null
          run_type: string
          url: string
        }
        Insert: {
          alert_reason?: string | null
          alert_triggered?: boolean
          audit_id?: string | null
          created_at?: string
          delta_local?: number | null
          delta_overall?: number | null
          id?: string
          language?: string
          local_relevance_score?: number
          overall_score?: number
          pdf_storage_path?: string | null
          run_type?: string
          url: string
        }
        Update: {
          alert_reason?: string | null
          alert_triggered?: boolean
          audit_id?: string | null
          created_at?: string
          delta_local?: number | null
          delta_overall?: number | null
          id?: string
          language?: string
          local_relevance_score?: number
          overall_score?: number
          pdf_storage_path?: string | null
          run_type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_audit_snapshots_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "seo_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_audits: {
        Row: {
          content_hash: string | null
          created_at: string
          h1_count: number | null
          id: string
          issues: Json | null
          keyword_gaps: Json | null
          language: string
          local_entities_found: Json | null
          local_entities_missing: Json | null
          local_geo_keywords: Json | null
          local_recommendations: Json | null
          local_relevance_score: number | null
          meta_description: string | null
          opportunities: Json | null
          overall_score: number | null
          page_type: string | null
          raw_analysis: Json | null
          strengths: Json | null
          suggested_meta: string | null
          suggested_title: string | null
          title: string | null
          updated_at: string
          url: string
          word_count: number | null
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          h1_count?: number | null
          id?: string
          issues?: Json | null
          keyword_gaps?: Json | null
          language?: string
          local_entities_found?: Json | null
          local_entities_missing?: Json | null
          local_geo_keywords?: Json | null
          local_recommendations?: Json | null
          local_relevance_score?: number | null
          meta_description?: string | null
          opportunities?: Json | null
          overall_score?: number | null
          page_type?: string | null
          raw_analysis?: Json | null
          strengths?: Json | null
          suggested_meta?: string | null
          suggested_title?: string | null
          title?: string | null
          updated_at?: string
          url: string
          word_count?: number | null
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          h1_count?: number | null
          id?: string
          issues?: Json | null
          keyword_gaps?: Json | null
          language?: string
          local_entities_found?: Json | null
          local_entities_missing?: Json | null
          local_geo_keywords?: Json | null
          local_recommendations?: Json | null
          local_relevance_score?: number | null
          meta_description?: string | null
          opportunities?: Json | null
          overall_score?: number | null
          page_type?: string | null
          raw_analysis?: Json | null
          strengths?: Json | null
          suggested_meta?: string | null
          suggested_title?: string | null
          title?: string | null
          updated_at?: string
          url?: string
          word_count?: number | null
        }
        Relationships: []
      }
      seo_canonical_fix_log: {
        Row: {
          applied_at: string
          applied_by: string | null
          conflict_overridden: boolean
          conflicts_detected: Json | null
          fix_source: string
          id: string
          new_canonical: string
          override_reason: string | null
          previous_canonical: string | null
          url_path: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          conflict_overridden?: boolean
          conflicts_detected?: Json | null
          fix_source: string
          id?: string
          new_canonical: string
          override_reason?: string | null
          previous_canonical?: string | null
          url_path: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          conflict_overridden?: boolean
          conflicts_detected?: Json | null
          fix_source?: string
          id?: string
          new_canonical?: string
          override_reason?: string | null
          previous_canonical?: string | null
          url_path?: string
        }
        Relationships: []
      }
      seo_competitor_rankings: {
        Row: {
          created_at: string
          date: string
          domain: string
          id: number
          is_us: boolean
          position: number | null
          query: string
          title: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          date: string
          domain: string
          id?: number
          is_us?: boolean
          position?: number | null
          query: string
          title?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          domain?: string
          id?: number
          is_us?: boolean
          position?: number | null
          query?: string
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      seo_competitor_schedules: {
        Row: {
          competitor_urls: Json
          created_at: string
          created_by: string | null
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          last_run_status: string | null
          next_run_at: string
          our_url_path: string
          updated_at: string
        }
        Insert: {
          competitor_urls?: Json
          created_at?: string
          created_by?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          next_run_at?: string
          our_url_path: string
          updated_at?: string
        }
        Update: {
          competitor_urls?: Json
          created_at?: string
          created_by?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          next_run_at?: string
          our_url_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_competitor_snapshots: {
        Row: {
          ai_gaps: Json | null
          ai_summary: string | null
          competitor_h1: string | null
          competitor_label: string | null
          competitor_meta: string | null
          competitor_schema_raw: Json | null
          competitor_schema_types: Json | null
          competitor_title: string | null
          competitor_url: string
          competitor_word_count: number | null
          created_at: string
          fetched_at: string
          id: string
          our_url_path: string
        }
        Insert: {
          ai_gaps?: Json | null
          ai_summary?: string | null
          competitor_h1?: string | null
          competitor_label?: string | null
          competitor_meta?: string | null
          competitor_schema_raw?: Json | null
          competitor_schema_types?: Json | null
          competitor_title?: string | null
          competitor_url: string
          competitor_word_count?: number | null
          created_at?: string
          fetched_at?: string
          id?: string
          our_url_path: string
        }
        Update: {
          ai_gaps?: Json | null
          ai_summary?: string | null
          competitor_h1?: string | null
          competitor_label?: string | null
          competitor_meta?: string | null
          competitor_schema_raw?: Json | null
          competitor_schema_types?: Json | null
          competitor_title?: string | null
          competitor_url?: string
          competitor_word_count?: number | null
          created_at?: string
          fetched_at?: string
          id?: string
          our_url_path?: string
        }
        Relationships: []
      }
      seo_content_briefs: {
        Row: {
          applied_at: string | null
          competitor_url: string | null
          created_at: string
          draft_content: string | null
          generated_by: string | null
          h2_title: string
          id: string
          status: string
          updated_at: string
          url_path: string
        }
        Insert: {
          applied_at?: string | null
          competitor_url?: string | null
          created_at?: string
          draft_content?: string | null
          generated_by?: string | null
          h2_title: string
          id?: string
          status?: string
          updated_at?: string
          url_path: string
        }
        Update: {
          applied_at?: string | null
          competitor_url?: string | null
          created_at?: string
          draft_content?: string | null
          generated_by?: string | null
          h2_title?: string
          id?: string
          status?: string
          updated_at?: string
          url_path?: string
        }
        Relationships: []
      }
      seo_ga4_metrics: {
        Row: {
          conversions: number
          created_at: string
          engagement_rate: number
          id: string
          period_start: string
          sessions: number
          updated_at: string
          url_path: string
        }
        Insert: {
          conversions?: number
          created_at?: string
          engagement_rate?: number
          id?: string
          period_start: string
          sessions?: number
          updated_at?: string
          url_path: string
        }
        Update: {
          conversions?: number
          created_at?: string
          engagement_rate?: number
          id?: string
          period_start?: string
          sessions?: number
          updated_at?: string
          url_path?: string
        }
        Relationships: []
      }
      seo_gsc_daily: {
        Row: {
          clicks: number
          created_at: string
          ctr: number
          date: string
          id: number
          impressions: number
          page: string
          position: number
          query: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          ctr?: number
          date: string
          id?: number
          impressions?: number
          page?: string
          position?: number
          query?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          ctr?: number
          date?: string
          id?: number
          impressions?: number
          page?: string
          position?: number
          query?: string
        }
        Relationships: []
      }
      seo_indexing_snapshots: {
        Row: {
          checked_pages: number
          created_at: string
          id: string
          issues: Json
          issues_count: number
          site: string
        }
        Insert: {
          checked_pages?: number
          created_at?: string
          id?: string
          issues?: Json
          issues_count?: number
          site: string
        }
        Update: {
          checked_pages?: number
          created_at?: string
          id?: string
          issues?: Json
          issues_count?: number
          site?: string
        }
        Relationships: []
      }
      seo_internal_link_suggestions: {
        Row: {
          anchor_text: string
          applied_at: string | null
          applied_by: string | null
          created_at: string
          id: string
          reason: string | null
          relevance_score: number | null
          source_url_path: string
          status: string
          target_url_path: string
        }
        Insert: {
          anchor_text: string
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          relevance_score?: number | null
          source_url_path: string
          status?: string
          target_url_path: string
        }
        Update: {
          anchor_text?: string
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          relevance_score?: number | null
          source_url_path?: string
          status?: string
          target_url_path?: string
        }
        Relationships: []
      }
      seo_local_rec_status: {
        Row: {
          audit_id: string
          created_at: string
          id: string
          note: string | null
          rec_hash: string | null
          rec_index: number
          status: Database["public"]["Enums"]["seo_local_rec_status_enum"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audit_id: string
          created_at?: string
          id?: string
          note?: string | null
          rec_hash?: string | null
          rec_index: number
          status?: Database["public"]["Enums"]["seo_local_rec_status_enum"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audit_id?: string
          created_at?: string
          id?: string
          note?: string | null
          rec_hash?: string | null
          rec_index?: number
          status?: Database["public"]["Enums"]["seo_local_rec_status_enum"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      seo_opportunities: {
        Row: {
          ai_actions: Json | null
          ai_generated_at: string | null
          ai_meta: string | null
          ai_title: string | null
          created_at: string
          current_clicks: number | null
          current_ctr: number | null
          current_impressions: number | null
          current_position: number | null
          details: Json | null
          id: string
          page: string | null
          pages: Json | null
          potential_clicks: number | null
          query: string | null
          score: number
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          ai_actions?: Json | null
          ai_generated_at?: string | null
          ai_meta?: string | null
          ai_title?: string | null
          created_at?: string
          current_clicks?: number | null
          current_ctr?: number | null
          current_impressions?: number | null
          current_position?: number | null
          details?: Json | null
          id?: string
          page?: string | null
          pages?: Json | null
          potential_clicks?: number | null
          query?: string | null
          score?: number
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          ai_actions?: Json | null
          ai_generated_at?: string | null
          ai_meta?: string | null
          ai_title?: string | null
          created_at?: string
          current_clicks?: number | null
          current_ctr?: number | null
          current_impressions?: number | null
          current_position?: number | null
          details?: Json | null
          id?: string
          page?: string | null
          pages?: Json | null
          potential_clicks?: number | null
          query?: string | null
          score?: number
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_override_history: {
        Row: {
          alt_text_suggestions: Json | null
          applied_at: string
          applied_by: string | null
          canonical_url: string | null
          change_type: string
          extra_keywords: Json | null
          id: string
          json_ld: Json | null
          meta_description: string | null
          notes: string | null
          reverted_at: string | null
          score_after: number | null
          score_before: number | null
          source_audit_id: string | null
          title: string | null
          url_path: string
          validation_status: string | null
          version_number: number
        }
        Insert: {
          alt_text_suggestions?: Json | null
          applied_at?: string
          applied_by?: string | null
          canonical_url?: string | null
          change_type?: string
          extra_keywords?: Json | null
          id?: string
          json_ld?: Json | null
          meta_description?: string | null
          notes?: string | null
          reverted_at?: string | null
          score_after?: number | null
          score_before?: number | null
          source_audit_id?: string | null
          title?: string | null
          url_path: string
          validation_status?: string | null
          version_number: number
        }
        Update: {
          alt_text_suggestions?: Json | null
          applied_at?: string
          applied_by?: string | null
          canonical_url?: string | null
          change_type?: string
          extra_keywords?: Json | null
          id?: string
          json_ld?: Json | null
          meta_description?: string | null
          notes?: string | null
          reverted_at?: string | null
          score_after?: number | null
          score_before?: number | null
          source_audit_id?: string | null
          title?: string | null
          url_path?: string
          validation_status?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "seo_override_history_source_audit_id_fkey"
            columns: ["source_audit_id"]
            isOneToOne: false
            referencedRelation: "seo_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_overrides: {
        Row: {
          ab_enabled: boolean
          ab_resolved_by: string | null
          ab_variant_b: Json | null
          ab_winner: string | null
          ab_winner_resolved_at: string | null
          ai_generated: boolean
          ai_generated_at: string | null
          ai_model: string | null
          alt_text_suggestions: Json | null
          applied_at: string
          applied_by: string | null
          canonical_url: string | null
          created_at: string
          extra_keywords: Json | null
          id: string
          is_active: boolean
          json_ld: Json | null
          last_validated_at: string | null
          last_validation_status: string | null
          meta_description: string | null
          pending_review: boolean
          source_audit_id: string | null
          structural_todos: Json | null
          title: string | null
          updated_at: string
          url_path: string
        }
        Insert: {
          ab_enabled?: boolean
          ab_resolved_by?: string | null
          ab_variant_b?: Json | null
          ab_winner?: string | null
          ab_winner_resolved_at?: string | null
          ai_generated?: boolean
          ai_generated_at?: string | null
          ai_model?: string | null
          alt_text_suggestions?: Json | null
          applied_at?: string
          applied_by?: string | null
          canonical_url?: string | null
          created_at?: string
          extra_keywords?: Json | null
          id?: string
          is_active?: boolean
          json_ld?: Json | null
          last_validated_at?: string | null
          last_validation_status?: string | null
          meta_description?: string | null
          pending_review?: boolean
          source_audit_id?: string | null
          structural_todos?: Json | null
          title?: string | null
          updated_at?: string
          url_path: string
        }
        Update: {
          ab_enabled?: boolean
          ab_resolved_by?: string | null
          ab_variant_b?: Json | null
          ab_winner?: string | null
          ab_winner_resolved_at?: string | null
          ai_generated?: boolean
          ai_generated_at?: string | null
          ai_model?: string | null
          alt_text_suggestions?: Json | null
          applied_at?: string
          applied_by?: string | null
          canonical_url?: string | null
          created_at?: string
          extra_keywords?: Json | null
          id?: string
          is_active?: boolean
          json_ld?: Json | null
          last_validated_at?: string | null
          last_validation_status?: string | null
          meta_description?: string | null
          pending_review?: boolean
          source_audit_id?: string | null
          structural_todos?: Json | null
          title?: string | null
          updated_at?: string
          url_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_overrides_source_audit_id_fkey"
            columns: ["source_audit_id"]
            isOneToOne: false
            referencedRelation: "seo_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_page_audits: {
        Row: {
          created_at: string
          external_links: number | null
          h1: string | null
          h2_count: number | null
          health_score: number | null
          id: string
          images_missing_alt: number | null
          images_total: number | null
          internal_links: number | null
          issues: Json | null
          last_scraped_at: string
          meta_description: string | null
          page: string
          schema_types: string[] | null
          title: string | null
          word_count: number | null
        }
        Insert: {
          created_at?: string
          external_links?: number | null
          h1?: string | null
          h2_count?: number | null
          health_score?: number | null
          id?: string
          images_missing_alt?: number | null
          images_total?: number | null
          internal_links?: number | null
          issues?: Json | null
          last_scraped_at?: string
          meta_description?: string | null
          page: string
          schema_types?: string[] | null
          title?: string | null
          word_count?: number | null
        }
        Update: {
          created_at?: string
          external_links?: number | null
          h1?: string | null
          h2_count?: number | null
          health_score?: number | null
          id?: string
          images_missing_alt?: number | null
          images_total?: number | null
          internal_links?: number | null
          issues?: Json | null
          last_scraped_at?: string
          meta_description?: string | null
          page?: string
          schema_types?: string[] | null
          title?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      seo_robots_cache: {
        Row: {
          content_hash: string | null
          created_at: string
          expires_at: string
          fetch_count: number
          fetch_error: string | null
          fetched_at: string
          host: string
          http_status: number | null
          id: string
          invalidation_count: number
          last_change_detected_at: string | null
          parsed_rules: Json
          raw_content: string
          sitemap_urls: string[]
          updated_at: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          expires_at?: string
          fetch_count?: number
          fetch_error?: string | null
          fetched_at?: string
          host: string
          http_status?: number | null
          id?: string
          invalidation_count?: number
          last_change_detected_at?: string | null
          parsed_rules?: Json
          raw_content: string
          sitemap_urls?: string[]
          updated_at?: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          expires_at?: string
          fetch_count?: number
          fetch_error?: string | null
          fetched_at?: string
          host?: string
          http_status?: number | null
          id?: string
          invalidation_count?: number
          last_change_detected_at?: string | null
          parsed_rules?: Json
          raw_content?: string
          sitemap_urls?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      seo_robots_cache_log: {
        Row: {
          content_hash: string | null
          created_at: string
          event_type: string
          fetch_error: string | null
          host: string
          http_status: number | null
          id: string
          previous_content_hash: string | null
          raw_size: number | null
          rules_count: number | null
          sitemaps_count: number | null
          trigger_reason: string | null
          triggered_by: string | null
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          event_type: string
          fetch_error?: string | null
          host: string
          http_status?: number | null
          id?: string
          previous_content_hash?: string | null
          raw_size?: number | null
          rules_count?: number | null
          sitemaps_count?: number | null
          trigger_reason?: string | null
          triggered_by?: string | null
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          event_type?: string
          fetch_error?: string | null
          host?: string
          http_status?: number | null
          id?: string
          previous_content_hash?: string | null
          raw_size?: number | null
          rules_count?: number | null
          sitemaps_count?: number | null
          trigger_reason?: string | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      seo_schema_validations: {
        Row: {
          error_locations: Json | null
          errors: Json | null
          history_id: string | null
          id: string
          override_id: string | null
          raw_blocks: Json | null
          raw_response: Json | null
          schema_types: Json | null
          status: string
          url_path: string
          validated_at: string
          validator: string
          warnings: Json | null
        }
        Insert: {
          error_locations?: Json | null
          errors?: Json | null
          history_id?: string | null
          id?: string
          override_id?: string | null
          raw_blocks?: Json | null
          raw_response?: Json | null
          schema_types?: Json | null
          status: string
          url_path: string
          validated_at?: string
          validator?: string
          warnings?: Json | null
        }
        Update: {
          error_locations?: Json | null
          errors?: Json | null
          history_id?: string | null
          id?: string
          override_id?: string | null
          raw_blocks?: Json | null
          raw_response?: Json | null
          schema_types?: Json | null
          status?: string
          url_path?: string
          validated_at?: string
          validator?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_schema_validations_history_id_fkey"
            columns: ["history_id"]
            isOneToOne: false
            referencedRelation: "seo_override_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_schema_validations_override_id_fkey"
            columns: ["override_id"]
            isOneToOne: false
            referencedRelation: "seo_overrides"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
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
      system_health_thresholds: {
        Row: {
          cron_grace_minutes: number
          daily_report_email: string
          daily_report_enabled: boolean
          e2e_seo_url: string
          id: boolean
          key_expiry_warn_days: number
          seo_reaudit_interval_days: number
          slack_webhook_url: string | null
          updated_at: string
          updated_by: string | null
          voice_latency_ms_threshold: number
          voice_streak_required: number
        }
        Insert: {
          cron_grace_minutes?: number
          daily_report_email?: string
          daily_report_enabled?: boolean
          e2e_seo_url?: string
          id?: boolean
          key_expiry_warn_days?: number
          seo_reaudit_interval_days?: number
          slack_webhook_url?: string | null
          updated_at?: string
          updated_by?: string | null
          voice_latency_ms_threshold?: number
          voice_streak_required?: number
        }
        Update: {
          cron_grace_minutes?: number
          daily_report_email?: string
          daily_report_enabled?: boolean
          e2e_seo_url?: string
          id?: boolean
          key_expiry_warn_days?: number
          seo_reaudit_interval_days?: number
          slack_webhook_url?: string | null
          updated_at?: string
          updated_by?: string | null
          voice_latency_ms_threshold?: number
          voice_streak_required?: number
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
      user_interactions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          interaction_type: string
          metadata: Json | null
          property_id: string | null
          property_tag: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          property_id?: string | null
          property_tag?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          property_id?: string | null
          property_tag?: string | null
          user_id?: string
        }
        Relationships: []
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
      visitor_memory: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          chatbot_summary: string | null
          first_seen_at: string
          id: string
          last_intent: string | null
          last_seen_at: string
          lead_score: number | null
          metadata: Json
          preferred_listing_type: string | null
          preferred_neighborhoods: string[] | null
          preferred_rooms: number | null
          search_history: Json
          session_id: string
          updated_at: string
          user_id: string | null
          viewed_properties: Json
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          chatbot_summary?: string | null
          first_seen_at?: string
          id?: string
          last_intent?: string | null
          last_seen_at?: string
          lead_score?: number | null
          metadata?: Json
          preferred_listing_type?: string | null
          preferred_neighborhoods?: string[] | null
          preferred_rooms?: number | null
          search_history?: Json
          session_id: string
          updated_at?: string
          user_id?: string | null
          viewed_properties?: Json
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          chatbot_summary?: string | null
          first_seen_at?: string
          id?: string
          last_intent?: string | null
          last_seen_at?: string
          lead_score?: number | null
          metadata?: Json
          preferred_listing_type?: string | null
          preferred_neighborhoods?: string[] | null
          preferred_rooms?: number | null
          search_history?: Json
          session_id?: string
          updated_at?: string
          user_id?: string | null
          viewed_properties?: Json
        }
        Relationships: []
      }
      voice_agent_clarity_logs: {
        Row: {
          clarity_score: number
          created_at: string
          details: Json
          fallback_used: boolean
          id: string
          session_id: string | null
          tts_calls_count: number
          tts_errors_count: number
          tts_latency_ms_avg: number | null
          tts_latency_ms_max: number | null
          twilio_call_status: string | null
        }
        Insert: {
          clarity_score: number
          created_at?: string
          details?: Json
          fallback_used?: boolean
          id?: string
          session_id?: string | null
          tts_calls_count?: number
          tts_errors_count?: number
          tts_latency_ms_avg?: number | null
          tts_latency_ms_max?: number | null
          twilio_call_status?: string | null
        }
        Update: {
          clarity_score?: number
          created_at?: string
          details?: Json
          fallback_used?: boolean
          id?: string
          session_id?: string | null
          tts_calls_count?: number
          tts_errors_count?: number
          tts_latency_ms_avg?: number | null
          tts_latency_ms_max?: number | null
          twilio_call_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_agent_clarity_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "voice_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_agent_drill_daily: {
        Row: {
          by_category: Json
          day: string
          pass_rate: number
          passed: number
          total: number
          updated_at: string
        }
        Insert: {
          by_category?: Json
          day: string
          pass_rate?: number
          passed?: number
          total?: number
          updated_at?: string
        }
        Update: {
          by_category?: Json
          day?: string
          pass_rate?: number
          passed?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      voice_agent_drill_runs: {
        Row: {
          ai_reply: string | null
          created_at: string
          duration_ms: number | null
          expected_hits: string[] | null
          forbidden_hits: string[] | null
          id: string
          judge_notes: string | null
          model: string | null
          passed: boolean
          scenario_id: string
          score: number | null
          triggered_by: string | null
        }
        Insert: {
          ai_reply?: string | null
          created_at?: string
          duration_ms?: number | null
          expected_hits?: string[] | null
          forbidden_hits?: string[] | null
          id?: string
          judge_notes?: string | null
          model?: string | null
          passed?: boolean
          scenario_id: string
          score?: number | null
          triggered_by?: string | null
        }
        Update: {
          ai_reply?: string | null
          created_at?: string
          duration_ms?: number | null
          expected_hits?: string[] | null
          forbidden_hits?: string[] | null
          id?: string
          judge_notes?: string | null
          model?: string | null
          passed?: boolean
          scenario_id?: string
          score?: number | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_agent_drill_runs_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "voice_agent_drill_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_agent_drill_scenarios: {
        Row: {
          category: string
          created_at: string
          difficulty: number
          expected_keywords: string[]
          forbidden_keywords: string[]
          id: string
          is_active: boolean
          notes: string | null
          title: string
          updated_at: string
          user_message: string
        }
        Insert: {
          category: string
          created_at?: string
          difficulty?: number
          expected_keywords?: string[]
          forbidden_keywords?: string[]
          id?: string
          is_active?: boolean
          notes?: string | null
          title: string
          updated_at?: string
          user_message: string
        }
        Update: {
          category?: string
          created_at?: string
          difficulty?: number
          expected_keywords?: string[]
          forbidden_keywords?: string[]
          id?: string
          is_active?: boolean
          notes?: string | null
          title?: string
          updated_at?: string
          user_message?: string
        }
        Relationships: []
      }
      voice_agent_knowledge_chunks: {
        Row: {
          confidence: number | null
          content: string
          created_at: string
          id: string
          listing_type: string | null
          metadata: Json
          refreshed_at: string
          source: string
          tags: string[]
          zone: string | null
        }
        Insert: {
          confidence?: number | null
          content: string
          created_at?: string
          id?: string
          listing_type?: string | null
          metadata?: Json
          refreshed_at?: string
          source?: string
          tags?: string[]
          zone?: string | null
        }
        Update: {
          confidence?: number | null
          content?: string
          created_at?: string
          id?: string
          listing_type?: string | null
          metadata?: Json
          refreshed_at?: string
          source?: string
          tags?: string[]
          zone?: string | null
        }
        Relationships: []
      }
      voice_agent_kpi_snapshots: {
        Row: {
          computed_at: string
          day: string
          drift_vs_prev: number | null
          scheduled: number
          sentiment_avg: number | null
          success_rate: number
          top_objections: Json
          total_calls: number
        }
        Insert: {
          computed_at?: string
          day: string
          drift_vs_prev?: number | null
          scheduled?: number
          sentiment_avg?: number | null
          success_rate?: number
          top_objections?: Json
          total_calls?: number
        }
        Update: {
          computed_at?: string
          day?: string
          drift_vs_prev?: number | null
          scheduled?: number
          sentiment_avg?: number | null
          success_rate?: number
          top_objections?: Json
          total_calls?: number
        }
        Relationships: []
      }
      voice_agent_language_violations: {
        Row: {
          created_at: string
          id: string
          raw_reply: string | null
          reason: string | null
          session_id: string | null
          turn: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          raw_reply?: string | null
          reason?: string | null
          session_id?: string | null
          turn?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          raw_reply?: string | null
          reason?: string | null
          session_id?: string | null
          turn?: number | null
        }
        Relationships: []
      }
      voice_agent_playbook_addendum: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          auto_applied: boolean
          awaiting_approval: boolean
          created_at: string
          id: string
          is_active: boolean
          lesson: string
          profile_summary: string | null
          severity: string
          source_session_id: string | null
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          auto_applied?: boolean
          awaiting_approval?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          lesson: string
          profile_summary?: string | null
          severity?: string
          source_session_id?: string | null
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          auto_applied?: boolean
          awaiting_approval?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          lesson?: string
          profile_summary?: string | null
          severity?: string
          source_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_agent_playbook_addendum_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "voice_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_agent_safety_state: {
        Row: {
          calls_paused: boolean
          id: boolean
          last_check_at: string | null
          paused_reason: string | null
          sample_size: number | null
          success_rate_pct: number | null
          updated_at: string
        }
        Insert: {
          calls_paused?: boolean
          id?: boolean
          last_check_at?: string | null
          paused_reason?: string | null
          sample_size?: number | null
          success_rate_pct?: number | null
          updated_at?: string
        }
        Update: {
          calls_paused?: boolean
          id?: boolean
          last_check_at?: string | null
          paused_reason?: string | null
          sample_size?: number | null
          success_rate_pct?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      voice_agent_script_test_logs: {
        Row: {
          ab_variant: string | null
          call_duration_seconds: number | null
          created_at: string
          fallback_reason: string | null
          id: string
          is_test_call: boolean
          outcome: string | null
          script_id: string | null
          script_name: string | null
          script_version: number | null
          session_id: string | null
          status: string
          to_number: string | null
          transcript_turns: number | null
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          ab_variant?: string | null
          call_duration_seconds?: number | null
          created_at?: string
          fallback_reason?: string | null
          id?: string
          is_test_call?: boolean
          outcome?: string | null
          script_id?: string | null
          script_name?: string | null
          script_version?: number | null
          session_id?: string | null
          status?: string
          to_number?: string | null
          transcript_turns?: number | null
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          ab_variant?: string | null
          call_duration_seconds?: number | null
          created_at?: string
          fallback_reason?: string | null
          id?: string
          is_test_call?: boolean
          outcome?: string | null
          script_id?: string | null
          script_name?: string | null
          script_version?: number | null
          session_id?: string | null
          status?: string
          to_number?: string | null
          transcript_turns?: number | null
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_agent_script_test_logs_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "voice_agent_scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_agent_script_test_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "voice_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_agent_script_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          language: string
          name: string
          notes: string | null
          script_id: string
          system_prompt: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          language: string
          name: string
          notes?: string | null
          script_id: string
          system_prompt: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          name?: string
          notes?: string | null
          script_id?: string
          system_prompt?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "voice_agent_script_versions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "voice_agent_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_agent_scripts: {
        Row: {
          ab_traffic_split: number
          ab_variant_script_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          language: string
          name: string
          notes: string | null
          system_prompt: string
          updated_at: string
        }
        Insert: {
          ab_traffic_split?: number
          ab_variant_script_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name: string
          notes?: string | null
          system_prompt: string
          updated_at?: string
        }
        Update: {
          ab_traffic_split?: number
          ab_variant_script_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          notes?: string | null
          system_prompt?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_agent_scripts_ab_variant_script_id_fkey"
            columns: ["ab_variant_script_id"]
            isOneToOne: false
            referencedRelation: "voice_agent_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_agent_settings: {
        Row: {
          allowed_hours_end: number
          allowed_hours_start: number
          amd_enabled: boolean
          amd_timeout_seconds: number
          auto_dial_enabled: boolean
          autopilot_enabled: boolean
          autopilot_followup_auto_approve: boolean
          autopilot_followup_min_sentiment: string
          autopilot_last_tick_at: string | null
          autopilot_max_per_tick: number
          autopilot_mode: string
          autopilot_retention_enabled: boolean
          default_objective: string
          elevenlabs_min_score: number
          elevenlabs_model_id: string
          elevenlabs_voice_id: string
          id: number
          max_calls_per_day: number
          min_lead_score: number
          notify_email: string | null
          notify_email_enabled: boolean
          notify_whatsapp_enabled: boolean
          phone_lookup_enabled: boolean
          predictive_sort_enabled: boolean
          real_conversation_threshold_seconds: number
          skip_landline: boolean
          skip_voip: boolean
          tts_provider: string
          updated_at: string
          updated_by: string | null
          voice_similarity_boost: number
          voice_speed: number
          voice_stability: number
          voice_style: number
          voice_use_speaker_boost: boolean
        }
        Insert: {
          allowed_hours_end?: number
          allowed_hours_start?: number
          amd_enabled?: boolean
          amd_timeout_seconds?: number
          auto_dial_enabled?: boolean
          autopilot_enabled?: boolean
          autopilot_followup_auto_approve?: boolean
          autopilot_followup_min_sentiment?: string
          autopilot_last_tick_at?: string | null
          autopilot_max_per_tick?: number
          autopilot_mode?: string
          autopilot_retention_enabled?: boolean
          default_objective?: string
          elevenlabs_min_score?: number
          elevenlabs_model_id?: string
          elevenlabs_voice_id?: string
          id?: number
          max_calls_per_day?: number
          min_lead_score?: number
          notify_email?: string | null
          notify_email_enabled?: boolean
          notify_whatsapp_enabled?: boolean
          phone_lookup_enabled?: boolean
          predictive_sort_enabled?: boolean
          real_conversation_threshold_seconds?: number
          skip_landline?: boolean
          skip_voip?: boolean
          tts_provider?: string
          updated_at?: string
          updated_by?: string | null
          voice_similarity_boost?: number
          voice_speed?: number
          voice_stability?: number
          voice_style?: number
          voice_use_speaker_boost?: boolean
        }
        Update: {
          allowed_hours_end?: number
          allowed_hours_start?: number
          amd_enabled?: boolean
          amd_timeout_seconds?: number
          auto_dial_enabled?: boolean
          autopilot_enabled?: boolean
          autopilot_followup_auto_approve?: boolean
          autopilot_followup_min_sentiment?: string
          autopilot_last_tick_at?: string | null
          autopilot_max_per_tick?: number
          autopilot_mode?: string
          autopilot_retention_enabled?: boolean
          default_objective?: string
          elevenlabs_min_score?: number
          elevenlabs_model_id?: string
          elevenlabs_voice_id?: string
          id?: number
          max_calls_per_day?: number
          min_lead_score?: number
          notify_email?: string | null
          notify_email_enabled?: boolean
          notify_whatsapp_enabled?: boolean
          phone_lookup_enabled?: boolean
          predictive_sort_enabled?: boolean
          real_conversation_threshold_seconds?: number
          skip_landline?: boolean
          skip_voip?: boolean
          tts_provider?: string
          updated_at?: string
          updated_by?: string | null
          voice_similarity_boost?: number
          voice_speed?: number
          voice_stability?: number
          voice_style?: number
          voice_use_speaker_boost?: boolean
        }
        Relationships: []
      }
      voice_agent_tts_errors: {
        Row: {
          created_at: string
          error_type: string
          http_status: number | null
          id: string
          latency_ms: number | null
          message: string | null
          session_id: string | null
          source: string
          text_snippet: string | null
          voice_id: string | null
        }
        Insert: {
          created_at?: string
          error_type: string
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          message?: string | null
          session_id?: string | null
          source?: string
          text_snippet?: string | null
          voice_id?: string | null
        }
        Update: {
          created_at?: string
          error_type?: string
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          message?: string | null
          session_id?: string | null
          source?: string
          text_snippet?: string | null
          voice_id?: string | null
        }
        Relationships: []
      }
      voice_autonomy_runs: {
        Row: {
          ab_tests_evaluated: number
          calls_initiated: number
          details: Json
          drills_executed: number
          ended_at: string | null
          error: string | null
          followups_auto_approved: number
          followups_pending_review: number
          id: string
          prospects_ingested: number
          retention_ingested: number
          source: string
          started_at: string
          status: string
        }
        Insert: {
          ab_tests_evaluated?: number
          calls_initiated?: number
          details?: Json
          drills_executed?: number
          ended_at?: string | null
          error?: string | null
          followups_auto_approved?: number
          followups_pending_review?: number
          id?: string
          prospects_ingested?: number
          retention_ingested?: number
          source?: string
          started_at?: string
          status?: string
        }
        Update: {
          ab_tests_evaluated?: number
          calls_initiated?: number
          details?: Json
          drills_executed?: number
          ended_at?: string | null
          error?: string | null
          followups_auto_approved?: number
          followups_pending_review?: number
          id?: string
          prospects_ingested?: number
          retention_ingested?: number
          source?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      voice_call_sessions: {
        Row: {
          ai_outcome: string | null
          ai_sentiment: string | null
          ai_summary: string | null
          amd_hangup: boolean | null
          answered_by: string | null
          appointment_scheduled_at: string | null
          call_duration_seconds: number | null
          call_objective: string | null
          caller_profile_id: string | null
          clarity_score: number | null
          cost_estimate_usd: number | null
          created_at: string
          debug_log: Json
          detected_language: string | null
          direction: string
          ended_at: string | null
          error_message: string | null
          extracted_entities: Json
          followup_draft: Json | null
          followup_status: string | null
          from_number: string | null
          id: string
          initiated_by: string | null
          is_voicemail: boolean
          language_retry_count: number
          language_retry_of: string | null
          lead_id: string | null
          next_action: string | null
          prospect_listing_id: string | null
          recording_url: string | null
          scraper_lead_id: string | null
          started_at: string | null
          status: string
          to_number: string
          transcript: Json | null
          tts_errors_count: number
          tts_latency_ms_avg: number | null
          twilio_call_sid: string | null
          twilio_failure_reason: string | null
          updated_at: string
          voice_agent_prompt: string | null
        }
        Insert: {
          ai_outcome?: string | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          amd_hangup?: boolean | null
          answered_by?: string | null
          appointment_scheduled_at?: string | null
          call_duration_seconds?: number | null
          call_objective?: string | null
          caller_profile_id?: string | null
          clarity_score?: number | null
          cost_estimate_usd?: number | null
          created_at?: string
          debug_log?: Json
          detected_language?: string | null
          direction?: string
          ended_at?: string | null
          error_message?: string | null
          extracted_entities?: Json
          followup_draft?: Json | null
          followup_status?: string | null
          from_number?: string | null
          id?: string
          initiated_by?: string | null
          is_voicemail?: boolean
          language_retry_count?: number
          language_retry_of?: string | null
          lead_id?: string | null
          next_action?: string | null
          prospect_listing_id?: string | null
          recording_url?: string | null
          scraper_lead_id?: string | null
          started_at?: string | null
          status?: string
          to_number: string
          transcript?: Json | null
          tts_errors_count?: number
          tts_latency_ms_avg?: number | null
          twilio_call_sid?: string | null
          twilio_failure_reason?: string | null
          updated_at?: string
          voice_agent_prompt?: string | null
        }
        Update: {
          ai_outcome?: string | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          amd_hangup?: boolean | null
          answered_by?: string | null
          appointment_scheduled_at?: string | null
          call_duration_seconds?: number | null
          call_objective?: string | null
          caller_profile_id?: string | null
          clarity_score?: number | null
          cost_estimate_usd?: number | null
          created_at?: string
          debug_log?: Json
          detected_language?: string | null
          direction?: string
          ended_at?: string | null
          error_message?: string | null
          extracted_entities?: Json
          followup_draft?: Json | null
          followup_status?: string | null
          from_number?: string | null
          id?: string
          initiated_by?: string | null
          is_voicemail?: boolean
          language_retry_count?: number
          language_retry_of?: string | null
          lead_id?: string | null
          next_action?: string | null
          prospect_listing_id?: string | null
          recording_url?: string | null
          scraper_lead_id?: string | null
          started_at?: string | null
          status?: string
          to_number?: string
          transcript?: Json | null
          tts_errors_count?: number
          tts_latency_ms_avg?: number | null
          twilio_call_sid?: string | null
          twilio_failure_reason?: string | null
          updated_at?: string
          voice_agent_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_call_sessions_caller_profile_id_fkey"
            columns: ["caller_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_caller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_call_sessions_language_retry_of_fkey"
            columns: ["language_retry_of"]
            isOneToOne: false
            referencedRelation: "voice_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_call_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_call_sessions_prospect_listing_id_fkey"
            columns: ["prospect_listing_id"]
            isOneToOne: false
            referencedRelation: "prospect_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_call_sessions_scraper_lead_id_fkey"
            columns: ["scraper_lead_id"]
            isOneToOne: false
            referencedRelation: "scraper_leads_archive_2026"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_caller_audit_log: {
        Row: {
          action: string
          actor_label: string | null
          actor_user_id: string | null
          created_at: string
          details: Json | null
          id: string
          phone_normalized: string | null
          profile_id: string | null
        }
        Insert: {
          action: string
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          phone_normalized?: string | null
          profile_id?: string | null
        }
        Update: {
          action?: string
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          phone_normalized?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_caller_audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "voice_caller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_caller_profiles: {
        Row: {
          archived_at: string | null
          budget_max: number | null
          budget_min: number | null
          call_count: number
          consecutive_no_answer: number
          consent_remember: boolean
          created_at: string
          display_name: string | null
          id: string
          is_ghosting: boolean
          last_call_at: string | null
          last_no_answer_at: string | null
          last_objection: string | null
          last_session_id: string | null
          mentioned_property_ids: string[] | null
          notes: string | null
          phone_normalized: string
          preferred_branch: string | null
          preferred_zones: string[] | null
          property_types: string[] | null
          rooms_max: number | null
          rooms_min: number | null
          timeline: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          budget_max?: number | null
          budget_min?: number | null
          call_count?: number
          consecutive_no_answer?: number
          consent_remember?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          is_ghosting?: boolean
          last_call_at?: string | null
          last_no_answer_at?: string | null
          last_objection?: string | null
          last_session_id?: string | null
          mentioned_property_ids?: string[] | null
          notes?: string | null
          phone_normalized: string
          preferred_branch?: string | null
          preferred_zones?: string[] | null
          property_types?: string[] | null
          rooms_max?: number | null
          rooms_min?: number | null
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          budget_max?: number | null
          budget_min?: number | null
          call_count?: number
          consecutive_no_answer?: number
          consent_remember?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          is_ghosting?: boolean
          last_call_at?: string | null
          last_no_answer_at?: string | null
          last_objection?: string | null
          last_session_id?: string | null
          mentioned_property_ids?: string[] | null
          notes?: string | null
          phone_normalized?: string
          preferred_branch?: string | null
          preferred_zones?: string[] | null
          property_types?: string[] | null
          rooms_max?: number | null
          rooms_min?: number | null
          timeline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      voice_campaign_runs: {
        Row: {
          cancelled: boolean
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          dialed_count: number
          id: string
          status: string
          total_targets: number
          updated_at: string
          zone: string | null
        }
        Insert: {
          cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          dialed_count?: number
          id?: string
          status?: string
          total_targets?: number
          updated_at?: string
          zone?: string | null
        }
        Update: {
          cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          dialed_count?: number
          id?: string
          status?: string
          total_targets?: number
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      voice_ghosting_queue: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          caller_profile_id: string | null
          context_summary: string | null
          created_at: string
          draft_message: string
          id: string
          no_answer_count: number
          phone_normalized: string | null
          prospect_id: string | null
          rejected_reason: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          caller_profile_id?: string | null
          context_summary?: string | null
          created_at?: string
          draft_message: string
          id?: string
          no_answer_count?: number
          phone_normalized?: string | null
          prospect_id?: string | null
          rejected_reason?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          caller_profile_id?: string | null
          context_summary?: string | null
          created_at?: string
          draft_message?: string
          id?: string
          no_answer_count?: number
          phone_normalized?: string | null
          prospect_id?: string | null
          rejected_reason?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_ghosting_queue_caller_profile_id_fkey"
            columns: ["caller_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_caller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_ghosting_queue_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospect_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_latency_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          avg_latency_ms: number
          call_session_ids: string[] | null
          consecutive_calls: number
          details: Json | null
          id: number
          triggered_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          avg_latency_ms: number
          call_session_ids?: string[] | null
          consecutive_calls: number
          details?: Json | null
          id?: number
          triggered_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          avg_latency_ms?: number
          call_session_ids?: string[] | null
          consecutive_calls?: number
          details?: Json | null
          id?: number
          triggered_at?: string
        }
        Relationships: []
      }
      voice_lead_cluster_assignments: {
        Row: {
          cluster_id: string
          created_at: string
          prospect_id: string
          rationale: string | null
        }
        Insert: {
          cluster_id: string
          created_at?: string
          prospect_id: string
          rationale?: string | null
        }
        Update: {
          cluster_id?: string
          created_at?: string
          prospect_id?: string
          rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_lead_cluster_assignments_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "voice_lead_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_lead_cluster_assignments_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospect_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_lead_clusters: {
        Row: {
          approach_tone: string | null
          brief: string
          created_at: string
          created_by: string | null
          criteria: Json
          id: string
          is_active: boolean
          label: string
          lead_count: number
          updated_at: string
        }
        Insert: {
          approach_tone?: string | null
          brief: string
          created_at?: string
          created_by?: string | null
          criteria?: Json
          id?: string
          is_active?: boolean
          label: string
          lead_count?: number
          updated_at?: string
        }
        Update: {
          approach_tone?: string | null
          brief?: string
          created_at?: string
          created_by?: string | null
          criteria?: Json
          id?: string
          is_active?: boolean
          label?: string
          lead_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      voice_memory_lookup_metrics: {
        Row: {
          created_at: string
          hit: boolean
          id: number
          is_slow: boolean | null
          lookup_ms: number
          phone_normalized: string | null
          session_id: string | null
          turn: number | null
        }
        Insert: {
          created_at?: string
          hit?: boolean
          id?: number
          is_slow?: boolean | null
          lookup_ms: number
          phone_normalized?: string | null
          session_id?: string | null
          turn?: number | null
        }
        Update: {
          created_at?: string
          hit?: boolean
          id?: number
          is_slow?: boolean | null
          lookup_ms?: number
          phone_normalized?: string | null
          session_id?: string | null
          turn?: number | null
        }
        Relationships: []
      }
      voice_pronunciation_lexicon: {
        Row: {
          case_sensitive: boolean
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          original: string
          phonetic: string
          updated_at: string
        }
        Insert: {
          case_sensitive?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          original: string
          phonetic: string
          updated_at?: string
        }
        Update: {
          case_sensitive?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          original?: string
          phonetic?: string
          updated_at?: string
        }
        Relationships: []
      }
      voice_script_ab_tests: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          hypothesis: string | null
          id: string
          metrics: Json | null
          name: string
          started_at: string
          status: string
          variant_a_script_id: string | null
          variant_b_script_id: string | null
          winner: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          metrics?: Json | null
          name: string
          started_at?: string
          status?: string
          variant_a_script_id?: string | null
          variant_b_script_id?: string | null
          winner?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          metrics?: Json | null
          name?: string
          started_at?: string
          status?: string
          variant_a_script_id?: string | null
          variant_b_script_id?: string | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_script_ab_tests_variant_a_script_id_fkey"
            columns: ["variant_a_script_id"]
            isOneToOne: false
            referencedRelation: "voice_agent_scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_script_ab_tests_variant_b_script_id_fkey"
            columns: ["variant_b_script_id"]
            isOneToOne: false
            referencedRelation: "voice_agent_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_tts_context_cache: {
        Row: {
          audio_url: string | null
          category: string | null
          context_key: string
          generated_at: string
          hits: number
          last_used_at: string | null
          summary: string | null
          updated_at: string
          voice_id: string | null
          zone: string | null
        }
        Insert: {
          audio_url?: string | null
          category?: string | null
          context_key: string
          generated_at?: string
          hits?: number
          last_used_at?: string | null
          summary?: string | null
          updated_at?: string
          voice_id?: string | null
          zone?: string | null
        }
        Update: {
          audio_url?: string | null
          category?: string | null
          context_key?: string
          generated_at?: string
          hits?: number
          last_used_at?: string | null
          summary?: string | null
          updated_at?: string
          voice_id?: string | null
          zone?: string | null
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
      property_listings_public: {
        Row: {
          annual_operating_costs: number | null
          bathrooms: number | null
          created_at: string | null
          description: string | null
          estimated_monthly_revenue: number | null
          id: string | null
          images: string[] | null
          initial_setup_cost: number | null
          investment_score: number | null
          listing_category:
            | Database["public"]["Enums"]["listing_category"]
            | null
          location: string | null
          price: number | null
          property_type: string | null
          roi_percentage: number | null
          rooms: number | null
          size: number | null
          status: Database["public"]["Enums"]["listing_status"] | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          annual_operating_costs?: number | null
          bathrooms?: number | null
          created_at?: string | null
          description?: string | null
          estimated_monthly_revenue?: number | null
          id?: string | null
          images?: string[] | null
          initial_setup_cost?: number | null
          investment_score?: number | null
          listing_category?:
            | Database["public"]["Enums"]["listing_category"]
            | null
          location?: string | null
          price?: number | null
          property_type?: string | null
          roi_percentage?: number | null
          rooms?: number | null
          size?: number | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          annual_operating_costs?: number | null
          bathrooms?: number | null
          created_at?: string | null
          description?: string | null
          estimated_monthly_revenue?: number | null
          id?: string | null
          images?: string[] | null
          initial_setup_cost?: number | null
          investment_score?: number | null
          listing_category?:
            | Database["public"]["Enums"]["listing_category"]
            | null
          location?: string | null
          price?: number | null
          property_type?: string | null
          roi_percentage?: number | null
          rooms?: number | null
          size?: number | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      prospect_injection_rejection_stats: {
        Row: {
          count: number | null
          day: string | null
          rejection_reason: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      anonymize_ip_address: { Args: { ip_address: string }; Returns: string }
      auto_blacklist_prospect: {
        Args: { p_prospect_id: string; p_reasons?: string[]; p_score: number }
        Returns: Json
      }
      automation_complete_run: {
        Args: {
          _duration_ms?: number
          _error?: string
          _job_key: string
          _payload?: Json
          _status?: string
          _success: boolean
          _triggered_by?: string
        }
        Returns: undefined
      }
      automation_runs_cleanup: {
        Args: { _retention_days?: number }
        Returns: number
      }
      bulk_archive_detected_agencies: { Args: never; Returns: Json }
      check_and_award_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_appointment_phone_rate_limit: {
        Args: { p_phone: string }
        Returns: boolean
      }
      check_cta_rate_limit: { Args: { p_session_id: string }; Returns: boolean }
      cleanup_old_e2e_runs: { Args: never; Returns: number }
      cleanup_old_tracking_data: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      extract_url_domain: { Args: { p_url: string }; Returns: string }
      get_blog_hub_impressions: {
        Args: { p_days?: number }
        Returns: {
          geo_location: string
          impressions: number
        }[]
      }
      get_blog_hub_impressions_range: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          geo_location: string
          impressions: number
        }[]
      }
      get_cron_reconcile_secret: { Args: never; Returns: string }
      get_owner_property_reviews: {
        Args: { p_property_id?: string }
        Returns: {
          admin_reply: string
          admin_reply_at: string
          booking_id: string
          booking_review_id: string
          content: string
          created_at: string
          guest_country: string
          guest_name: string
          id: string
          is_published: boolean
          property_id: string
          rating: number
          review_date: string
          source: string
          title: string
          updated_at: string
        }[]
      }
      get_prospect_injection_daily_summary: {
        Args: { p_days?: number }
        Returns: {
          day_label: string
          top_reason: string
          total_rejected: number
          unique_platforms: number
        }[]
      }
      get_prospect_injection_rejection_by_platform: {
        Args: { p_days?: number }
        Returns: {
          count_period: number
          rejection_reason: string
          source_platform: string
        }[]
      }
      get_prospect_injection_rejection_details: {
        Args: {
          p_days: number
          p_limit: number
          p_platform?: string
          p_reason: string
        }
        Returns: {
          contact_phone: string
          dedup_key: string
          id: string
          phone_normalized: string
          price: number
          rejection_reason: string
          rooms: number
          scraped_at: string
          size: number
          source_platform: string
          source_url: string
          title: string
          zone: string
        }[]
      }
      get_prospect_injection_rejection_summary: {
        Args: { p_days?: number }
        Returns: {
          count_24h: number
          count_period: number
          rejection_reason: string
        }[]
      }
      get_prospect_injection_rejection_trend: {
        Args: { p_days?: number }
        Returns: {
          count: number
          day_label: string
          rejection_reason: string
        }[]
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
      get_public_property_reviews: {
        Args: { p_property_id?: string }
        Returns: {
          admin_reply: string
          admin_reply_at: string
          booking_id: string
          booking_review_id: string
          content: string
          created_at: string
          guest_country: string
          guest_name: string
          id: string
          is_published: boolean
          property_id: string
          rating: number
          review_date: string
          source: string
          title: string
          updated_at: string
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
      log_cron_run: {
        Args: {
          p_details?: Json
          p_duration_ms?: number
          p_error?: string
          p_job: string
          p_status: string
        }
        Returns: number
      }
      mark_prospect_invalid_number: {
        Args: { p_prospect_id: string; p_reason: string }
        Returns: undefined
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
      normalize_ro_phone: { Args: { p: string }; Returns: string }
      normalize_zone_key: {
        Args: { p_location: string; p_zone: string }
        Returns: string
      }
      process_voice_call_result: {
        Args: {
          p_is_voicemail: boolean
          p_prospect_id: string
          p_status: string
          p_twilio_reason: string
        }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_owner_code: { Args: { p_code: string }; Returns: Json }
      reset_prospect_invalid_status: {
        Args: { p_prospect_id: string }
        Returns: Json
      }
      validate_chat_session: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      voice_caller_archive_stale: { Args: never; Returns: number }
    }
    Enums: {
      agency_keyword_type: "hard" | "soft" | "owner"
      app_role: "admin" | "moderator" | "user" | "owner"
      lead_lifecycle_status:
        | "new"
        | "scoring"
        | "calling"
        | "interested"
        | "rejected"
        | "posted"
        | "callback"
        | "pending_credentials"
        | "failed"
      listing_category: "vanzare" | "inchiriere" | "regim_hotelier"
      listing_status: "pending_inspection" | "approved" | "rejected"
      offer_category: "vanzare" | "inchiriere" | "hotelier"
      scraper_lead_category: "sale" | "rent" | "hotel_management"
      scraper_lead_status:
        | "new"
        | "calling"
        | "interested"
        | "rejected"
        | "posted"
      seo_local_rec_status_enum: "open" | "doing" | "done"
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
      agency_keyword_type: ["hard", "soft", "owner"],
      app_role: ["admin", "moderator", "user", "owner"],
      lead_lifecycle_status: [
        "new",
        "scoring",
        "calling",
        "interested",
        "rejected",
        "posted",
        "callback",
        "pending_credentials",
        "failed",
      ],
      listing_category: ["vanzare", "inchiriere", "regim_hotelier"],
      listing_status: ["pending_inspection", "approved", "rejected"],
      offer_category: ["vanzare", "inchiriere", "hotelier"],
      scraper_lead_category: ["sale", "rent", "hotel_management"],
      scraper_lead_status: [
        "new",
        "calling",
        "interested",
        "rejected",
        "posted",
      ],
      seo_local_rec_status_enum: ["open", "doing", "done"],
    },
  },
} as const
