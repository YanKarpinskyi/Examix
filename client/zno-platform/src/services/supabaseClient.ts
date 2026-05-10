import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Помилка: Ключі Supabase не знайдено в .env файлі фронтенду!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);