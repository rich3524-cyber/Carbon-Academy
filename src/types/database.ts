
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
            "answer_options": {
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
            [_ in never]: never
          }
          Functions: {
            "current_learner":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_quiz":
{ Args: { "p_lesson_id": string }; Returns: {
              "option_id": string,"option_text": string,"prompt": string,"question_id": string
            }[]
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
"save_lesson_progress":
{ Args: { "p_lesson_id": string,"p_percent": number,"p_position_seconds": number }; Returns: undefined
                           },
"setting_int":
{ Args: { "p_default": number,"p_key": string,"p_max": number,"p_min": number }; Returns: number
                           },
"submit_quiz":
{ Args: { "p_answers": Json,"p_lesson_id": string }; Returns: {
              "passed": boolean,"score": number,"total": number
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
