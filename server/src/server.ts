import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { supabase, supabaseAdmin } from "./config/db";
import type { RegisterDTO, Role } from "@zno/shared";

const app = express();
app.use(cors());
app.use(express.json());

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Токен відсутній" });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Невалідний токен" });

    (req as any).userId = user.id;
    (req as any).userEmail = user.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Помилка авторизації" });
  }
}

function requireRole(roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const userEmail = (req as any).userEmail;

    let userRole: Role = "student";

    if (userEmail && userEmail.endsWith("@knu.edu.ua")) {
      userRole = "teacher";
    } else {
      try {
        const { data, error } = await supabaseAdmin 
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (!error && data?.role) {
          userRole = data.role as Role;
        }
      } catch (dbError) {
        console.error("Помилка читання ролі з бази:", dbError);
      }
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: "Недостатньо прав" });
    }
    next();
  };
}

function detectRoleByEmail(email: string): Role {
  return email.endsWith("@knu.edu.ua") ? "teacher" : "student";
}

app.post("/api/auth/register", async (req: Request, res: Response) => {
  const { email, password, username }: RegisterDTO = req.body;
  const role = detectRoleByEmail(email);

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) return res.status(400).json({ error: authError.message });

  if (authData.user) {
    await supabaseAdmin.from("profiles").upsert([{ 
      id: authData.user.id,
      username,
      email,
      role
    }], { onConflict: "id" });
  }
  res.status(201).json({ user: { email, username, role } });
});

app.get("/api/teacher/questions", requireAuth, requireRole(["teacher", "admin"]), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin 
      .from("questions")
      .select(`
        id,
        content,
        type,
        created_at,
        options,
        points,
        correct_answer,
        topic_id,
        topics!fk_questions_topics (
          id,
          name,
          subject_id,
          subjects (
            id,
            name
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase Questions Error:", error.message);
      return res.status(400).json({ error: error.message });
    }
    res.json({ questions: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: "Помилка сервера", details: err.message });
  }
});

app.get("/api/teacher/topics", requireAuth, requireRole(["teacher", "admin"]), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin 
      .from("topics")
      .select(`
        id,
        name,
        subject_id,
        subjects (
          id,
          name
        )
      `);

    if (error) {
      console.error("❌ Supabase Topics Error:", error.message);
      return res.status(400).json({ error: error.message });
    }
    res.json({ topics: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: "Помилка сервера", details: err.message });
  }
});

app.post("/api/teacher/questions", requireAuth, requireRole(["teacher", "admin"]), async (req, res) => {
  try {
    const { text, type, topicId, options, points } = req.body;
    const validOptions = Array.isArray(options) ? options : [];
    
    const correctAnswer = validOptions.filter((o: any) => o.isCorrect).map((o: any) => o.text);

    const { data, error } = await supabaseAdmin
      .from("questions")
      .insert([{ 
        content: text, 
        type: type, 
        topic_id: topicId, 
        options: validOptions,
        points: points || 1, 
        correct_answer: correctAnswer 
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ question: data });
  } catch (err: any) {
    res.status(500).json({ error: "Не вдалося створити питання", details: err.message });
  }
});

app.delete("/api/teacher/questions/:id", requireAuth, requireRole(["teacher", "admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("questions").delete().eq("id", id);  

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Не вдалося видалити питання", details: err.message });
  }
});

app.patch("/api/teacher/questions/:id", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, options } = req.body;
    const validOptions = Array.isArray(options) ? options : [];
    
    const correctAnswer = validOptions.filter((o: any) => o.isCorrect).map((o: any) => o.text);

    const { data, error } = await supabaseAdmin
      .from("questions")
      .update({ 
        content: content, 
        options: validOptions, 
        correct_answer: correctAnswer 
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ question: data });
  } catch (err: any) {
    res.status(500).json({ error: "Не вдалося оновити питання", details: err.message });
  }
});

app.get("/api/admin/users", requireAuth, requireRole(["admin"]), async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin   
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data });
});

app.patch("/api/admin/users/:id/role", requireAuth, requireRole(["admin"]), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  const { error } = await supabaseAdmin.from("profiles").update({ role }).eq("id", id); 

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

const PORT = 5002;
app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));