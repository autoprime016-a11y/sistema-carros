import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pkuhbvroitpscbjjzyvv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdWhidnJvaXRwc2Niamp6eXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mzg5MTYsImV4cCI6MjA5MjAxNDkxNn0.REBWQOUJso2ldTg2t4Gcx4txuc1AeRjTm8f_C1srdkY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
