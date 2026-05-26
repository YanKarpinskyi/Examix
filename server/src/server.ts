import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "./config/db";
import type { RegisterDTO, LoginRequest, Role } from "@zno/shared";

const getParam = (req: Request, paramName: string): string => {
  const value = req.params[paramName];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
};

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

async function logAction(userId: string, action: string, details?: any) {
  try {
    await supabaseAdmin.from("user_logs").insert([{
      user_id: userId,
      action,
      details: details ?? null,
    }]);
  } catch (err) {
    console.error("❌ Log error:", err);
  }
}

function withLogging(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode < 400) {
        const userId = (req as any).userId;
        if (userId) logAction(userId, action, req.body);
      }
      return originalJson(body);
    };
    next();
  };
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
  
  const { data: profileData } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (profileData?.is_banned) {
    return res.status(403).json({ 
      error: "Ваш акаунт заблокований адміністратором платформи." 
    });
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: "Невірний email або пароль" });

  const token = jwt.sign(
    { userId: profileData.id, email: profileData.email, role: profileData.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  await logAction(profileData.id, "login");

  return res.json({ token, user: profileData });
});

app.post("/api/auth/logout", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  await logAction(userId, "logout");

  return res.json({ success: true, message: "Вихід успішно зафіксовано" });
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

app.post("/api/student/submit-test", requireAuth, withLogging("submit_test"), async (req: Request, res: Response) => {
    try {
        const { topic_id, subject_id, mode, answers, group_assignment_id } = req.body;
        const userId = (req as any).userId;

        const questionIds = Object.keys(answers);
        const { data: questions, error: qError } = await supabaseAdmin
            .from('questions')
            .select('id, type, correct_answer, points')
            .in('id', questionIds);

        if (qError) throw qError;

        let score = 0;
        let totalPoints = 0;

        for (const question of questions || []) {
            const userAnswer = answers[question.id];
            const correctAnswer = question.correct_answer;
            const points = question.points ?? 1;
            totalPoints += points;

            if (userAnswer === undefined || userAnswer === null) continue;

            let isCorrect = false;

            if (question.type === 'sequence' || question.type === 'sequense' || question.type === 'order') {
                const { data: fullQ } = await supabaseAdmin
                    .from('questions')
                    .select('options')
                    .eq('id', question.id)
                    .single();

                const options: string[] = fullQ?.options ?? [];
                
                const correctWords = (correctAnswer as string[]).map(
                    (idx: string) => options[Number(idx)]
                );

                isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctWords);

            } else if (question.type === 'multiple') {
                const userSorted = [...(userAnswer as string[])].sort();
                const correctSorted = [...(correctAnswer as string[])].sort();
                isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted);

            } else if (question.type === 'matching') {
                isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);

            } else {
                const u = String(userAnswer).trim().toLowerCase();
                const c = Array.isArray(correctAnswer)
                    ? correctAnswer.map((x: any) => String(x).trim().toLowerCase())
                    : [String(correctAnswer).trim().toLowerCase()];
                isCorrect = c.includes(u);
            }

            if (isCorrect) score += points;
        }

        const { data, error } = await supabaseAdmin
            .from('test_attempts')
            .insert([{
                user_id: userId,
                topic_id: topic_id ?? null,
                subject_id: subject_id ?? null,
                mode: mode,
                answers: answers,
                score: score,
                total_questions: questionIds.length,
                group_assignment_id: group_assignment_id ?? null,
            }])
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({ attemptId: data.id, score, totalPoints });

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
        const assignmentIds = (assignData || []).map((a: any) => a.id);

        const { data: completedAttempts } = await supabaseAdmin
            .from("test_attempts")
            .select("group_assignment_id")
            .eq("user_id", userId)
            .in("group_assignment_id", assignmentIds);

        const completedIds = new Set(
            (completedAttempts || []).map((a: any) => a.group_assignment_id)
        );

        assignments = (assignData || []).filter((a: any) => !completedIds.has(a.id));
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

app.post("/api/teacher/questions", requireAuth, requireRole(["teacher", "admin"]), withLogging("create_question"), async (req, res) => {
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

app.delete("/api/teacher/questions/:id", requireAuth, requireRole(["teacher", "admin"]), withLogging("delete_question"), async (req, res) => {
  try {
    const id = getParam(req, 'id');
    const { error } = await supabaseAdmin.from("questions").delete().eq("id", id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Не вдалося видалити питання", details: err.message });
  }
});

app.patch("/api/teacher/questions/:id", requireAuth, requireRole(["teacher", "admin"]), withLogging("edit_question"), async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
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

app.post("/api/admin/users", requireAuth, requireRole(["admin"]), async (req: Request, res: Response) => {
  const { email, password, username, role } = req.body;
  const adminId = (req as any).userId;

  if (!email || !password || !username || !role) {
    return res.status(400).json({ error: "Всі поля обов'язкові" });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, role },
  });

  if (authError) return res.status(400).json({ error: authError.message });

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ role, username })
    .eq("id", authData.user.id);

  if (profileError) return res.status(500).json({ error: profileError.message });

  await logAction(adminId, "create_user", {
    createdUserId: authData.user.id,
    email,
    role,
  });

  return res.status(201).json({ success: true, userId: authData.user.id });
});

app.get("/api/admin/logs", requireAuth, requireRole(["admin"]), async (req: Request, res: Response) => {
  const { search, limit = "50", offset = "0" } = req.query;

  let query = supabaseAdmin
    .from("user_logs")
    .select(`
      id, action, details, created_at,
      profiles!user_logs_user_id_fkey (id, username, email, role)
    `)
    .order("created_at", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (search) {
    const { data: matchedProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .or(`username.ilike.%${search}%,email.ilike.%${search}%`);

    const ids = (matchedProfiles || []).map(p => p.id);
    if (ids.length === 0) return res.json({ logs: [] });
    query = query.in("user_id", ids);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: data });
});

app.patch("/api/admin/users/:id/role", requireAuth, requireRole(["admin"]), async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  const { role } = req.body;
  const { error } = await supabaseAdmin.from("profiles").update({ role }).eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.patch("/api/admin/users/:id/ban", requireAuth, requireRole(["admin"]), withLogging("ban_user"), async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  const { banned } = req.body; 

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ is_banned: banned })
    .eq("id", id);

  if (profileError) return res.status(500).json({ error: profileError.message });

  const banDuration: string = banned ? "876600h" : "none";
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: banDuration,
  });

  if (authError) return res.status(500).json({ error: authError.message });

  return res.json({ success: true, banned });
});

app.delete("/api/admin/users/:id", requireAuth, requireRole(["admin"]), async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  const adminId = (req as any).userId;

  if (!id) {
    return res.status(400).json({ error: "ID користувача обов'язковий" });
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (authError) return res.status(500).json({ error: authError.message });

  await logAction(adminId, "delete_user", { deletedUserId: id });

  return res.json({ success: true });
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

app.post("/api/assignments", requireAuth, requireRole(["teacher", "admin"]), withLogging("create_assignment"), async (req: Request, res: Response) => {
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
  const id = getParam(req, 'id');
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

app.delete("/api/assignments/:id", requireAuth, requireRole(["teacher", "admin"]), withLogging("delete_assignment"), async (req: Request, res: Response) => {
  const id = getParam(req, 'id');

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
      .select("student_id, profiles:student_id ( id, username, email )")
      .eq("group_id", groupId);

    if (sError) return res.status(400).json({ error: sError.message });
    const studentIds = students.map((s: any) => s.student_id);

    if (studentIds.length === 0) {
      return res.json({ students: [], sessions: [], subjectStats: [], topicStats: [] });
    }

    const { data: attempts, error: attError } = await supabaseAdmin
      .from("test_attempts")
      .select(`
        id, score, total_questions, created_at, mode, user_id,
        topic:topic_id ( id, name, subject_id, subjects ( id, name ) ),
        subject:subject_id ( id, name )
      `)
      .in("user_id", studentIds)
      .order("created_at", { ascending: false });

    if (attError) return res.status(400).json({ error: attError.message });

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, email")
      .in("id", studentIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

    const sessions = (attempts || []).map((a: any) => ({
      ...a,
      profiles: profileMap.get(a.user_id) || { username: "Невідомий" },
      percentage: a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0,
      subjectName: a.topic?.subjects?.name ?? a.subject?.name ?? "НМТ симуляція",
      topicName: a.topic?.name ?? null,
    }));

    const subjectMap: Record<string, { name: string; attempts: number; totalScore: number; totalQ: number }> = {};
    for (const s of sessions) {
      const key = s.topic?.subjects?.id ?? s.subject?.id ?? "nmt";
      const name = s.subjectName;
      if (!subjectMap[key]) subjectMap[key] = { name, attempts: 0, totalScore: 0, totalQ: 0 };
      subjectMap[key].attempts++;
      subjectMap[key].totalScore += s.score;
      subjectMap[key].totalQ += s.total_questions;
    }
    const subjectStats = Object.entries(subjectMap).map(([id, v]) => ({
      id,
      name: v.name,
      attempts: v.attempts,
      avgPercent: v.totalQ > 0 ? Math.round((v.totalScore / v.totalQ) * 100) : 0,
    }));

    const topicMap: Record<string, { name: string; subjectName: string; attempts: number; totalScore: number; totalQ: number }> = {};
    for (const s of sessions) {
      if (!s.topic?.id) continue;
      const key = s.topic.id;
      if (!topicMap[key]) topicMap[key] = { name: s.topic.name, subjectName: s.subjectName, attempts: 0, totalScore: 0, totalQ: 0 };
      topicMap[key].attempts++;
      topicMap[key].totalScore += s.score;
      topicMap[key].totalQ += s.total_questions;
    }
    const topicStats = Object.entries(topicMap).map(([id, v]) => ({
      id,
      name: v.name,
      subjectName: v.subjectName,
      attempts: v.attempts,
      avgPercent: v.totalQ > 0 ? Math.round((v.totalScore / v.totalQ) * 100) : 0,
    })).sort((a, b) => a.avgPercent - b.avgPercent);

    return res.json({ students, sessions, subjectStats, topicStats });
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
  const answerId = getParam(req, 'answerId');
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