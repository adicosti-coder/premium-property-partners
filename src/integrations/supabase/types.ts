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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_404_logs: {
        Row: {
          first_seen_at: string
          hits: number
          id: string
          last_seen_at: string
          path: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          first_seen_at?: string
          hits?: number
          id?: string
          last_seen_at?: string
          path: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          first_seen_at?: string
          hits?: number
          id?: string
          last_seen_at?: string
          path?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_access_logs: {
        Row: {
          accessed_at: string
          action_type: string
          admin_user_id: string
          id: string
          ip_address: string | null
          record_id: string | null
          revealed_field: string | null
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
          revealed_field?: string | null
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
          revealed_field?: string | null
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
      admin_email_failures: {
        Row: {
          acknowledged_at: string | null
          contract_id: string | null
          created_at: string
          error_message: string | null
          html_body: string | null
          http_status: number | null
          id: string
          last_retry_at: string | null
          last_retry_error: string | null
          lead_id: string | null
          recipient: string
          resent_at: string | null
          retry_count: number
          sender: string | null
          source: string
          subject: string
        }
        Insert: {
          acknowledged_at?: string | null
          contract_id?: string | null
          created_at?: string
          error_message?: string | null
          html_body?: string | null
          http_status?: number | null
          id?: string
          last_retry_at?: string | null
          last_retry_error?: string | null
          lead_id?: string | null
          recipient: string
          resent_at?: string | null
          retry_count?: number
          sender?: string | null
          source?: string
          subject: string
        }
        Update: {
          acknowledged_at?: string | null
          contract_id?: string | null
          created_at?: string
          error_message?: string | null
          html_body?: string | null
          http_status?: number | null
          id?: string
          last_retry_at?: string | null
          last_retry_error?: string | null
          lead_id?: string | null
          recipient?: string
          resent_at?: string | null
          retry_count?: number
          sender?: string | null
          source?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_email_failures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "owner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_email_failures_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_mfa_sessions: {
        Row: {
          expires_at: string
          updated_at: string
          user_agent: string | null
          user_id: string
          verified_at: string
        }
        Insert: {
          expires_at: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
          verified_at?: string
        }
        Update: {
          expires_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          verified_at?: string
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
      auto_publish_logs: {
        Row: {
          articles_published: number
          created_at: string
          error_message: string | null
          id: string
          indexnow_request_id: number | null
          indexnow_status: string
          published_slugs: string[]
          ran_at: string
        }
        Insert: {
          articles_published?: number
          created_at?: string
          error_message?: string | null
          id?: string
          indexnow_request_id?: number | null
          indexnow_status?: string
          published_slugs?: string[]
          ran_at?: string
        }
        Update: {
          articles_published?: number
          created_at?: string
          error_message?: string | null
          id?: string
          indexnow_request_id?: number | null
          indexnow_status?: string
          published_slugs?: string[]
          ran_at?: string
        }
        Relationships: []
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
          resolved_at: string | null
          resolved_by: string | null
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
          resolved_at?: string | null
          resolved_by?: string | null
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
          resolved_at?: string | null
          resolved_by?: string | null
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
      automation_live_logs: {
        Row: {
          created_at: string
          details: Json
          id: string
          job_key: string | null
          level: string
          message: string
          source: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          job_key?: string | null
          level?: string
          message: string
          source: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          job_key?: string | null
          level?: string
          message?: string
          source?: string
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
          retry_count: number
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
          retry_count?: number
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
          retry_count?: number
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
          orchestrator_config: Json
          paused_reason: string | null
          self_healing_config: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: boolean
          orchestrator_config?: Json
          paused_reason?: string | null
          self_healing_config?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: boolean
          orchestrator_config?: Json
          paused_reason?: string | null
          self_healing_config?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      blog_ai_snapshots: {
        Row: {
          ai_model: string | null
          applied_changes: Json
          article_id: string
          confidence_score: number | null
          created_at: string
          id: string
          previous_state: Json
          rationale: string | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          triggered_by: string
        }
        Insert: {
          ai_model?: string | null
          applied_changes?: Json
          article_id: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          previous_state: Json
          rationale?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          triggered_by?: string
        }
        Update: {
          ai_model?: string | null
          applied_changes?: Json
          article_id?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          previous_state?: Json
          rationale?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_ai_snapshots_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
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
          ai_confidence_score: number | null
          ai_last_optimized_at: string | null
          ai_pending_review: boolean
          author_name: string
          category: string
          content: string
          content_en: string | null
          cover_image: string | null
          created_at: string
          excerpt: string
          excerpt_en: string | null
          faq_items: Json | null
          geo_location: string | null
          id: string
          is_premium: boolean
          is_published: boolean
          main_image_url: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          scheduled_for: string | null
          slug: string
          tags: string[]
          title: string
          title_en: string | null
          translation_locked: boolean
          updated_at: string
          view_count: number
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_last_optimized_at?: string | null
          ai_pending_review?: boolean
          author_name?: string
          category?: string
          content: string
          content_en?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt: string
          excerpt_en?: string | null
          faq_items?: Json | null
          geo_location?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          main_image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          slug: string
          tags?: string[]
          title: string
          title_en?: string | null
          translation_locked?: boolean
          updated_at?: string
          view_count?: number
        }
        Update: {
          ai_confidence_score?: number | null
          ai_last_optimized_at?: string | null
          ai_pending_review?: boolean
          author_name?: string
          category?: string
          content?: string
          content_en?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string
          excerpt_en?: string | null
          faq_items?: Json | null
          geo_location?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          main_image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          slug?: string
          tags?: string[]
          title?: string
          title_en?: string | null
          translation_locked?: boolean
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
          is_hidden: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
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
      booking_requests: {
        Row: {
          admin_email_sent: boolean
          admin_notes: string | null
          check_in: string
          check_out: string
          country: string | null
          created_at: string
          discount_code: string | null
          estimated_total: number | null
          guest_email: string
          guest_email_sent: boolean
          guest_name: string
          guest_phone: string
          guests: number
          id: string
          message: string | null
          nights: number
          notified_at: string | null
          property_name: string
          property_ref_id: number | null
          property_slug: string | null
          reference: string
          source: string
          status: string
          updated_at: string
          utm: Json | null
        }
        Insert: {
          admin_email_sent?: boolean
          admin_notes?: string | null
          check_in: string
          check_out: string
          country?: string | null
          created_at?: string
          discount_code?: string | null
          estimated_total?: number | null
          guest_email: string
          guest_email_sent?: boolean
          guest_name: string
          guest_phone: string
          guests?: number
          id?: string
          message?: string | null
          nights?: number
          notified_at?: string | null
          property_name: string
          property_ref_id?: number | null
          property_slug?: string | null
          reference: string
          source?: string
          status?: string
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          admin_email_sent?: boolean
          admin_notes?: string | null
          check_in?: string
          check_out?: string
          country?: string | null
          created_at?: string
          discount_code?: string | null
          estimated_total?: number | null
          guest_email?: string
          guest_email_sent?: boolean
          guest_name?: string
          guest_phone?: string
          guests?: number
          id?: string
          message?: string | null
          nights?: number
          notified_at?: string | null
          property_name?: string
          property_ref_id?: number | null
          property_slug?: string | null
          reference?: string
          source?: string
          status?: string
          updated_at?: string
          utm?: Json | null
        }
        Relationships: []
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
      capi_delivery_log: {
        Row: {
          created_at: string
          dry_run: boolean
          error_detail: string | null
          event_id: string
          event_name: string
          event_source_url: string | null
          http_status: number | null
          id: string
          ok: boolean
          outcome: string
        }
        Insert: {
          created_at?: string
          dry_run?: boolean
          error_detail?: string | null
          event_id: string
          event_name: string
          event_source_url?: string | null
          http_status?: number | null
          id?: string
          ok?: boolean
          outcome?: string
        }
        Update: {
          created_at?: string
          dry_run?: boolean
          error_detail?: string | null
          event_id?: string
          event_name?: string
          event_source_url?: string | null
          http_status?: number | null
          id?: string
          ok?: boolean
          outcome?: string
        }
        Relationships: []
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
          confirmation_sent_at: string | null
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
          reminder_sent_at: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          webhook_sent: boolean | null
        }
        Insert: {
          appointment_type: string
          confirmation_sent_at?: string | null
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
          reminder_sent_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          webhook_sent?: boolean | null
        }
        Update: {
          appointment_type?: string
          confirmation_sent_at?: string | null
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
          reminder_sent_at?: string | null
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
      conversion_test_runs: {
        Row: {
          capi_event_id: string | null
          capi_http_status: number | null
          capi_response: Json | null
          created_at: string
          created_by: string | null
          datalayer_fired: boolean
          dry_run: boolean
          event_id: string
          event_id_matched: boolean
          event_name: string
          ga4_fired: boolean
          hashed_fields: string[]
          id: string
          notes: string | null
        }
        Insert: {
          capi_event_id?: string | null
          capi_http_status?: number | null
          capi_response?: Json | null
          created_at?: string
          created_by?: string | null
          datalayer_fired?: boolean
          dry_run?: boolean
          event_id: string
          event_id_matched?: boolean
          event_name: string
          ga4_fired?: boolean
          hashed_fields?: string[]
          id?: string
          notes?: string | null
        }
        Update: {
          capi_event_id?: string | null
          capi_http_status?: number | null
          capi_response?: Json | null
          created_at?: string
          created_by?: string | null
          datalayer_fired?: boolean
          dry_run?: boolean
          event_id?: string
          event_id_matched?: boolean
          event_name?: string
          ga4_fired?: boolean
          hashed_fields?: string[]
          id?: string
          notes?: string | null
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
      email_domain_checks: {
        Row: {
          auto_retried: number
          checked_at: string
          delegation_note: string | null
          delegation_serving: boolean
          details: Json | null
          dns_healthy: boolean
          domain: string
          id: string
          pending_emails: number
          source: string
        }
        Insert: {
          auto_retried?: number
          checked_at?: string
          delegation_note?: string | null
          delegation_serving?: boolean
          details?: Json | null
          dns_healthy?: boolean
          domain: string
          id?: string
          pending_emails?: number
          source?: string
        }
        Update: {
          auto_retried?: number
          checked_at?: string
          delegation_note?: string | null
          delegation_serving?: boolean
          details?: Json | null
          dns_healthy?: boolean
          domain?: string
          id?: string
          pending_emails?: number
          source?: string
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
          idempotency_key: string | null
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
          idempotency_key?: string | null
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
          idempotency_key?: string | null
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
      frontend_error_logs: {
        Row: {
          correlation_id: string
          created_at: string
          id: string
          level: string
          message: string
          meta: Json | null
          route: string | null
          scope: string
          user_agent: string | null
        }
        Insert: {
          correlation_id: string
          created_at?: string
          id?: string
          level?: string
          message: string
          meta?: Json | null
          route?: string | null
          scope: string
          user_agent?: string | null
        }
        Update: {
          correlation_id?: string
          created_at?: string
          id?: string
          level?: string
          message?: string
          meta?: Json | null
          route?: string | null
          scope?: string
          user_agent?: string | null
        }
        Relationships: []
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
      indexnow_pings: {
        Row: {
          actual_indexing_status: Database["public"]["Enums"]["indexnow_actual_status"]
          batch_size: number
          created_at: string
          error: string | null
          host: string
          http_status: number | null
          id: string
          last_verified_at: string | null
          priority: number
          response_body: string | null
          success: boolean
          triggered_by: string | null
          url: string
        }
        Insert: {
          actual_indexing_status?: Database["public"]["Enums"]["indexnow_actual_status"]
          batch_size?: number
          created_at?: string
          error?: string | null
          host: string
          http_status?: number | null
          id?: string
          last_verified_at?: string | null
          priority?: number
          response_body?: string | null
          success?: boolean
          triggered_by?: string | null
          url: string
        }
        Update: {
          actual_indexing_status?: Database["public"]["Enums"]["indexnow_actual_status"]
          batch_size?: number
          created_at?: string
          error?: string | null
          host?: string
          http_status?: number | null
          id?: string
          last_verified_at?: string | null
          priority?: number
          response_body?: string | null
          success?: boolean
          triggered_by?: string | null
          url?: string
        }
        Relationships: []
      }
      indexnow_reindex_queue: {
        Row: {
          active: boolean
          created_at: string
          id: string
          last_pinged_at: string | null
          next_ping_after: string
          ping_count: number
          priority: number
          reason: string | null
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          last_pinged_at?: string | null
          next_ping_after?: string
          ping_count?: number
          priority?: number
          reason?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          last_pinged_at?: string | null
          next_ping_after?: string
          ping_count?: number
          priority?: number
          reason?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      investment_analyses: {
        Row: {
          amenajari: number
          chirie: number
          created_at: string
          created_by: string | null
          id: string
          model: string
          nume: string
          pret: number
          result: Json
          suprafata: number
          updated_at: string
        }
        Insert: {
          amenajari?: number
          chirie: number
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string
          nume: string
          pret: number
          result: Json
          suprafata: number
          updated_at?: string
        }
        Update: {
          amenajari?: number
          chirie?: number
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string
          nume?: string
          pret?: number
          result?: Json
          suprafata?: number
          updated_at?: string
        }
        Relationships: []
      }
      keyword_radar_queries: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          keyword_normalized: string | null
          last_error: string | null
          last_scanned_at: string | null
          metadata: Json
          platforms: string[]
          priority_score: number
          results_count: number
          scan_count: number
          source: string
          total_results_count: number
          updated_at: string
          volume: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          keyword_normalized?: string | null
          last_error?: string | null
          last_scanned_at?: string | null
          metadata?: Json
          platforms?: string[]
          priority_score?: number
          results_count?: number
          scan_count?: number
          source: string
          total_results_count?: number
          updated_at?: string
          volume?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          keyword_normalized?: string | null
          last_error?: string | null
          last_scanned_at?: string | null
          metadata?: Json
          platforms?: string[]
          priority_score?: number
          results_count?: number
          scan_count?: number
          source?: string
          total_results_count?: number
          updated_at?: string
          volume?: number
        }
        Relationships: []
      }
      keyword_radar_runs: {
        Row: {
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          run_type: string
          started_at: string
          stats: Json
          status: string
          triggered_by: string
        }
        Insert: {
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          run_type: string
          started_at?: string
          stats?: Json
          status?: string
          triggered_by?: string
        }
        Update: {
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          run_type?: string
          started_at?: string
          stats?: Json
          status?: string
          triggered_by?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          actor: string | null
          attempt: number | null
          created_at: string
          duration_ms: number | null
          event_type: string
          id: string
          lead_id: string
          message: string | null
          metadata: Json
          status: string
        }
        Insert: {
          actor?: string | null
          attempt?: number | null
          created_at?: string
          duration_ms?: number | null
          event_type: string
          id?: string
          lead_id: string
          message?: string | null
          metadata?: Json
          status?: string
        }
        Update: {
          actor?: string | null
          attempt?: number | null
          created_at?: string
          duration_ms?: number | null
          event_type?: string
          id?: string
          lead_id?: string
          message?: string | null
          metadata?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          activity_history: Json
          alert_attempts: number
          alert_last_error: string | null
          alert_sent_at: string | null
          alert_status: string | null
          anonymized_at: string | null
          calculated_net_profit: number | null
          calculated_yearly_profit: number | null
          created_at: string
          crm_next_retry_at: string | null
          crm_status: string
          crm_sync_attempts: number
          crm_sync_error: string | null
          crm_sync_status: string | null
          crm_synced_at: string | null
          email: string | null
          engagement_status: string
          follow_up_date: string | null
          id: string
          is_read: boolean
          last_touch_at: string
          lead_grade: string | null
          lead_score: number | null
          message: string | null
          name: string
          property_area: number
          property_type: string
          report_delivered_at: string | null
          report_pdf_path: string | null
          retention_expires_at: string | null
          score_breakdown: Json | null
          scored_at: string | null
          simulation_data: Json | null
          source: string | null
          status_token: string
          touch_count: number
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          activity_history?: Json
          alert_attempts?: number
          alert_last_error?: string | null
          alert_sent_at?: string | null
          alert_status?: string | null
          anonymized_at?: string | null
          calculated_net_profit?: number | null
          calculated_yearly_profit?: number | null
          created_at?: string
          crm_next_retry_at?: string | null
          crm_status?: string
          crm_sync_attempts?: number
          crm_sync_error?: string | null
          crm_sync_status?: string | null
          crm_synced_at?: string | null
          email?: string | null
          engagement_status?: string
          follow_up_date?: string | null
          id?: string
          is_read?: boolean
          last_touch_at?: string
          lead_grade?: string | null
          lead_score?: number | null
          message?: string | null
          name: string
          property_area: number
          property_type: string
          report_delivered_at?: string | null
          report_pdf_path?: string | null
          retention_expires_at?: string | null
          score_breakdown?: Json | null
          scored_at?: string | null
          simulation_data?: Json | null
          source?: string | null
          status_token?: string
          touch_count?: number
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          activity_history?: Json
          alert_attempts?: number
          alert_last_error?: string | null
          alert_sent_at?: string | null
          alert_status?: string | null
          anonymized_at?: string | null
          calculated_net_profit?: number | null
          calculated_yearly_profit?: number | null
          created_at?: string
          crm_next_retry_at?: string | null
          crm_status?: string
          crm_sync_attempts?: number
          crm_sync_error?: string | null
          crm_sync_status?: string | null
          crm_synced_at?: string | null
          email?: string | null
          engagement_status?: string
          follow_up_date?: string | null
          id?: string
          is_read?: boolean
          last_touch_at?: string
          lead_grade?: string | null
          lead_score?: number | null
          message?: string | null
          name?: string
          property_area?: number
          property_type?: string
          report_delivered_at?: string | null
          report_pdf_path?: string | null
          retention_expires_at?: string | null
          score_breakdown?: Json | null
          scored_at?: string | null
          simulation_data?: Json | null
          source?: string | null
          status_token?: string
          touch_count?: number
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      listing_import_config: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          is_regex: boolean
          kind: string
          notes: string | null
          pattern: string
          replacement: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          is_regex?: boolean
          kind: string
          notes?: string | null
          pattern: string
          replacement?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          is_regex?: boolean
          kind?: string
          notes?: string | null
          pattern?: string
          replacement?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      listing_import_heal_log: {
        Row: {
          decided_at: string
          decision: string
          id: string
          payload: Json | null
          rationale: string | null
        }
        Insert: {
          decided_at?: string
          decision: string
          id?: string
          payload?: Json | null
          rationale?: string | null
        }
        Update: {
          decided_at?: string
          decision?: string
          id?: string
          payload?: Json | null
          rationale?: string | null
        }
        Relationships: []
      }
      listing_import_learnings: {
        Row: {
          confidence: number | null
          evidence_count: number | null
          first_seen: string
          id: string
          is_active: boolean | null
          last_seen: string
          metadata: Json | null
          notes: string | null
          pattern: string
          pattern_type: string
          promoted_at: string | null
        }
        Insert: {
          confidence?: number | null
          evidence_count?: number | null
          first_seen?: string
          id?: string
          is_active?: boolean | null
          last_seen?: string
          metadata?: Json | null
          notes?: string | null
          pattern: string
          pattern_type: string
          promoted_at?: string | null
        }
        Update: {
          confidence?: number | null
          evidence_count?: number | null
          first_seen?: string
          id?: string
          is_active?: boolean | null
          last_seen?: string
          metadata?: Json | null
          notes?: string | null
          pattern?: string
          pattern_type?: string
          promoted_at?: string | null
        }
        Relationships: []
      }
      listing_import_metrics: {
        Row: {
          ai_rewrite_used: boolean | null
          avg_quality_score: number | null
          batch_size: number | null
          candidates: number | null
          duration_ms: number | null
          errors_sample: Json | null
          id: string
          per_source: Json | null
          published: number | null
          rejected_duplicate: number | null
          rejected_error: number | null
          rejected_low_quality: number | null
          rejected_no_content: number | null
          rejected_refusal: number | null
          rejected_source_disabled: number | null
          run_at: string
          scraped: number | null
          triggered_by: string | null
        }
        Insert: {
          ai_rewrite_used?: boolean | null
          avg_quality_score?: number | null
          batch_size?: number | null
          candidates?: number | null
          duration_ms?: number | null
          errors_sample?: Json | null
          id?: string
          per_source?: Json | null
          published?: number | null
          rejected_duplicate?: number | null
          rejected_error?: number | null
          rejected_low_quality?: number | null
          rejected_no_content?: number | null
          rejected_refusal?: number | null
          rejected_source_disabled?: number | null
          run_at?: string
          scraped?: number | null
          triggered_by?: string | null
        }
        Update: {
          ai_rewrite_used?: boolean | null
          avg_quality_score?: number | null
          batch_size?: number | null
          candidates?: number | null
          duration_ms?: number | null
          errors_sample?: Json | null
          id?: string
          per_source?: Json | null
          published?: number | null
          rejected_duplicate?: number | null
          rejected_error?: number | null
          rejected_low_quality?: number | null
          rejected_no_content?: number | null
          rejected_refusal?: number | null
          rejected_source_disabled?: number | null
          run_at?: string
          scraped?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      listing_import_review_events: {
        Row: {
          action: string
          ai_description: string | null
          ai_title: string | null
          created_at: string
          diff_tokens_removed: Json | null
          final_description: string | null
          final_title: string | null
          id: string
          property_id: string | null
          reason: string | null
          reviewer_id: string | null
          source_platform: string | null
        }
        Insert: {
          action: string
          ai_description?: string | null
          ai_title?: string | null
          created_at?: string
          diff_tokens_removed?: Json | null
          final_description?: string | null
          final_title?: string | null
          id?: string
          property_id?: string | null
          reason?: string | null
          reviewer_id?: string | null
          source_platform?: string | null
        }
        Update: {
          action?: string
          ai_description?: string | null
          ai_title?: string | null
          created_at?: string
          diff_tokens_removed?: Json | null
          final_description?: string | null
          final_title?: string | null
          id?: string
          property_id?: string | null
          reason?: string | null
          reviewer_id?: string | null
          source_platform?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_import_review_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_import_source_health: {
        Row: {
          approval_rate: number | null
          auto_disabled_until: string | null
          consecutive_failures: number | null
          last_failure_at: string | null
          last_success_at: string | null
          notes: string | null
          source_platform: string
          total_approved: number | null
          total_attempts: number | null
          total_edited: number | null
          total_published: number | null
          total_rejected: number | null
          total_user_rejected: number | null
          updated_at: string
        }
        Insert: {
          approval_rate?: number | null
          auto_disabled_until?: string | null
          consecutive_failures?: number | null
          last_failure_at?: string | null
          last_success_at?: string | null
          notes?: string | null
          source_platform: string
          total_approved?: number | null
          total_attempts?: number | null
          total_edited?: number | null
          total_published?: number | null
          total_rejected?: number | null
          total_user_rejected?: number | null
          updated_at?: string
        }
        Update: {
          approval_rate?: number | null
          auto_disabled_until?: string | null
          consecutive_failures?: number | null
          last_failure_at?: string | null
          last_success_at?: string | null
          notes?: string | null
          source_platform?: string
          total_approved?: number | null
          total_attempts?: number | null
          total_edited?: number | null
          total_published?: number | null
          total_rejected?: number | null
          total_user_rejected?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      listing_import_system_prompts: {
        Row: {
          compiled_prompt: string
          created_at: string
          forbidden_count: number
          generated_by: string | null
          hints_count: number
          id: string
          is_active: boolean
          notes: string | null
          semantic_count: number
        }
        Insert: {
          compiled_prompt: string
          created_at?: string
          forbidden_count?: number
          generated_by?: string | null
          hints_count?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          semantic_count?: number
        }
        Update: {
          compiled_prompt?: string
          created_at?: string
          forbidden_count?: number
          generated_by?: string | null
          hints_count?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          semantic_count?: number
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
      marketing_snapshot: {
        Row: {
          ad_spend_eur: number
          created_at: string
          date: string
          ga4_users: number
          gsc_clicks: number
          gsc_impressions: number
          id: string
          updated_at: string
        }
        Insert: {
          ad_spend_eur?: number
          created_at?: string
          date: string
          ga4_users?: number
          gsc_clicks?: number
          gsc_impressions?: number
          id?: string
          updated_at?: string
        }
        Update: {
          ad_spend_eur?: number
          created_at?: string
          date?: string
          ga4_users?: number
          gsc_clicks?: number
          gsc_impressions?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      outreach_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          platform: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          platform: string
          subject?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          platform?: string
          subject?: string
          updated_at?: string
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
      owner_contracts: {
        Row: {
          charge_id: string | null
          contract_body: string | null
          contract_pdf_generated_at: string | null
          contract_pdf_path: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          invoice_number: string | null
          invoice_sent_at: string | null
          lead_id: string | null
          line_items: Json | null
          management_fee_percent: number
          onboarding_fee_cents: number
          otp_attempts: number
          otp_code_hash: string | null
          otp_expires_at: string | null
          owner_address: string | null
          owner_email: string | null
          owner_name: string
          owner_phone: string | null
          owner_portal_code: string | null
          owner_tax_id: string | null
          paid_at: string | null
          payment_amount_cents: number | null
          payment_intent_id: string | null
          photo_session_fee_cents: number
          photo_session_included: boolean
          property_address: string | null
          receipt_url: string | null
          refund_amount_cents: number | null
          refunded_at: string | null
          signature_ip: string | null
          signature_name: string | null
          signature_user_agent: string | null
          signed_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          token: string
          updated_at: string
        }
        Insert: {
          charge_id?: string | null
          contract_body?: string | null
          contract_pdf_generated_at?: string | null
          contract_pdf_path?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          invoice_number?: string | null
          invoice_sent_at?: string | null
          lead_id?: string | null
          line_items?: Json | null
          management_fee_percent?: number
          onboarding_fee_cents?: number
          otp_attempts?: number
          otp_code_hash?: string | null
          otp_expires_at?: string | null
          owner_address?: string | null
          owner_email?: string | null
          owner_name: string
          owner_phone?: string | null
          owner_portal_code?: string | null
          owner_tax_id?: string | null
          paid_at?: string | null
          payment_amount_cents?: number | null
          payment_intent_id?: string | null
          photo_session_fee_cents?: number
          photo_session_included?: boolean
          property_address?: string | null
          receipt_url?: string | null
          refund_amount_cents?: number | null
          refunded_at?: string | null
          signature_ip?: string | null
          signature_name?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          charge_id?: string | null
          contract_body?: string | null
          contract_pdf_generated_at?: string | null
          contract_pdf_path?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          invoice_number?: string | null
          invoice_sent_at?: string | null
          lead_id?: string | null
          line_items?: Json | null
          management_fee_percent?: number
          onboarding_fee_cents?: number
          otp_attempts?: number
          otp_code_hash?: string | null
          otp_expires_at?: string | null
          owner_address?: string | null
          owner_email?: string | null
          owner_name?: string
          owner_phone?: string | null
          owner_portal_code?: string | null
          owner_tax_id?: string | null
          paid_at?: string | null
          payment_amount_cents?: number | null
          payment_intent_id?: string | null
          photo_session_fee_cents?: number
          photo_session_included?: boolean
          property_address?: string | null
          receipt_url?: string | null
          refund_amount_cents?: number | null
          refunded_at?: string | null
          signature_ip?: string | null
          signature_name?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      pm_collaboration_leads: {
        Row: {
          ai_pitch: string | null
          ai_summary: string | null
          amenities: string[] | null
          capacity: number | null
          city: string | null
          contacted_at: string | null
          created_at: string
          currency: string | null
          description: string | null
          discovered_via: string | null
          host_name: string | null
          host_profile_url: string | null
          id: string
          images: string[] | null
          notes: string | null
          platform: string
          pm_potential_score: number | null
          price_per_night: number | null
          property_name: string | null
          property_type: string | null
          rating: number | null
          raw_data: Json | null
          reviews_count: number | null
          rooms: number | null
          sent_to_andrei_at: string | null
          source_url: string
          status: string
          updated_at: string
          zone: string | null
        }
        Insert: {
          ai_pitch?: string | null
          ai_summary?: string | null
          amenities?: string[] | null
          capacity?: number | null
          city?: string | null
          contacted_at?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discovered_via?: string | null
          host_name?: string | null
          host_profile_url?: string | null
          id?: string
          images?: string[] | null
          notes?: string | null
          platform: string
          pm_potential_score?: number | null
          price_per_night?: number | null
          property_name?: string | null
          property_type?: string | null
          rating?: number | null
          raw_data?: Json | null
          reviews_count?: number | null
          rooms?: number | null
          sent_to_andrei_at?: string | null
          source_url: string
          status?: string
          updated_at?: string
          zone?: string | null
        }
        Update: {
          ai_pitch?: string | null
          ai_summary?: string | null
          amenities?: string[] | null
          capacity?: number | null
          city?: string | null
          contacted_at?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discovered_via?: string | null
          host_name?: string | null
          host_profile_url?: string | null
          id?: string
          images?: string[] | null
          notes?: string | null
          platform?: string
          pm_potential_score?: number | null
          price_per_night?: number | null
          property_name?: string | null
          property_type?: string | null
          rating?: number | null
          raw_data?: Json | null
          reviews_count?: number | null
          rooms?: number | null
          sent_to_andrei_at?: string | null
          source_url?: string
          status?: string
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      pm_scan_settings: {
        Row: {
          id: string
          min_rating_airbnb: number
          min_rating_booking: number
          price_max: number
          price_min: number
          priority_zones: string[]
          singleton: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          min_rating_airbnb?: number
          min_rating_booking?: number
          price_max?: number
          price_min?: number
          priority_zones?: string[]
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          min_rating_airbnb?: number
          min_rating_booking?: number
          price_max?: number
          price_min?: number
          priority_zones?: string[]
          singleton?: boolean
          updated_at?: string
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
      poi_review_notifications: {
        Row: {
          created_at: string
          email_fallback: boolean
          email_sent: boolean
          email_to: string | null
          error_message: string | null
          guest_name: string | null
          id: string
          poi_id: string | null
          poi_name: string | null
          rating: number | null
          review_id: string | null
          whatsapp_configured: boolean
          whatsapp_status: number | null
        }
        Insert: {
          created_at?: string
          email_fallback?: boolean
          email_sent?: boolean
          email_to?: string | null
          error_message?: string | null
          guest_name?: string | null
          id?: string
          poi_id?: string | null
          poi_name?: string | null
          rating?: number | null
          review_id?: string | null
          whatsapp_configured?: boolean
          whatsapp_status?: number | null
        }
        Update: {
          created_at?: string
          email_fallback?: boolean
          email_sent?: boolean
          email_to?: string | null
          error_message?: string | null
          guest_name?: string | null
          id?: string
          poi_id?: string | null
          poi_name?: string | null
          rating?: number | null
          review_id?: string | null
          whatsapp_configured?: boolean
          whatsapp_status?: number | null
        }
        Relationships: []
      }
      poi_review_settings: {
        Row: {
          client_throttle_seconds: number
          id: boolean
          max_per_day: number
          max_per_hour: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_throttle_seconds?: number
          id?: boolean
          max_per_day?: number
          max_per_hour?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_throttle_seconds?: number
          id?: boolean
          max_per_day?: number
          max_per_hour?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      poi_reviews: {
        Row: {
          comment: string | null
          created_at: string
          guest_name: string | null
          id: string
          moderated_at: string | null
          moderated_by: string | null
          poi_id: string
          rating: number
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          poi_id: string
          rating: number
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          poi_id?: string
          rating?: number
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poi_reviews_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "points_of_interest"
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
          booking_url: string | null
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
          image_alts: string[] | null
          image_path: string | null
          images: string[] | null
          images_processed_at: string | null
          images_processing_log: Json | null
          images_processing_status: string | null
          import_source: string | null
          imported_at: string | null
          indexing_status: string
          intercom_type: string | null
          is_active: boolean
          kitchens: number | null
          land_area: number | null
          last_google_check_at: string | null
          latitude: number | null
          listing_type: string | null
          location: string
          long_description_en: string | null
          long_description_ro: string | null
          longitude: number | null
          migrated_from_prospect_id: string | null
          monthly_maintenance: number | null
          name: string
          needs_review: boolean
          orientation: string | null
          original_description_raw: string | null
          original_source_url: string | null
          parking: string | null
          price_per_sqm: number | null
          property_code: string | null
          property_condition: string | null
          property_subtype: string | null
          quality_score: number | null
          renovation_year: number | null
          review_action: string | null
          reviewed_at: string | null
          roi_percentage: string | null
          rooms: number | null
          sanitization_log: Json | null
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
          booking_url?: string | null
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
          image_alts?: string[] | null
          image_path?: string | null
          images?: string[] | null
          images_processed_at?: string | null
          images_processing_log?: Json | null
          images_processing_status?: string | null
          import_source?: string | null
          imported_at?: string | null
          indexing_status?: string
          intercom_type?: string | null
          is_active?: boolean
          kitchens?: number | null
          land_area?: number | null
          last_google_check_at?: string | null
          latitude?: number | null
          listing_type?: string | null
          location: string
          long_description_en?: string | null
          long_description_ro?: string | null
          longitude?: number | null
          migrated_from_prospect_id?: string | null
          monthly_maintenance?: number | null
          name: string
          needs_review?: boolean
          orientation?: string | null
          original_description_raw?: string | null
          original_source_url?: string | null
          parking?: string | null
          price_per_sqm?: number | null
          property_code?: string | null
          property_condition?: string | null
          property_subtype?: string | null
          quality_score?: number | null
          renovation_year?: number | null
          review_action?: string | null
          reviewed_at?: string | null
          roi_percentage?: string | null
          rooms?: number | null
          sanitization_log?: Json | null
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
          booking_url?: string | null
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
          image_alts?: string[] | null
          image_path?: string | null
          images?: string[] | null
          images_processed_at?: string | null
          images_processing_log?: Json | null
          images_processing_status?: string | null
          import_source?: string | null
          imported_at?: string | null
          indexing_status?: string
          intercom_type?: string | null
          is_active?: boolean
          kitchens?: number | null
          land_area?: number | null
          last_google_check_at?: string | null
          latitude?: number | null
          listing_type?: string | null
          location?: string
          long_description_en?: string | null
          long_description_ro?: string | null
          longitude?: number | null
          migrated_from_prospect_id?: string | null
          monthly_maintenance?: number | null
          name?: string
          needs_review?: boolean
          orientation?: string | null
          original_description_raw?: string | null
          original_source_url?: string | null
          parking?: string | null
          price_per_sqm?: number | null
          property_code?: string | null
          property_condition?: string | null
          property_subtype?: string | null
          quality_score?: number | null
          renovation_year?: number | null
          review_action?: string | null
          reviewed_at?: string | null
          roi_percentage?: string | null
          rooms?: number | null
          sanitization_log?: Json | null
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
      property_analyses: {
        Row: {
          analysis: Json
          cached: boolean
          context_text: string | null
          created_at: string
          email_sent_at: string | null
          expires_at: string
          expiry_notified_at: string | null
          id: string
          input_hash: string | null
          ip_hash: string | null
          lead_id: string | null
          mode: string
          model: string | null
          photo_count: number
          recipient_email: string | null
          score: number | null
          share_token: string
          source_url: string | null
          updated_at: string
          zone: string | null
        }
        Insert: {
          analysis: Json
          cached?: boolean
          context_text?: string | null
          created_at?: string
          email_sent_at?: string | null
          expires_at?: string
          expiry_notified_at?: string | null
          id?: string
          input_hash?: string | null
          ip_hash?: string | null
          lead_id?: string | null
          mode?: string
          model?: string | null
          photo_count?: number
          recipient_email?: string | null
          score?: number | null
          share_token?: string
          source_url?: string | null
          updated_at?: string
          zone?: string | null
        }
        Update: {
          analysis?: Json
          cached?: boolean
          context_text?: string | null
          created_at?: string
          email_sent_at?: string | null
          expires_at?: string
          expiry_notified_at?: string | null
          id?: string
          input_hash?: string | null
          ip_hash?: string | null
          lead_id?: string | null
          mode?: string
          model?: string | null
          photo_count?: number
          recipient_email?: string | null
          score?: number | null
          share_token?: string
          source_url?: string | null
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      property_analysis_versions: {
        Row: {
          analysis: Json
          analysis_id: string
          created_at: string
          id: string
          params: Json
          version: number
        }
        Insert: {
          analysis?: Json
          analysis_id: string
          created_at?: string
          id?: string
          params?: Json
          version?: number
        }
        Update: {
          analysis?: Json
          analysis_id?: string
          created_at?: string
          id?: string
          params?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_analysis_versions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "property_analyses"
            referencedColumns: ["id"]
          },
        ]
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
      property_quality_overrides: {
        Row: {
          admin_id: string | null
          ai_quality_score: number | null
          created_at: string
          id: string
          note: string | null
          override: Json
          previous_override: Json | null
          prospect_id: string
        }
        Insert: {
          admin_id?: string | null
          ai_quality_score?: number | null
          created_at?: string
          id?: string
          note?: string | null
          override: Json
          previous_override?: Json | null
          prospect_id: string
        }
        Update: {
          admin_id?: string | null
          ai_quality_score?: number | null
          created_at?: string
          id?: string
          note?: string | null
          override?: Json
          previous_override?: Json | null
          prospect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_quality_overrides_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospect_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_quality_overrides_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "v_prospect_funnel"
            referencedColumns: ["prospect_id"]
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
      property_vision_cache: {
        Row: {
          analysis: Json
          created_at: string
          hit_count: number
          hotel_readiness: number
          id: string
          images_analyzed: number
          images_hash: string
          last_used_at: string
          model: string
          quality_score: number
          updated_at: string
        }
        Insert: {
          analysis: Json
          created_at?: string
          hit_count?: number
          hotel_readiness: number
          id?: string
          images_analyzed?: number
          images_hash: string
          last_used_at?: string
          model: string
          quality_score: number
          updated_at?: string
        }
        Update: {
          analysis?: Json
          created_at?: string
          hit_count?: number
          hotel_readiness?: number
          id?: string
          images_analyzed?: number
          images_hash?: string
          last_used_at?: string
          model?: string
          quality_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      property_vision_errors: {
        Row: {
          created_at: string
          error: string | null
          fallback_used: boolean
          id: string
          images_count: number | null
          model: string | null
          prospect_id: string | null
          stage: string
          status_code: number | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          fallback_used?: boolean
          id?: string
          images_count?: number | null
          model?: string | null
          prospect_id?: string | null
          stage: string
          status_code?: number | null
        }
        Update: {
          created_at?: string
          error?: string | null
          fallback_used?: boolean
          id?: string
          images_count?: number | null
          model?: string | null
          prospect_id?: string | null
          stage?: string
          status_code?: number | null
        }
        Relationships: []
      }
      property_vision_settings: {
        Row: {
          auto_outbound_enabled: boolean
          auto_threshold: number
          cache_enabled: boolean
          cache_ttl_days: number
          created_at: string
          id: number
          max_images: number
          outbound_template: string
          outbound_threshold: number
          updated_at: string
          updated_by: string | null
          vision_enabled: boolean
        }
        Insert: {
          auto_outbound_enabled?: boolean
          auto_threshold?: number
          cache_enabled?: boolean
          cache_ttl_days?: number
          created_at?: string
          id?: number
          max_images?: number
          outbound_template?: string
          outbound_threshold?: number
          updated_at?: string
          updated_by?: string | null
          vision_enabled?: boolean
        }
        Update: {
          auto_outbound_enabled?: boolean
          auto_threshold?: number
          cache_enabled?: boolean
          cache_ttl_days?: number
          created_at?: string
          id?: number
          max_images?: number
          outbound_template?: string
          outbound_threshold?: number
          updated_at?: string
          updated_by?: string | null
          vision_enabled?: boolean
        }
        Relationships: []
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
          enriched_at: string | null
          enriched_description: string | null
          enriched_images: Json | null
          enriched_title: string | null
          enrichment_attempts: number
          enrichment_error: string | null
          enrichment_next_retry_at: string | null
          enrichment_saved_at: string | null
          enrichment_status: string | null
          expiry_check_status: string | null
          features: string[] | null
          floor: string | null
          followup_sent_at: string | null
          id: string
          images: string[] | null
          indexing_status: string
          invalid_reason: string | null
          is_active: boolean | null
          last_callback_window: string | null
          last_expiry_check_at: string | null
          last_failure_reason: string | null
          last_google_check_at: string | null
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
          quality_analysis: Json | null
          quality_analyzed_at: string | null
          quality_override: Json | null
          quality_override_at: string | null
          quality_override_by: string | null
          quality_score: number | null
          rating: number | null
          rejection_reason: string | null
          retry_count: number
          review_count: number | null
          rooms: number | null
          score: number | null
          score_breakdown: Json | null
          scraped_at: string | null
          scraper_lead_id: string | null
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
          enriched_at?: string | null
          enriched_description?: string | null
          enriched_images?: Json | null
          enriched_title?: string | null
          enrichment_attempts?: number
          enrichment_error?: string | null
          enrichment_next_retry_at?: string | null
          enrichment_saved_at?: string | null
          enrichment_status?: string | null
          expiry_check_status?: string | null
          features?: string[] | null
          floor?: string | null
          followup_sent_at?: string | null
          id?: string
          images?: string[] | null
          indexing_status?: string
          invalid_reason?: string | null
          is_active?: boolean | null
          last_callback_window?: string | null
          last_expiry_check_at?: string | null
          last_failure_reason?: string | null
          last_google_check_at?: string | null
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
          quality_analysis?: Json | null
          quality_analyzed_at?: string | null
          quality_override?: Json | null
          quality_override_at?: string | null
          quality_override_by?: string | null
          quality_score?: number | null
          rating?: number | null
          rejection_reason?: string | null
          retry_count?: number
          review_count?: number | null
          rooms?: number | null
          score?: number | null
          score_breakdown?: Json | null
          scraped_at?: string | null
          scraper_lead_id?: string | null
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
          enriched_at?: string | null
          enriched_description?: string | null
          enriched_images?: Json | null
          enriched_title?: string | null
          enrichment_attempts?: number
          enrichment_error?: string | null
          enrichment_next_retry_at?: string | null
          enrichment_saved_at?: string | null
          enrichment_status?: string | null
          expiry_check_status?: string | null
          features?: string[] | null
          floor?: string | null
          followup_sent_at?: string | null
          id?: string
          images?: string[] | null
          indexing_status?: string
          invalid_reason?: string | null
          is_active?: boolean | null
          last_callback_window?: string | null
          last_expiry_check_at?: string | null
          last_failure_reason?: string | null
          last_google_check_at?: string | null
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
          quality_analysis?: Json | null
          quality_analyzed_at?: string | null
          quality_override?: Json | null
          quality_override_at?: string | null
          quality_override_by?: string | null
          quality_score?: number | null
          rating?: number | null
          rejection_reason?: string | null
          retry_count?: number
          review_count?: number | null
          rooms?: number | null
          score?: number | null
          score_breakdown?: Json | null
          scraped_at?: string | null
          scraper_lead_id?: string | null
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
          {
            foreignKeyName: "prospect_listings_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "v_prospect_funnel"
            referencedColumns: ["prospect_id"]
          },
          {
            foreignKeyName: "prospect_listings_scraper_lead_id_fkey"
            columns: ["scraper_lead_id"]
            isOneToOne: false
            referencedRelation: "scraper_leads_archive_2026"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_listings_scraper_lead_id_fkey"
            columns: ["scraper_lead_id"]
            isOneToOne: false
            referencedRelation: "v_prospect_funnel"
            referencedColumns: ["scraper_lead_id"]
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
      prospect_scan_jobs: {
        Row: {
          archived_skipped: number
          blacklisted_skipped: number
          created_at: string
          created_by: string | null
          current_keyword: string | null
          current_platform: string | null
          custom_query: string | null
          discovery_mode: boolean
          duplicate_skipped: number
          error_message: string | null
          errors: Json
          finished_at: string | null
          id: string
          max_results: number
          new_listings: number
          only_new_sources: boolean
          pending_queries: Json
          processed_queries: number
          query_limit: number
          result: Json | null
          started_at: string | null
          status: string
          total_queries: number
          triggered_by: string
          updated_at: string
        }
        Insert: {
          archived_skipped?: number
          blacklisted_skipped?: number
          created_at?: string
          created_by?: string | null
          current_keyword?: string | null
          current_platform?: string | null
          custom_query?: string | null
          discovery_mode?: boolean
          duplicate_skipped?: number
          error_message?: string | null
          errors?: Json
          finished_at?: string | null
          id?: string
          max_results?: number
          new_listings?: number
          only_new_sources?: boolean
          pending_queries?: Json
          processed_queries?: number
          query_limit?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          total_queries?: number
          triggered_by?: string
          updated_at?: string
        }
        Update: {
          archived_skipped?: number
          blacklisted_skipped?: number
          created_at?: string
          created_by?: string | null
          current_keyword?: string | null
          current_platform?: string | null
          custom_query?: string | null
          discovery_mode?: boolean
          duplicate_skipped?: number
          error_message?: string | null
          errors?: Json
          finished_at?: string | null
          id?: string
          max_results?: number
          new_listings?: number
          only_new_sources?: boolean
          pending_queries?: Json
          processed_queries?: number
          query_limit?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          total_queries?: number
          triggered_by?: string
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
      request_idempotency: {
        Row: {
          created_at: string
          expires_at: string
          key: string
          response: Json | null
          scope: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          key: string
          response?: Json | null
          scope?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          key?: string
          response?: Json | null
          scope?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "scraper_lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_prospect_funnel"
            referencedColumns: ["scraper_lead_id"]
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
          is_phone_verified: boolean
          is_priority: boolean | null
          lead_score: number
          lifecycle_status: Database["public"]["Enums"]["scraper_lead_status"]
          listing_type: string
          location: string | null
          monthly_extra: number
          neighborhood_slug: string | null
          original_price: number
          phone: string | null
          phone_e164: string | null
          phone_line_type: string | null
          phone_verified_at: string | null
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
          is_phone_verified?: boolean
          is_priority?: boolean | null
          lead_score?: number
          lifecycle_status?: Database["public"]["Enums"]["scraper_lead_status"]
          listing_type?: string
          location?: string | null
          monthly_extra?: number
          neighborhood_slug?: string | null
          original_price?: number
          phone?: string | null
          phone_e164?: string | null
          phone_line_type?: string | null
          phone_verified_at?: string | null
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
          is_phone_verified?: boolean
          is_priority?: boolean | null
          lead_score?: number
          lifecycle_status?: Database["public"]["Enums"]["scraper_lead_status"]
          listing_type?: string
          location?: string | null
          monthly_extra?: number
          neighborhood_slug?: string | null
          original_price?: number
          phone?: string | null
          phone_e164?: string | null
          phone_line_type?: string | null
          phone_verified_at?: string | null
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
          auto_disabled_reason: string | null
          consecutive_zero: number
          created_at: string
          fail_count: number
          id: string
          is_active: boolean
          keyword: string
          last_success_at: string | null
          last_test_at: string | null
          last_zero_at: string | null
          owner_filters: Json
          platform: string | null
          query_template: string | null
          success_count: number
          unique_leads_count: number
          updated_at: string
        }
        Insert: {
          auto_disabled_reason?: string | null
          consecutive_zero?: number
          created_at?: string
          fail_count?: number
          id?: string
          is_active?: boolean
          keyword: string
          last_success_at?: string | null
          last_test_at?: string | null
          last_zero_at?: string | null
          owner_filters?: Json
          platform?: string | null
          query_template?: string | null
          success_count?: number
          unique_leads_count?: number
          updated_at?: string
        }
        Update: {
          auto_disabled_reason?: string | null
          consecutive_zero?: number
          created_at?: string
          fail_count?: number
          id?: string
          is_active?: boolean
          keyword?: string
          last_success_at?: string | null
          last_test_at?: string | null
          last_zero_at?: string | null
          owner_filters?: Json
          platform?: string | null
          query_template?: string | null
          success_count?: number
          unique_leads_count?: number
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
      seo_alert_settings: {
        Row: {
          auto_reindex_on_alert: boolean
          email_enabled: boolean
          id: boolean
          min_404_hits: number
          min_indexing_issues: number
          updated_at: string
          updated_by: string | null
          webhook_enabled: boolean
          webhook_min_severity: string
        }
        Insert: {
          auto_reindex_on_alert?: boolean
          email_enabled?: boolean
          id?: boolean
          min_404_hits?: number
          min_indexing_issues?: number
          updated_at?: string
          updated_by?: string | null
          webhook_enabled?: boolean
          webhook_min_severity?: string
        }
        Update: {
          auto_reindex_on_alert?: boolean
          email_enabled?: boolean
          id?: boolean
          min_404_hits?: number
          min_indexing_issues?: number
          updated_at?: string
          updated_by?: string | null
          webhook_enabled?: boolean
          webhook_min_severity?: string
        }
        Relationships: []
      }
      seo_alerts: {
        Row: {
          alert_key: string
          alert_type: string
          created_at: string
          details: Json
          id: string
          notified_at: string | null
          resolved_at: string | null
          severity: string
          title: string
          webhook_sent_at: string | null
        }
        Insert: {
          alert_key: string
          alert_type: string
          created_at?: string
          details?: Json
          id?: string
          notified_at?: string | null
          resolved_at?: string | null
          severity?: string
          title: string
          webhook_sent_at?: string | null
        }
        Update: {
          alert_key?: string
          alert_type?: string
          created_at?: string
          details?: Json
          id?: string
          notified_at?: string | null
          resolved_at?: string | null
          severity?: string
          title?: string
          webhook_sent_at?: string | null
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
          {
            foreignKeyName: "seo_andrei_bridge_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "v_prospect_funnel"
            referencedColumns: ["prospect_id"]
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
      seo_audit_inflight: {
        Row: {
          language: string
          started_at: string
          triggered_by: string | null
          url: string
        }
        Insert: {
          language?: string
          started_at?: string
          triggered_by?: string | null
          url: string
        }
        Update: {
          language?: string
          started_at?: string
          triggered_by?: string | null
          url?: string
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
      seo_guides: {
        Row: {
          created_at: string
          id: string
          markdown: string
          meta_description: string | null
          neighborhood: string
          parent_id: string | null
          primary_keyword: string | null
          title: string
          updated_at: string
          user_id: string
          version: number
          word_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          markdown: string
          meta_description?: string | null
          neighborhood: string
          parent_id?: string | null
          primary_keyword?: string | null
          title: string
          updated_at?: string
          user_id: string
          version?: number
          word_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          markdown?: string
          meta_description?: string | null
          neighborhood?: string
          parent_id?: string | null
          primary_keyword?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "seo_guides_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "seo_guides"
            referencedColumns: ["id"]
          },
        ]
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
      seo_premium_plus_runs: {
        Row: {
          config: Json
          created_at: string
          error_count: number
          error_summary: string | null
          finished_at: string | null
          id: string
          mode: string
          processed_count: number
          results: Json
          skipped_count: number
          started_at: string
          started_by: string | null
          status: string
          success_count: number
          total_count: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          error_count?: number
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          mode: string
          processed_count?: number
          results?: Json
          skipped_count?: number
          started_at?: string
          started_by?: string | null
          status?: string
          success_count?: number
          total_count?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          error_count?: number
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          mode?: string
          processed_count?: number
          results?: Json
          skipped_count?: number
          started_at?: string
          started_by?: string | null
          status?: string
          success_count?: number
          total_count?: number
          updated_at?: string
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
          spam_shield_permissive_mode: boolean
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
          spam_shield_permissive_mode?: boolean
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
          spam_shield_permissive_mode?: boolean
          updated_at?: string
          weekly_report_enabled?: boolean | null
          weekly_report_recipients?: string[] | null
        }
        Relationships: []
      }
      sitemap_cache: {
        Row: {
          body: string
          cache_key: string
          generated_at: string
        }
        Insert: {
          body: string
          cache_key: string
          generated_at?: string
        }
        Update: {
          body?: string
          cache_key?: string
          generated_at?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          environment: string
          event_id: string
          event_type: string
          processed_at: string | null
          received_at: string
        }
        Insert: {
          environment?: string
          event_id: string
          event_type: string
          processed_at?: string | null
          received_at?: string
        }
        Update: {
          environment?: string
          event_id?: string
          event_type?: string
          processed_at?: string | null
          received_at?: string
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
          updated_at?: string
          updated_by?: string | null
          voice_latency_ms_threshold?: number
          voice_streak_required?: number
        }
        Relationships: []
      }
      tracking_alert_log: {
        Row: {
          alerted: boolean
          checked_on: string
          created_at: string
          current_day: string | null
          current_sessions: number
          drop_pct: number | null
          id: string
          note: string | null
          notified_emails: string[] | null
          previous_day: string | null
          previous_sessions: number
        }
        Insert: {
          alerted?: boolean
          checked_on?: string
          created_at?: string
          current_day?: string | null
          current_sessions?: number
          drop_pct?: number | null
          id?: string
          note?: string | null
          notified_emails?: string[] | null
          previous_day?: string | null
          previous_sessions?: number
        }
        Update: {
          alerted?: boolean
          checked_on?: string
          created_at?: string
          current_day?: string | null
          current_sessions?: number
          drop_pct?: number | null
          id?: string
          note?: string | null
          notified_emails?: string[] | null
          previous_day?: string | null
          previous_sessions?: number
        }
        Relationships: []
      }
      tracking_alert_settings: {
        Row: {
          enabled: boolean
          id: boolean
          min_sessions: number
          notify_emails: string[]
          threshold_pct: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: boolean
          min_sessions?: number
          notify_emails?: string[]
          threshold_pct?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: boolean
          min_sessions?: number
          notify_emails?: string[]
          threshold_pct?: number
          updated_at?: string
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
          alert_hot_deals_enabled: boolean
          alert_worker_errors_enabled: boolean
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
          hot_deal_min_score: number
          id: number
          max_calls_per_day: number
          min_lead_score: number
          notify_email: string | null
          notify_email_enabled: boolean
          notify_whatsapp_enabled: boolean
          phone_lookup_enabled: boolean
          predictive_sort_enabled: boolean
          production_webhook_url: string | null
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
          weekend_standby_enabled: boolean
          worker_alert_last_sent_at: string | null
          worker_failed_baseline_at: string | null
          worker_failed_baseline_count: number
          worker_failed_threshold: number
        }
        Insert: {
          alert_hot_deals_enabled?: boolean
          alert_worker_errors_enabled?: boolean
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
          hot_deal_min_score?: number
          id?: number
          max_calls_per_day?: number
          min_lead_score?: number
          notify_email?: string | null
          notify_email_enabled?: boolean
          notify_whatsapp_enabled?: boolean
          phone_lookup_enabled?: boolean
          predictive_sort_enabled?: boolean
          production_webhook_url?: string | null
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
          weekend_standby_enabled?: boolean
          worker_alert_last_sent_at?: string | null
          worker_failed_baseline_at?: string | null
          worker_failed_baseline_count?: number
          worker_failed_threshold?: number
        }
        Update: {
          alert_hot_deals_enabled?: boolean
          alert_worker_errors_enabled?: boolean
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
          hot_deal_min_score?: number
          id?: number
          max_calls_per_day?: number
          min_lead_score?: number
          notify_email?: string | null
          notify_email_enabled?: boolean
          notify_whatsapp_enabled?: boolean
          phone_lookup_enabled?: boolean
          predictive_sort_enabled?: boolean
          production_webhook_url?: string | null
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
          weekend_standby_enabled?: boolean
          worker_alert_last_sent_at?: string | null
          worker_failed_baseline_at?: string | null
          worker_failed_baseline_count?: number
          worker_failed_threshold?: number
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
            foreignKeyName: "voice_call_sessions_prospect_listing_id_fkey"
            columns: ["prospect_listing_id"]
            isOneToOne: false
            referencedRelation: "v_prospect_funnel"
            referencedColumns: ["prospect_id"]
          },
          {
            foreignKeyName: "voice_call_sessions_scraper_lead_id_fkey"
            columns: ["scraper_lead_id"]
            isOneToOne: false
            referencedRelation: "scraper_leads_archive_2026"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_call_sessions_scraper_lead_id_fkey"
            columns: ["scraper_lead_id"]
            isOneToOne: false
            referencedRelation: "v_prospect_funnel"
            referencedColumns: ["scraper_lead_id"]
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
          {
            foreignKeyName: "voice_ghosting_queue_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "v_prospect_funnel"
            referencedColumns: ["prospect_id"]
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
          {
            foreignKeyName: "voice_lead_cluster_assignments_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "v_prospect_funnel"
            referencedColumns: ["prospect_id"]
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
      voice_tts_request_logs: {
        Row: {
          created_at: string
          error: string | null
          fallback_used: boolean
          http_status: number | null
          id: string
          mode: string | null
          provider: string
          retry_count: number
          text_length: number | null
          total_duration_ms: number | null
          ttfb_ms: number | null
          voice_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          fallback_used?: boolean
          http_status?: number | null
          id?: string
          mode?: string | null
          provider: string
          retry_count?: number
          text_length?: number | null
          total_duration_ms?: number | null
          ttfb_ms?: number | null
          voice_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          fallback_used?: boolean
          http_status?: number | null
          id?: string
          mode?: string | null
          provider?: string
          retry_count?: number
          text_length?: number | null
          total_duration_ms?: number | null
          ttfb_ms?: number | null
          voice_id?: string | null
        }
        Relationships: []
      }
      wa_agent_settings: {
        Row: {
          enabled: boolean
          escalation_threshold: number
          id: number
          office_hours_only: boolean
          outbound_auto_pause_enabled: boolean
          outbound_max_consecutive_failures: number
          outbound_max_delay_seconds: number
          outbound_max_per_day: number
          outbound_max_per_hour: number
          outbound_min_delay_seconds: number
          outbound_min_delivery_rate: number
          outbound_pause_reason: string | null
          outbound_paused: boolean
          outbound_paused_at: string | null
          paused_reason: string | null
          system_prompt: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          escalation_threshold?: number
          id?: number
          office_hours_only?: boolean
          outbound_auto_pause_enabled?: boolean
          outbound_max_consecutive_failures?: number
          outbound_max_delay_seconds?: number
          outbound_max_per_day?: number
          outbound_max_per_hour?: number
          outbound_min_delay_seconds?: number
          outbound_min_delivery_rate?: number
          outbound_pause_reason?: string | null
          outbound_paused?: boolean
          outbound_paused_at?: string | null
          paused_reason?: string | null
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          escalation_threshold?: number
          id?: number
          office_hours_only?: boolean
          outbound_auto_pause_enabled?: boolean
          outbound_max_consecutive_failures?: number
          outbound_max_delay_seconds?: number
          outbound_max_per_day?: number
          outbound_max_per_hour?: number
          outbound_min_delay_seconds?: number
          outbound_min_delivery_rate?: number
          outbound_pause_reason?: string | null
          outbound_paused?: boolean
          outbound_paused_at?: string | null
          paused_reason?: string | null
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      wa_conversations: {
        Row: {
          assigned_channel: string
          created_at: string
          handoff_reason: string | null
          id: string
          last_inbound_at: string | null
          last_outbound_at: string | null
          opened_by_admin: string | null
          opened_by_template: string | null
          phone_normalized: string
          prospect_id: string | null
          qualification_score: number | null
          status: string
          updated_at: string
          wa_profile_name: string | null
          window_expires_at: string | null
        }
        Insert: {
          assigned_channel?: string
          created_at?: string
          handoff_reason?: string | null
          id?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          opened_by_admin?: string | null
          opened_by_template?: string | null
          phone_normalized: string
          prospect_id?: string | null
          qualification_score?: number | null
          status?: string
          updated_at?: string
          wa_profile_name?: string | null
          window_expires_at?: string | null
        }
        Update: {
          assigned_channel?: string
          created_at?: string
          handoff_reason?: string | null
          id?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          opened_by_admin?: string | null
          opened_by_template?: string | null
          phone_normalized?: string
          prospect_id?: string | null
          qualification_score?: number | null
          status?: string
          updated_at?: string
          wa_profile_name?: string | null
          window_expires_at?: string | null
        }
        Relationships: []
      }
      wa_dnc_list: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          label: string
          phone_normalized: string
          reason: string | null
          source: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          label?: string
          phone_normalized: string
          reason?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          label?: string
          phone_normalized?: string
          reason?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      wa_messages: {
        Row: {
          ai_model: string | null
          ai_tokens_in: number | null
          ai_tokens_out: number | null
          content: string
          conversation_id: string
          created_at: string
          direction: string
          error: string | null
          id: string
          media_url: string | null
          role: string
          template_name: string | null
          tool_call: Json | null
          wa_message_id: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_tokens_in?: number | null
          ai_tokens_out?: number | null
          content?: string
          conversation_id: string
          created_at?: string
          direction: string
          error?: string | null
          id?: string
          media_url?: string | null
          role: string
          template_name?: string | null
          tool_call?: Json | null
          wa_message_id?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_tokens_in?: number | null
          ai_tokens_out?: number | null
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          media_url?: string | null
          role?: string
          template_name?: string | null
          tool_call?: Json | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_outbound_events: {
        Row: {
          created_at: string
          detail: Json
          event: string
          id: string
          queue_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          event: string
          id?: string
          queue_id: string
        }
        Update: {
          created_at?: string
          detail?: Json
          event?: string
          id?: string
          queue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_outbound_events_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "wa_outbound_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_outbound_queue: {
        Row: {
          attempts: number
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          id: string
          last_error: string | null
          lead_id: string | null
          phone_normalized: string
          priority: number
          prospect_listing_id: string | null
          read_at: string | null
          replied_at: string | null
          scheduled_at: string
          sent_at: string | null
          source: string | null
          status: string
          template_language: string
          template_name: string
          template_params: Json
          updated_at: string
          wa_message_id: string | null
        }
        Insert: {
          attempts?: number
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          lead_id?: string | null
          phone_normalized: string
          priority?: number
          prospect_listing_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          scheduled_at?: string
          sent_at?: string | null
          source?: string | null
          status?: string
          template_language?: string
          template_name: string
          template_params?: Json
          updated_at?: string
          wa_message_id?: string | null
        }
        Update: {
          attempts?: number
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          lead_id?: string | null
          phone_normalized?: string
          priority?: number
          prospect_listing_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          scheduled_at?: string
          sent_at?: string | null
          source?: string | null
          status?: string
          template_language?: string
          template_name?: string
          template_params?: Json
          updated_at?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_outbound_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_outbound_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_outbound_queue_prospect_listing_id_fkey"
            columns: ["prospect_listing_id"]
            isOneToOne: false
            referencedRelation: "prospect_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_outbound_queue_prospect_listing_id_fkey"
            columns: ["prospect_listing_id"]
            isOneToOne: false
            referencedRelation: "v_prospect_funnel"
            referencedColumns: ["prospect_id"]
          },
        ]
      }
      wa_templates: {
        Row: {
          body_preview: string
          category: string
          created_at: string
          id: string
          language: string
          name: string
          status: string
          updated_at: string
          variable_count: number
          variables_help: string | null
        }
        Insert: {
          body_preview: string
          category?: string
          created_at?: string
          id?: string
          language?: string
          name: string
          status?: string
          updated_at?: string
          variable_count?: number
          variables_help?: string | null
        }
        Update: {
          body_preview?: string
          category?: string
          created_at?: string
          id?: string
          language?: string
          name?: string
          status?: string
          updated_at?: string
          variable_count?: number
          variables_help?: string | null
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
      v_prospect_funnel: {
        Row: {
          auto_call_triggered_at: string | null
          call_summary: string | null
          contact_phone: string | null
          first_seen_at: string | null
          funnel_status: string | null
          is_active: boolean | null
          last_activity_at: string | null
          lead_score: number | null
          location: string | null
          phone_normalized: string | null
          price: number | null
          prospect_id: string | null
          prospect_lifecycle: string | null
          prospect_score: number | null
          prospect_type: string | null
          scraper_lead_id: string | null
          scraper_lifecycle: string | null
          scraper_phone: string | null
          source_platform: string | null
          source_url: string | null
          tags: string[] | null
          title: string | null
          voice_call_session_id: string | null
          zone: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _canonical_listing_url: { Args: { url: string }; Returns: string }
      _extract_domain: { Args: { url: string }; Returns: string }
      admin_run_lead_retention: { Args: never; Returns: Json }
      anonymize_expired_leads: { Args: never; Returns: Json }
      anonymize_ip_address: { Args: { ip_address: string }; Returns: string }
      auto_blacklist_prospect: {
        Args: { p_prospect_id: string; p_reasons?: string[]; p_score: number }
        Returns: Json
      }
      auto_publish_scheduled_articles: { Args: never; Returns: number }
      automation_acquire_run_lease: {
        Args: {
          _job_key: string
          _lease_ttl_ms?: number
          _triggered_by?: string
        }
        Returns: string
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
      automation_expire_stale_runs: {
        Args: { _lease_ttl_ms?: number }
        Returns: number
      }
      automation_finish_run: {
        Args: {
          _duration_ms?: number
          _error?: string
          _job_key: string
          _payload?: Json
          _retry_count?: number
          _run_id: string
          _status?: string
          _success: boolean
        }
        Returns: undefined
      }
      automation_live_logs_cleanup: {
        Args: { _keep_hours?: number }
        Returns: number
      }
      automation_runs_cleanup: {
        Args: { _retention_days?: number }
        Returns: number
      }
      blog_rollback_ai_snapshot: {
        Args: { _snapshot_id: string }
        Returns: Json
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
      check_poi_review_rate_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      cleanup_capi_delivery_log: { Args: never; Returns: undefined }
      cleanup_old_e2e_runs: { Args: never; Returns: number }
      cleanup_old_tracking_data: { Args: never; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      extract_ro_phone_from_text: { Args: { p_text: string }; Returns: string }
      extract_url_domain: { Args: { p_url: string }; Returns: string }
      get_analysis_by_token: {
        Args: { _token: string }
        Returns: {
          analysis: Json
          created_at: string
          expires_at: string
          id: string
          mode: string
          photo_count: number
          score: number
          share_token: string
          source_url: string
          zone: string
        }[]
      }
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
      get_conversion_attribution_report: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_cron_reconcile_secret: { Args: never; Returns: string }
      get_ga4_daily_sessions: { Args: { p_days?: number }; Returns: Json }
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
      get_poi_review_throttle: { Args: never; Returns: number }
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
      get_quality_override_audit: {
        Args: { _days?: number }
        Returns: {
          ai_overrated_pct: number
          ai_underrated_pct: number
          avg_abs_delta: number
          avg_ai_score: number
          avg_manual_score: number
          avg_signed_delta: number
          prospects_touched: number
          total_overrides: number
          within_5_pct: number
        }[]
      }
      get_shared_comparison: {
        Args: { p_share_code: string }
        Returns: {
          items: Json
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
      get_sitemap_status: {
        Args: never
        Returns: {
          bytes: number
          cache_key: string
          generated_at: string
          url_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_admin_mfa: { Args: never; Returns: boolean }
      increment_keyword_unique_leads: {
        Args: { _delta?: number; _id: string }
        Returns: undefined
      }
      list_orphan_prospects: {
        Args: { _limit?: number; _since_hours?: number }
        Returns: {
          admin_notes: string
          created_at: string
          id: string
          lead_score: number
          lifecycle_status: string
          price: number
          rooms: number
          source_platform: string
          source_url: string
          title: string
          zone: string
        }[]
      }
      list_publish_worker_failures: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          details: Json
          entity_id: string
          id: string
          severity: string
        }[]
      }
      listing_import_record_review: {
        Args: {
          _action: string
          _quality_delta?: number
          _source_platform: string
        }
        Returns: undefined
      }
      log_404: {
        Args: { _path: string; _referrer?: string; _user_agent?: string }
        Returns: undefined
      }
      log_analysis_version: {
        Args: { p_analysis: Json; p_params: Json; p_token: string }
        Returns: number
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
      log_lead_event: {
        Args: {
          p_actor?: string
          p_attempt?: number
          p_duration_ms?: number
          p_event_type: string
          p_lead_id: string
          p_message?: string
          p_metadata?: Json
          p_status?: string
        }
        Returns: string
      }
      log_pii_reveal: {
        Args: { _field: string; _record_id: string; _table_name: string }
        Returns: undefined
      }
      log_scraper_admin_action: {
        Args: {
          _action: string
          _details?: Json
          _entity_id?: string
          _entity_type?: string
          _severity?: string
        }
        Returns: string
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
      my_community_comment_ids: {
        Args: { _submission_id: string }
        Returns: string[]
      }
      normalize_ro_phone: { Args: { p: string }; Returns: string }
      normalize_zone_key: {
        Args: { p_location: string; p_zone: string }
        Returns: string
      }
      poi_review_content_is_clean: {
        Args: { p_comment: string; p_guest_name: string }
        Returns: boolean
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
      purge_expired_idempotency_keys: { Args: never; Returns: number }
      reactivate_scraper_keyword: { Args: { _id: string }; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reconcile_import_pipeline: {
        Args: { _since_hours?: number }
        Returns: Json
      }
      record_keyword_outcome: {
        Args: { _found: number; _keyword: string; _platform: string }
        Returns: undefined
      }
      redeem_owner_code: { Args: { p_code: string }; Returns: Json }
      reset_prospect_invalid_status: {
        Args: { p_prospect_id: string }
        Returns: Json
      }
      retry_failed_crm_syncs: { Args: never; Returns: number }
      revoke_admin_mfa: { Args: never; Returns: undefined }
      score_lead: {
        Args: {
          p_area: number
          p_email: string
          p_net_profit: number
          p_phone: string
          p_property_type: string
          p_source: string
          p_zone: string
        }
        Returns: Json
      }
      seo_acquire_audit_lock: {
        Args: {
          p_language?: string
          p_triggered_by?: string
          p_ttl_seconds?: number
          p_url: string
        }
        Returns: boolean
      }
      seo_normalize_url_path: { Args: { _url: string }; Returns: string }
      seo_premium_plus_apply_override: {
        Args: {
          _applied_by?: string
          _change_type?: string
          _extra_keywords?: Json
          _meta_description: string
          _notes?: string
          _source_audit_id?: string
          _title: string
          _url: string
        }
        Returns: Json
      }
      seo_premium_plus_rollback_override: {
        Args: { _applied_by?: string; _url_path: string }
        Returns: Json
      }
      seo_release_audit_lock: {
        Args: { p_language?: string; p_url: string }
        Returns: undefined
      }
      submit_analysis_lead: {
        Args: {
          p_email: string
          p_message?: string
          p_name: string
          p_phone: string
          p_property_area?: number
          p_property_type: string
          p_simulation?: Json
          p_source?: string
        }
        Returns: string
      }
      validate_chat_session: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      voice_caller_archive_stale: { Args: never; Returns: number }
    }
    Enums: {
      agency_keyword_type: "hard" | "soft" | "owner"
      app_role: "admin" | "moderator" | "user" | "owner" | "super_admin"
      indexnow_actual_status: "pending" | "indexed" | "missing"
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
        | "expired"
        | "to_review"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user", "owner", "super_admin"],
      indexnow_actual_status: ["pending", "indexed", "missing"],
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
        "expired",
        "to_review",
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
