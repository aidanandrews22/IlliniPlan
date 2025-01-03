export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: number
          subject: string | null
        }
        Insert: {
          id?: number
          subject?: string | null
        }
        Update: {
          id?: number
          subject?: string | null
        }
      }
      users: {
        Row: {
          id: number
          clerk_id: string
          email: string
          first_name: string
          last_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          clerk_id: string
          email: string
          first_name: string
          last_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          clerk_id?: string
          email?: string
          first_name?: string
          last_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      semester_plans: {
        Row: {
          id: number
          user_id: number
          term_id: number
          plan_name: string
          created_at: string
          updated_at: string
          complete: boolean
        }
        Insert: {
          id?: number
          user_id: number
          term_id: number
          plan_name?: string
          created_at?: string
          updated_at?: string
          complete?: boolean
        }
        Update: {
          id?: number
          user_id?: number
          term_id?: number
          plan_name?: string
          created_at?: string
          updated_at?: string
          complete?: boolean
        }
      }
      semester_plan_courses: {
        Row: {
          id: number
          semester_plan_id: number
          course_id: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          semester_plan_id: number
          course_id: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          semester_plan_id?: number
          course_id?: number
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: number
          subject: string
          number: string
          title: string | null
          credit_hours: string | null
          description: string | null
          degree_attributes: string | null
          section_info: string | null
        }
        Insert: {
          id?: number
          subject: string
          number: string
          title?: string | null
          credit_hours?: string | null
          description?: string | null
          degree_attributes?: string | null
          section_info?: string | null
        }
        Update: {
          id?: number
          subject?: string
          number?: string
          title?: string | null
          credit_hours?: string | null
          description?: string | null
          degree_attributes?: string | null
          section_info?: string | null
        }
      }
      terms: {
        Row: {
          id: number
          year: number
          season: 'fa' | 'sp' | 'su' | 'wi'
          combined: string
        }
        Insert: {
          id?: number
          year: number
          season: 'fa' | 'sp' | 'su' | 'wi'
          combined: string
        }
        Update: {
          id?: number
          year?: number
          season?: 'fa' | 'sp' | 'su' | 'wi'
          combined?: string
        }
      }
      course_prereqs: {
        Row: {
          id: number
          course_id: number
          prereq_count: number | null
          prereq_logic: Json | null
        }
        Insert: {
          id?: number
          course_id: number
          prereq_count?: number | null
          prereq_logic?: Json | null
        }
        Update: {
          id?: number
          course_id?: number
          prereq_count?: number | null
          prereq_logic?: Json | null
        }
      }
      course_offerings: {
        Row: {
          id: number
          course_id: number
          term_id: number
        }
        Insert: {
          id?: number
          course_id: number
          term_id: number
        }
        Update: {
          id?: number
          course_id?: number
          term_id?: number
        }
      }
      course_gpas: {
        Row: {
          id: number
          course_id: number
          term_id: number
          sched_type: string | null
          section_number: string | null
          a_plus: number | null
          a: number | null
          a_minus: number | null
          b_plus: number | null
          b: number | null
          b_minus: number | null
          c_plus: number | null
          c: number | null
          c_minus: number | null
          d_plus: number | null
          d: number | null
          d_minus: number | null
          f: number | null
          w: number | null
          primary_instructor: string | null
        }
        Insert: {
          id?: number
          course_id: number
          term_id: number
          sched_type?: string | null
          section_number?: string | null
          a_plus?: number | null
          a?: number | null
          a_minus?: number | null
          b_plus?: number | null
          b?: number | null
          b_minus?: number | null
          c_plus?: number | null
          c?: number | null
          c_minus?: number | null
          d_plus?: number | null
          d?: number | null
          d_minus?: number | null
          f?: number | null
          w?: number | null
          primary_instructor?: string | null
        }
        Update: {
          id?: number
          course_id?: number
          term_id?: number
          sched_type?: string | null
          section_number?: string | null
          a_plus?: number | null
          a?: number | null
          a_minus?: number | null
          b_plus?: number | null
          b?: number | null
          b_minus?: number | null
          c_plus?: number | null
          c?: number | null
          c_minus?: number | null
          d_plus?: number | null
          d?: number | null
          d_minus?: number | null
          f?: number | null
          w?: number | null
          primary_instructor?: string | null
        }
      }
      course_geneds: {
        Row: {
          id: number
          course_id: number
          acp: boolean
          cs: 'False' | 'US' | 'NW' | 'WCC' | null
          hum: 'False' | 'LA' | 'HP' | null
          nat: 'False' | 'PS' | 'LS' | null
          qr: 'False' | 'QR1' | 'QR2' | null
          sbs: 'False' | 'SS' | 'BSC' | null
        }
        Insert: {
          id?: number
          course_id: number
          acp?: boolean
          cs?: 'False' | 'US' | 'NW' | 'WCC' | null
          hum?: 'False' | 'LA' | 'HP' | null
          nat?: 'False' | 'PS' | 'LS' | null
          qr?: 'False' | 'QR1' | 'QR2' | null
          sbs?: 'False' | 'SS' | 'BSC' | null
        }
        Update: {
          id?: number
          course_id?: number
          acp?: boolean
          cs?: 'False' | 'US' | 'NW' | 'WCC' | null
          hum?: 'False' | 'LA' | 'HP' | null
          nat?: 'False' | 'PS' | 'LS' | null
          qr?: 'False' | 'QR1' | 'QR2' | null
          sbs?: 'False' | 'SS' | 'BSC' | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 