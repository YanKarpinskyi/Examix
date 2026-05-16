import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Примусово шукаємо .env у папці сервера
const envPath = path.resolve(__dirname, "../../.env");

if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length) {
      // Виправлено групування в регулярному виразі для SonarLint
      const value = valueParts.join("=").trim().replace(/(^['"])|(['"]$)/g, "");
      process.env[key.trim()] = value;
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Помилка: Ключі Supabase не знайдено в process.env!");
  console.error("Шлях, де шукали файл:", envPath);
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);