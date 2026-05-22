import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log("🔍 Ключ сервісу завантажено:", !!serviceRoleKey);

console.log("🔍 ENV PATH:", path.resolve(__dirname, "../../.env"));
console.log("🔍 SUPABASE_URL:", supabaseUrl ? "✅" : "❌");
console.log("🔍 SERVICE_ROLE_KEY:", serviceRoleKey ? `✅ (${serviceRoleKey.length} chars)` : "❌");
console.log("🔍 KEY початок:", serviceRoleKey?.substring(0, 30));

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Змінні середовища не знайдено!");
  process.exit(1);
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

supabaseAdmin.from("profiles").select("count").limit(1).then(({ error }) => {
  if (error) {
    console.error("❌ supabaseAdmin TEST FAILED:", error.message);
  } else {
    console.log("✅ supabaseAdmin працює з service role");
  }
});

console.log("✅ Supabase clients initialized successfully");

console.log("🔑 ПОВНИЙ KEY (перші 50):", serviceRoleKey?.substring(0, 50));
console.log("🔑 KEY довжина:", serviceRoleKey?.length);