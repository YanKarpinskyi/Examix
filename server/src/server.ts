import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
// import bcrypt from "bcrypt";
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
    console.log("🔍 [AUTH DEBUG] Роль в токені:", decoded.role);
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

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role }
    });

    if (authError) return res.status(400).json({ error: authError.message });
    
    const userId = authData.user.id;

    if (role === "student" && groupId) {
      const { error: groupError } = await supabaseAdmin
        .from("group_students")
        .insert([{ group_id: groupId, student_id: userId }]);
        
      if (groupError) {
        console.error("❌ Помилка додавання до групи:", groupError);
      }
    }

    return res.status(201).json({ 
      message: "Користувача успішно зареєстровано",
      userId: userId 
    });
  } catch (err: any) {
    res.status(500).json({ error: "Помилка сервера", details: err.message });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return res.status(400).json({ error: "Невірний email або пароль" });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  const token = jwt.sign(
    { userId: profile.id, email: profile.email, role: profile.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.json({ token, user: profile });
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

app.post("/api/student/submit-test", requireAuth, async (req: Request, res: Response) => {
    try {
        const { user_id, topic_id, subject_id, mode, answers } = req.body;
        const userId = (req as any).userId;

        const { data, error } = await supabaseAdmin
            .from('test_attempts')
            .insert([{
                user_id: userId,
                topic_id: topic_id,
                subject_id: subject_id,
                mode: mode,
                answers: answers,
                score: 0,
                total_questions: Object.keys(answers).length
            }])
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({ attemptId: data.id });
    } catch (err: any) {
        console.error("❌ Помилка при збереженні тесту:", err);
        return res.status(500).json({ error: "Не вдалося зберегти результати тесту" });
    }
});

app.get("/api/student/dashboard", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  console.log(`📊 Dashboard запит від userId: ${userId}`);

  try {
    const { data: studentGroups, error: groupError } = await supabaseAdmin
      .from("group_students")
      .select(`
        groups!group_students_group_id_fkey (
          id,
          name,
          faculty
        )
      `)
      .eq("student_id", userId);

    if (groupError) throw groupError;

    const { data: subjects, error: subError } = await supabaseAdmin
      .from("subjects")
      .select("id, name, description")
      .order("name");

    if (subError) throw subError;

    const groups = (studentGroups || []).map((g: any) => g.groups).filter(Boolean);
    const groupIds = groups.map((g: any) => g.id);

    let assignments: any[] = [];
    if (groupIds.length > 0) {
      const { data: assignData, error: assignError } = await supabaseAdmin
        .from("group_assignments")
        .select(`
          id,
          due_date,
          subject:subject_id (id, name),
          topic:topic_id (id, name),
          group:group_id (id, name)
        `)
        .in("group_id", groupIds);

      if (assignError) {
        console.error("❌ Assignments fetch error:", assignError);
      } else {
        assignments = assignData || [];
      }
    }

    console.log(`✅ Знайдено груп: ${groups.length}, призначень: ${assignments.length}`);

    return res.json({ 
      groups, 
      subjects: subjects || [], 
      assignments 
    });

  } catch (err: any) {
    console.error("❌ Dashboard error:", err);
    return res.status(500).json({ error: "Помилка завантаження дашборду", details: err.message });
  }
});

app.get("/api/teacher/questions", requireAuth, requireRole(["teacher", "admin"]), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("questions")
      .select(`
        id, content, type, created_at, options, points, correct_answer, topic_id, image_url,
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

app.get("/api/student/subjects/:subjectId", requireAuth, async (req: Request, res: Response) => {
  const { subjectId } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from("subjects")
      .select("id, name, description")
      .eq("id", subjectId)
      .single();

    if (error) return res.status(404).json({ error: "Предмет не знайдено" });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/student/subjects/:subjectId/topics", requireAuth, async (req: Request, res: Response) => {
  const { subjectId } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from("topics")
      .select("id, name, description")
      .eq("subject_id", subjectId)
      .order("name");

    if (error) return res.status(400).json({ error: error.message });
    res.json({ topics: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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


app.get("/api/teacher/groups", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("groups")
      .select(`
        id,
        name,
        faculty,
        created_at,
        group_students!group_students_group_id_fkey (
          count
        )
      `)
      .order("faculty")
      .order("name");

    if (error) return res.status(400).json({ error: error.message });

    const formatted = (data || []).map(g => ({
      ...g,
      student_count: parseInt(String(g.group_students?.[0]?.count ?? "0"), 10)
    }));

    res.json({ groups: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/public/groups-by-faculty", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("groups")
      .select("id, name, faculty")
      .order("faculty")
      .order("name");

    if (error) return res.status(400).json({ error: error.message });

    const byFaculty: Record<string, any[]> = {};
    (data || []).forEach(g => {
      const fac = g.faculty || "Інші";
      if (!byFaculty[fac]) byFaculty[fac] = [];
      byFaculty[fac].push(g);
    });

    res.json({ groupsByFaculty: byFaculty });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

app.get("/api/public/subjects", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin.from("subjects").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ subjects: data });
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

app.get("/api/groups/:groupId/students", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  const { groupId } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from("group_students")
      .select(`
        student_id,
        profiles!group_students_student_id_fkey (
          id,
          username,
          email
        )
      `)
      .eq("group_id", groupId);

    if (error) return res.status(400).json({ error: error.message });

    const students = (data || []).map((row: any) => row.profiles).filter(Boolean);
    return res.json({ students });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/assignments", requireAuth, async (req, res) => {
  console.log("📋 [GET ASSIGNMENTS] запит від userId:", (req as any).userId);
  
  const { data, error } = await supabaseAdmin
    .from("group_assignments")
    .select(`
      id, created_at, due_date, 
      group:group_id (name), 
      subject:subject_id (name), 
      topic:topic_id (name)
    `)
    .order("created_at", { ascending: false });

  console.log("📋 [GET ASSIGNMENTS] data:", data?.length ?? 0, "error:", error);
    
  if (error) return res.status(500).json({ error: error.message });
  res.json({ assignments: data });
});

app.post("/api/assignments", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  const requestStart = Date.now();
  console.log("======================================");
  console.log("📥 [CREATE ASSIGNMENT] REQUEST START");

  const { groupId, subjectId, topicId, dueDate } = req.body;
  const assignedBy = (req as any).userId;

  console.log("📦 Request body:", req.body);
  console.log("👤 assignedBy:", assignedBy);

  if (!assignedBy) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!groupId) {
    return res.status(400).json({ error: "groupId is required" });
  }

  let finalSubjectId = subjectId;
  let finalTopicId = topicId;

  if (topicId) {
    finalSubjectId = null;
    finalTopicId = topicId;
  } else {
    finalSubjectId = subjectId;
    finalTopicId = null;
  }

  if (!finalSubjectId && !finalTopicId) {
    return res.status(400).json({ error: "Потрібно вказати або предмет, або тему" });
  }

  try {
    const formattedDueDate = dueDate ?? null;

    const insertPayload = {
      group_id: groupId,
      subject_id: finalSubjectId,
      topic_id: finalTopicId,
      due_date: formattedDueDate,
      assigned_by: assignedBy
    };

    console.log("📤 Final insert payload:", insertPayload);

    const { data, error } = await supabaseAdmin
      .from("group_assignments")
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(400).json({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    }

    console.log("✅ Assignment created successfully");
    return res.status(201).json({ assignment: data });

  } catch (err: any) {
    console.error("❌ Server error:", err);
    return res.status(500).json({ error: "Помилка сервера", details: err.message });
  }
});

app.patch("/api/assignments/:id/due-date", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { dueDate } = req.body; 

  const { data, error } = await supabaseAdmin
    .from("group_assignments")
    .update({ due_date: dueDate ?? null })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ assignment: data });
});

app.delete("/api/assignments/:id", requireAuth, requireRole(["teacher", "admin"]), async (req: Request, res: Response) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from("group_assignments")
    .delete()
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true });
});

app.get("/api/student/topics/:topicId/questions", requireAuth, async (req: Request, res: Response) => {
  const { topicId } = req.params;

  try {
    const { data, error } = await supabaseAdmin
      .from("questions")
      .select(`
        id, 
        content, 
        type, 
        options, 
        correct_answer, 
        points,
        topic_id,
        image_url,           
        created_at
      `)
      .eq("topic_id", topicId)
      .order("created_at");

    if (error) {
      console.error("Questions fetch error:", error);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Завантажено ${data?.length || 0} питань для topic ${topicId}`);
    if (data && data.length > 0) {
      console.log("Приклад питання:", {
        content: data[0].content?.substring(0, 80) + "...",
        hasImage: !!data[0].image_url,
        image_url: data[0].image_url
      });
    }

    res.json({ questions: data || [] });
  } catch (err: any) {
    console.error("Server error fetching questions:", err);
    res.status(500).json({ error: "Помилка сервера при завантаженні питань" });
  }
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