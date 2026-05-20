import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔍 ENV PATH:", path.resolve(__dirname, "../../.env"));
console.log("🔍 SUPABASE_URL:", supabaseUrl ? "✅" : "❌");
console.log("🔍 SERVICE_ROLE_KEY:", supabaseServiceRoleKey ? `✅ (${supabaseServiceRoleKey.length} chars)` : "❌");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Критична помилка: SUPABASE_URL або SUPABASE_SERVICE_ROLE_KEY не знайдено!");
  console.error("Перевірте, чи існує файл .env у корені проекту");
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log("✅ Supabase clients initialized successfully");