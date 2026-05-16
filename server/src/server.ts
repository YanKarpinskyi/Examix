import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { supabase } from "./config/db";
import type { RegisterDTO, Role } from "@zno/shared";

const app = express();
app.use(cors());
app.use(express.json());

// Middleware для авторизації
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Токен відсутній" });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Невалідний токен" });

  (req as any).userId = user.id;
  next();
}

// Middleware для перевірки ролі
function requireRole(roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();

    if (!data || !roles.includes(data.role as Role)) {
      return res.status(403).json({ error: "Недостатньо прав" });
    }
    next();
  };
}

function detectRoleByEmail(email: string): Role {
  return email.endsWith("@knu.edu.ua") ? "teacher" : "student";
}

// --- AUTH ---

app.post("/api/auth/register", async (req: Request, res: Response) => {
  const { email, password, username }: RegisterDTO = req.body;
  const role = detectRoleByEmail(email);

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) return res.status(400).json({ error: authError.message });

  if (authData.user) {
    await supabase.from("profiles").insert([{ id: authData.user.id, username, email, role }]);
  }
  res.status(201).json({ user: { email, username, role } });
});

// --- TEACHER ROUTES (JSONB Structure) ---

// Отримання списку усіх питань
app.get("/api/teacher/questions", requireAuth, requireRole(["teacher", "admin"]), async (req, res) => {
  const { data, error } = await supabase
    .from("questions")
    .select(`
            id, 
            content, 
            type, 
            created_at, 
            topics (
                id, 
                name, 
                subjects (name)
            )
        `)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ questions: data });
});

// Отримання списку тем
app.get("/api/teacher/topics", requireAuth, requireRole(["teacher", "admin"]), async (req, res) => {
  const { data, error } = await supabase
    .from("topics")
    .select("id, name, subject_id, subjects(name)");

  if (error) return res.status(500).json({ error: error.message });
  res.json({ topics: data });
});

// Створення нового питання (структура під JSONB)
app.post("/api/teacher/questions", requireAuth, requireRole(["teacher", "admin"]), async (req, res) => {
  const { text, type, topicId, options, points } = req.body;

  const { data, error } = await supabase
    .from("questions")
    .insert([{ 
        content: text, 
        type: type, 
        topic_id: topicId, 
        options: options, 
        points: points || 1,
        correct_answer: options.filter((o: any) => o.isCorrect) 
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ question: data });
});

// Видалення питання
app.delete("/api/teacher/questions/:id", requireAuth, requireRole(["teacher", "admin"]), async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("questions").delete().eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- ADMIN ROUTES ---

app.get("/api/admin/users", requireAuth, requireRole(["admin"]), async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data });
});

app.patch("/api/admin/users/:id/role", requireAuth, requireRole(["admin"]), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

const PORT = 5002;
app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));