
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_audit_log": {
                  Row: {
                    "action": string,"actor_id": string,"actor_name": string,"at": string,"details": NonNullable<Json>,"id": number,"target_id": string | null,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id": string,"actor_name": string,"at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_type": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string,"actor_name"?: string,"at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"answer_options": {
                  Row: {
                    "created_at": string,"id": string,"is_correct": boolean,"question_id": string,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_correct"?: boolean,"question_id": string,"text": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_correct"?: boolean,"question_id"?: string,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "answer_options_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"certificate_counters": {
                  Row: {
                    "last_number": number,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "last_number": number,"year": number
                  }
                  Update: {
                    "last_number"?: number,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"certificates": {
                  Row: {
                    "certificate_number": string,"check_code": string,"expires_at": string,"first_name": string,"id": string,"issued_at": string,"last_name": string,"revoked_at": string | null,"store_id_at_issue": string | null,"store_name_at_issue": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "certificate_number": string,"check_code": string,"expires_at": string,"first_name": string,"id"?: string,"issued_at"?: string,"last_name": string,"revoked_at"?: string | null,"store_id_at_issue"?: string | null,"store_name_at_issue": string,"user_id": string
                  }
                  Update: {
                    "certificate_number"?: string,"check_code"?: string,"expires_at"?: string,"first_name"?: string,"id"?: string,"issued_at"?: string,"last_name"?: string,"revoked_at"?: string | null,"store_id_at_issue"?: string | null,"store_name_at_issue"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "certificates_store_id_at_issue_fkey"
      columns: ["store_id_at_issue"]
isOneToOne: false
      referencedRelation: "store_status"
      referencedColumns: ["store_id"]
    },{
      foreignKeyName: "certificates_store_id_at_issue_fkey"
      columns: ["store_id_at_issue"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_progress": {
                  Row: {
                    "completed_at": string | null,"first_progress_at": string,"last_position_seconds": number,"lesson_id": string,"max_percent": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"first_progress_at"?: string,"last_position_seconds"?: number,"lesson_id": string,"max_percent"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"first_progress_at"?: string,"last_position_seconds"?: number,"lesson_id"?: string,"max_percent"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_progress_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "category_id": string,"created_at": string,"duration_seconds": number | null,"id": string,"is_core": boolean,"product_name": string | null,"published": boolean,"region": Database["public"]['Enums']["region"],"slug": string,"sort_order": number,"summary": string | null,"title": string,"vimeo_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"created_at"?: string,"duration_seconds"?: number | null,"id"?: string,"is_core"?: boolean,"product_name"?: string | null,"published"?: boolean,"region"?: Database["public"]['Enums']["region"],"slug": string,"sort_order"?: number,"summary"?: string | null,"title": string,"vimeo_id"?: string | null
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"duration_seconds"?: number | null,"id"?: string,"is_core"?: boolean,"product_name"?: string | null,"published"?: boolean,"region"?: Database["public"]['Enums']["region"],"slug"?: string,"sort_order"?: number,"summary"?: string | null,"title"?: string,"vimeo_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"partners": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"parent_group": string | null,"type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"parent_group"?: string | null,"type"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"parent_group"?: string | null,"type"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"created_at": string,"email": string,"first_name": string,"id": string,"last_active_at": string,"last_name": string,"marketing_opt_in": boolean,"marketing_opt_in_at": string | null,"role": string,"store_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email": string,"first_name": string,"id": string,"last_active_at"?: string,"last_name": string,"marketing_opt_in"?: boolean,"marketing_opt_in_at"?: string | null,"role"?: string,"store_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email"?: string,"first_name"?: string,"id"?: string,"last_active_at"?: string,"last_name"?: string,"marketing_opt_in"?: boolean,"marketing_opt_in_at"?: string | null,"role"?: string,"store_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "store_status"
      referencedColumns: ["store_id"]
    },{
      foreignKeyName: "profiles_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"qr_links": {
                  Row: {
                    "created_at": string,"id": string,"lesson_id": string,"scan_count": number,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"lesson_id": string,"scan_count"?: number,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"lesson_id"?: string,"scan_count"?: number,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "qr_links_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"qr_scans": {
                  Row: {
                    "id": string,"qr_link_id": string,"scanned_at": string,"utm_campaign": string | null,"utm_medium": string | null,"utm_source": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"qr_link_id": string,"scanned_at"?: string,"utm_campaign"?: string | null,"utm_medium"?: string | null,"utm_source"?: string | null
                  }
                  Update: {
                    "id"?: string,"qr_link_id"?: string,"scanned_at"?: string,"utm_campaign"?: string | null,"utm_medium"?: string | null,"utm_source"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "qr_scans_qr_link_id_fkey"
      columns: ["qr_link_id"]
isOneToOne: false
      referencedRelation: "qr_links"
      referencedColumns: ["id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "created_at": string,"id": string,"lesson_id": string,"prompt": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"lesson_id": string,"prompt": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"lesson_id"?: string,"prompt"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_attempts": {
                  Row: {
                    "answers": NonNullable<Json>,"created_at": string,"id": string,"lesson_id": string,"passed": boolean,"score": number,"total": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers": NonNullable<Json>,"created_at"?: string,"id"?: string,"lesson_id": string,"passed": boolean,"score": number,"total": number,"user_id": string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"lesson_id"?: string,"passed"?: boolean,"score"?: number,"total"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_attempts_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_attempts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "description": string,"key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string,"key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"stores": {
                  Row: {
                    "active": boolean,"country": string,"created_at": string,"id": string,"name": string,"partner_id": string,"state": string | null,"store_code": string,"suburb": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"country"?: string,"created_at"?: string,"id"?: string,"name": string,"partner_id": string,"state"?: string | null,"store_code": string,"suburb"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"country"?: string,"created_at"?: string,"id"?: string,"name"?: string,"partner_id"?: string,"state"?: string | null,"store_code"?: string,"suburb"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stores_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "partners"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "store_status": {
                  Row: {
                    "active_certified_staff": number | null,"is_certified": boolean | null,"store_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "admin_access":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"admin_audit":
{ Args: { "p_action": string,"p_actor": string,"p_details": Json,"p_target_id": string,"p_target_type": string }; Returns: undefined
                           },
"admin_check_text":
{ Args: { "p_field": string,"p_max": number,"p_min": number,"p_value": string }; Returns: undefined
                           },
"admin_delete_learner":
{ Args: { "p_confirm_name": string,"p_user": string }; Returns: undefined
                           },
"admin_delete_lesson":
{ Args: { "p_id": string }; Returns: undefined
                           },
"admin_get_learner":
{ Args: { "p_user": string }; Returns: Json
                           },
"admin_get_lesson":
{ Args: { "p_id": string }; Returns: Json
                           },
"admin_get_quiz":
{ Args: { "p_lesson": string }; Returns: Json
                           },
"admin_get_settings":
{ Args: Record<PropertyKey, never>; Returns: {
              "description": string,"key": string,"updated_at": string,"value": Json
            }[]
                           },
"admin_list_audit":
{ Args: { "p_action": string,"p_before": number }; Returns: {
              "action": string,"actor_name": string,"at": string,"details": Json,"id": number,"target_id": string,"target_type": string
            }[]
                           },
"admin_list_categories":
{ Args: Record<PropertyKey, never>; Returns: {
              "description": string,"id": string,"lesson_count": number,"name": string,"slug": string,"sort_order": number
            }[]
                           },
"admin_list_lessons":
{ Args: Record<PropertyKey, never>; Returns: {
              "category_id": string,"category_name": string,"duration_seconds": number,"id": string,"is_core": boolean,"learners_started": number,"product_name": string,"published": boolean,"qr_links": number,"quiz_ready": boolean,"region": Database["public"]['Enums']["region"],"slug": string,"sort_order": number,"title": string,"vimeo_id": string
            }[]
                           },
"admin_list_partners":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"name": string,"parent_group": string,"store_count": number,"type": string
            }[]
                           },
"admin_list_qr_links":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,"id": string,"lesson_id": string,"lesson_title": string,"scan_count": number,"slug": string
            }[]
                           },
"admin_list_stores":
{ Args: { "p_partner": string }; Returns: {
              "active": boolean,"certified_staff": number,"country": string,"id": string,"is_certified": boolean,"learners": number,"name": string,"partner_id": string,"partner_name": string,"state": string,"store_code": string,"suburb": string
            }[]
                           },
"admin_log_export":
{ Args: { "p_report": string,"p_rows": number }; Returns: undefined
                           },
"admin_move_category":
{ Args: { "p_direction": number,"p_id": string }; Returns: undefined
                           },
"admin_move_lesson":
{ Args: { "p_direction": number,"p_id": string }; Returns: undefined
                           },
"admin_new_store_code":
{ Args: { "p_location": string,"p_prefix": string }; Returns: string
                           },
"admin_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_regenerate_store_code":
{ Args: { "p_location": string,"p_prefix": string,"p_store": string }; Returns: string
                           },
"admin_reinstate_certificate":
{ Args: { "p_certificate": string }; Returns: undefined
                           },
"admin_report_certified_staff":
{ Args: Record<PropertyKey, never>; Returns: {
              "certificate_number": string,"expires_at": string,"first_name": string,"issued_at": string,"last_name": string,"partner_name": string,"status": string,"store_name": string
            }[]
                           },
"admin_report_certified_stores":
{ Args: Record<PropertyKey, never>; Returns: {
              "certified_staff": number,"is_certified": boolean,"partner_name": string,"state": string,"store_id": string,"store_name": string,"suburb": string,"threshold": number
            }[]
                           },
"admin_report_completions":
{ Args: Record<PropertyKey, never>; Returns: {
              "category_name": string,"is_core": boolean,"lesson_id": string,"passed": number,"published": boolean,"started": number,"title": string,"watched": number
            }[]
                           },
"admin_report_qr_scans":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "lesson_title": string,"scans": number,"slug": string,"utm_source": string
            }[]
                           },
"admin_reset_mfa":
{ Args: { "p_user": string }; Returns: undefined
                           },
"admin_revoke_certificate":
{ Args: { "p_certificate": string,"p_reason": string }; Returns: undefined
                           },
"admin_save_category":
{ Args: { "p_description": string,"p_id": string,"p_name": string,"p_slug": string }; Returns: string
                           },
"admin_save_lesson":
{ Args: { "p_category": string,"p_duration_seconds": number,"p_id": string,"p_is_core": boolean,"p_product_name": string,"p_published": boolean,"p_region": Database["public"]['Enums']["region"],"p_slug": string,"p_summary": string,"p_title": string,"p_vimeo_id": string }; Returns: string
                           },
"admin_save_partner":
{ Args: { "p_id": string,"p_name": string,"p_parent_group": string,"p_type": string }; Returns: string
                           },
"admin_save_qr_link":
{ Args: { "p_id": string,"p_lesson": string,"p_slug": string }; Returns: string
                           },
"admin_save_quiz":
{ Args: { "p_lesson": string,"p_questions": Json }; Returns: undefined
                           },
"admin_save_settings":
{ Args: { "p_values": Json }; Returns: undefined
                           },
"admin_save_store":
{ Args: { "p_active": boolean,"p_country": string,"p_id": string,"p_location": string,"p_name": string,"p_partner": string,"p_prefix": string,"p_state": string,"p_suburb": string }; Returns: string
                           },
"admin_search_learners":
{ Args: { "p_query": string }; Returns: {
              "active": boolean,"certificate_status": string,"email": string,"first_name": string,"id": string,"last_name": string,"role": string,"store_name": string
            }[]
                           },
"admin_set_learner_active":
{ Args: { "p_active": boolean,"p_user": string }; Returns: undefined
                           },
"admin_set_learner_store":
{ Args: { "p_store": string,"p_user": string }; Returns: undefined
                           },
"admin_set_role":
{ Args: { "p_role": string,"p_user": string }; Returns: undefined
                           },
"admin_slug_ok":
{ Args: { "p_max": number,"p_slug": string }; Returns: boolean
                           },
"certificate_status_of":
{ Args: { "p_user": string }; Returns: string
                           },
"certified_stores":
{ Args: Record<PropertyKey, never>; Returns: {
              "country": string,"name": string,"state": string,"suburb": string
            }[]
                           },
"current_admin":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_learner":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_quiz":
{ Args: { "p_lesson_id": string }; Returns: {
              "option_id": string,"option_text": string,"prompt": string,"question_id": string
            }[]
                           },
"issue_certificate_if_eligible":
{ Args: { "p_user": string }; Returns: string
                           },
"join_store":
{ Args: { "p_code": string }; Returns: {
              "store_name": string
            }[]
                           },
"lessons_with_quiz":
{ Args: Record<PropertyKey, never>; Returns: {
              "lesson_id": string
            }[]
                           },
"log_qr_scan":
{ Args: { "p_slug": string,"p_utm_campaign"?: string,"p_utm_medium"?: string,"p_utm_source"?: string }; Returns: {
              "category_slug": string,"lesson_slug": string
            }[]
                           },
"lookup_store":
{ Args: { "p_code": string }; Returns: {
              "partner_name": string,"state": string,"store_name": string,"suburb": string
            }[]
                           },
"my_store_status":
{ Args: Record<PropertyKey, never>; Returns: {
              "active_certified_staff": number,"is_certified": boolean,"store_name": string,"threshold": number
            }[]
                           },
"normalise_store_code":
{ Args: { "p_code": string }; Returns: string
                           },
"quiz_ready":
{ Args: { "p_lesson_id": string }; Returns: boolean
                           },
"quiz_status":
{ Args: { "p_lesson_id": string }; Returns: {
              "attempts_left": number,"state": string
            }[]
                           },
"quiz_unlocked":
{ Args: { "p_lesson_id": string,"p_user": string }; Returns: boolean
                           },
"random_code":
{ Args: { "p_length": number }; Returns: string
                           },
"require_admin":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"require_step_up":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"save_lesson_progress":
{ Args: { "p_lesson_id": string,"p_percent": number,"p_position_seconds": number }; Returns: undefined
                           },
"setting_int":
{ Args: { "p_default": number,"p_key": string,"p_max": number,"p_min": number }; Returns: number
                           },
"setting_value_ok":
{ Args: { "p_key": string,"p_value": Json }; Returns: boolean
                           },
"submit_quiz":
{ Args: { "p_answers": Json,"p_lesson_id": string }; Returns: {
              "certified": boolean,"passed": boolean,"score": number,"total": number
            }[]
                           },
"verify_certificate":
{ Args: { "p_code": string }; Returns: {
              "expires_at": string,"first_name": string,"issued_at": string,"last_initial": string,"status": string,"store_name": string
            }[]
                           }
          }
          Enums: {
            "region": "AU"|"US"|"ALL"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "region": ["AU", "US", "ALL"]
          }
        }
} as const
