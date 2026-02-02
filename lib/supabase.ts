import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      forms: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          conversation_rules: string;
          business_info: any;
          data_fields: any;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['forms']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['forms']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          form_id: string;
          status: string;
          started_at: string;
          completed_at: string | null;
          created_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          created_at: string;
        };
      };
      responses: {
        Row: {
          id: string;
          conversation_id: string;
          form_id: string;
          extracted_data: any;
          completed_at: string;
          created_at: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          forms_limit: number;
          responses_limit: number;
          current_period_responses: number;
          period_start: string;
          period_end: string;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
