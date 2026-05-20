import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "./config/db";
import type { RegisterDTO, LoginRequest, Role } from "@zno/shared";

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "Токен відсутній або має неправильний формат" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: Role };
    (req as any).userId = decoded.userId;
    (req as any).userEmail = decoded.email;
    (req as any).userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Невалідний або прострочений токен" });
  }
}

function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).userRole;
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
  try {
    const { email, password, username, groupId } = req.body;
    const role = detectRoleByEmail(email);

    const { data: existingUser } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: "Користувач з таким Email вже існує" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error: dbError } = await supabaseAdmin
      .from("profiles")
      .insert([{ username, email, role, password_hash: hashedPassword }])
      .select()
      .single();

    if (dbError || !newUser) {
      return res.status(400).json({ error: dbError?.message || "Не вдалося створити профіль" });
    }

    if (role === "student" && groupId) {
      const { error: groupError } = await supabaseAdmin
        .from("group_students")
        .insert([{ group_id: groupId, student_id: newUser.id }]);

      if (groupError) {
        console.error("❌ Помилка додавання студента до групи:", groupError.message);
      }
    }

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Внутрішня помилка сервера при реєстрації", details: err.message });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;
    
    console.log(`\n=== НАМАГАЄТЬСЯ УВІЙТИ: ${email} ===`);
    console.log(`Введений пароль (текст): "${password}"`);

    const { data: user, error: dbError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (dbError || !user) {
      console.log(`❌ Користувача з email ${email} не знайдено в базі або помилка БД`);
      return res.status(400).json({ error: "Невірний email або пароль" });
    }

    console.log(`Юзера знайдено! Хеш з бази: "${user.password_hash}"`);
    console.log(`Довжина хешу в базі: ${user.password_hash?.length} символів`);

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    console.log(`Результат Bcrypt перевірки: ${isPasswordValid}`);

    if (!isPasswordValid) {
      return res.status(400).json({ error: "Невірний email або пароль" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Внутрішня помилка сервера при вході", details: err.message });
  }
});

app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const { data: user, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, username, role, created_at")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Користувача не знайдено" });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Помилка сервера при перевірці сесії" });
  }
});

app.get("/api/teacher/questions", requireAuth, requireRole(["teacher", "admin"]), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("questions")
      .select(`
        id, content, type, created_at, options, points, correct_answer, topic_id,
        topics!fk_questions_topics ( id, name, subject_id, subjects ( id, name ) )
      `)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ questions: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: "Помилка сервера", details: err.message });
  }
});

app.get("/api/teacher/topics", requireAuth, requireRole(["teacher", "admin"]), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("topics")
      .select("id, name, subject_id, subjects ( id, name )");

    if (error) return res.status(400).json({ error: error.message });
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
      .insert([{ content: text, type: type, topic_id: topicId, options: validOptions, points: points || 1, correct_answer: correctAnswer }])
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
      .update({ content: content, options: validOptions, correct_answer: correctAnswer })
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

app.get("/api/public/groups", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin.from("groups").select("id, name, faculty");
    if (error) return res.status(400).json({ error: error.message });
    res.json({ groups: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: "Помилка сервера при отриманні груп", details: err.message });
  }
});

app.post("/api/groups", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  const { name } = req.body;
  const teacherId = (req as any).userId;
  const { data, error } = await supabaseAdmin.from("groups").insert([{ name, teacher_id: teacherId }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ group: data });
});

app.post("/api/groups/:groupId/students", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { email } = req.body;
  
  const { data: profile, error: pError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (pError || !profile) return res.status(444).json({ error: "Студента з таким email не знайдено" });

  const { error } = await supabaseAdmin.from("group_students").insert([{ group_id: groupId, student_id: profile.id }]);
  if (error) return res.status(400).json({ error: "Студент вже є у цій групі або сталася помилка" });
  return res.json({ success: true });
});

app.post("/api/assignments", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  const { groupId, subjectId, topicId, dueDate } = req.body;
  const userId = (req as any).userId;

  const { data, error } = await supabaseAdmin
    .from("group_assignments")
    .insert([{ group_id: groupId, subject_id: subjectId || null, topic_id: topicId || null, assigned_by: userId, due_date: dueDate || null }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ assignment: data });
});

app.get("/api/groups/:groupId/analytics", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  const { groupId } = req.params;
  
  try {
    const { data: students, error: sError } = await supabaseAdmin
      .from("group_students")
      .select("student_id, profiles:student_id ( username, email )")
      .eq("group_id", groupId);

    if (sError) return res.status(400).json({ error: sError.message });
    const studentIds = students.map((s: any) => s.student_id);

    const { data: attempts, error: attError } = await supabaseAdmin
      .from("test_attempts")
      .select("id, score, started_at, mode, user_id, total_questions")
      .in("user_id", studentIds);

    if (attError) return res.status(400).json({ error: attError.message });

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username")
      .in("id", studentIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

    const sessions = (attempts || []).map((a: any) => ({
      ...a,
      profiles: profileMap.get(a.user_id) || { username: "Невідомий" }
    }));

    return res.json({ students, sessions });
  } catch (err: any) {
    return res.status(500).json({ error: "Внутрішня помилка сервера", details: err.message });
  }
});

app.get("/api/review/pending", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  try {
    const { data: answers, error: answersError } = await supabaseAdmin
      .from("student_answers")
      .select(`
        id, 
        student_answer, 
        is_correct, 
        teacher_points, 
        created_at,
        question:question_id (
          id,
          content,
          type
        )
      `)
      .is("reviewed_at", null)
      .order("created_at", { ascending: false });

    if (answersError) {
      console.error("❌ Review pending DB error:", answersError);
      return res.status(400).json({ 
        error: answersError.message,
        details: answersError 
      });
    }

    const pendingReviews = (answers || []).filter((item: any) => 
      item.question?.type === "short" || item.question?.type === "open"
    );

    console.log(`✅ Завантажено ${pendingReviews.length} відкритих відповідей для перевірки`);

    return res.json({ pendingReviews });
  } catch (err: any) {
    console.error("❌ Review pending exception:", err);
    res.status(500).json({ 
      error: "Внутрішня помилка сервера при завантаженні відповідей", 
      details: err.message 
    });
  }
});

app.patch("/api/review/:answerId", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  const { answerId } = req.params;
  const { isCorrect, points } = req.body;
  const teacherId = (req as any).userId;

  const { data, error } = await supabaseAdmin
    .from("student_answers")
    .update({ is_correct: isCorrect, teacher_points: points, reviewed_by: teacherId, reviewed_at: new Date().toISOString() })
    .eq("id", answerId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true, updatedAnswer: data });
});

const PORT = 5002;
app.listen(PORT, () => console.log(`🚀 Server running on: http://localhost:${PORT}`));