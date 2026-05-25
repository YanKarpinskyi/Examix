import { useState, useEffect } from "react";
import MathText from "../components/MathText";
import StudentsModal from "../components/StudentsModal";
import "./TeacherDashboard.scss";
import { apiClient } from "../services/apiClient";

interface OptionField {
  localId?: string;
  text: string;
  isCorrect: boolean;
}

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
  subjects: { id: string; name: string } | null;
}

interface Question {
  id: string;
  content: string;
  type: string;
  created_at: string;
  options: OptionField[];
  correct_answer: any;
  topic_id: string;
  topics: {
    id: string;
    name: string;
    subjects: { id: string; name: string } | null;
  } | null;
}

interface NewQuestion {
  text: string;
  type: string;
  topicId: string;
  options: OptionField[];
}

interface Assignment {
  id: string;
  group: { name: string } | null;
  subject: { name: string } | null;
  topic: { name: string } | null;
  due_date?: string | null;
  created_at: string;
}

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleString("uk-UA", {
    timeZone: "Europe/Kyiv",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

const isOverdue = (dueDate: string | null | undefined) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

type MainTab = "questions" | "groups" | "assignments" | "analytics" | "review";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single: "Одна відповідь",
  multiple: "Кілька відповідей",
  matching: "Відповідність",
  order: "Порядок",
  sequense: "Послідовність",
  short: "Коротка відповідь",
};

const createEmptyOption = (isCorrect = false): OptionField => ({
  localId: crypto.randomUUID(),
  text: "",
  isCorrect,
});

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<MainTab>("questions");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"all" | "topic" | "type">("all");
  const [selectedType, setSelectedType] = useState<string>("single");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [editOptions, setEditOptions] = useState<OptionField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState<NewQuestion>({
    text: "",
    type: "single",
    topicId: "",
    options: [
      createEmptyOption(true),
      createEmptyOption(false),
      createEmptyOption(false),
      createEmptyOption(false),
    ],
  });

  const [groups, setGroups] = useState<any[]>([]);
  const [groupsByFaculty, setGroupsByFaculty] = useState<Record<string, any[]>>({});
  const [selectedFaculty, setSelectedFaculty] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [studentEmail, setStudentEmail] = useState("");
  const [assignmentType, setAssignmentType] = useState<"subject" | "topic">("subject");
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignTopicId, setAssignTopicId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [editingDueDateId, setEditingDueDateId] = useState<string | null>(null);
  const [editingDueDateValue, setEditingDueDateValue] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [studentsModalGroup, setStudentsModalGroup] = useState<string>("");
  const [studentsModalList, setStudentsModalList] = useState<any[]>([]);
  const [studentsModalLoading, setStudentsModalLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res1 = await apiClient.request<{ groups: any[] }>("/teacher/groups");
      setGroups(res1.groups || []);
      const res2 = await apiClient.request<{ groupsByFaculty: Record<string, any[]> }>("/public/groups-by-faculty");
      setGroupsByFaculty(res2.groupsByFaculty || {});
    } catch (e) {
      console.error(e);
    }
  };

  const filteredGroups = (selectedFaculty
    ? groups.filter((g) => g.faculty === selectedFaculty)
    : groups
  ).slice().sort((a, b) => (b.student_count ?? 0) - (a.student_count ?? 0));

  useEffect(() => {
    if (subjects.length > 0 && !assignSubjectId) {
      setAssignSubjectId(subjects[0].id);
    }
  }, [subjects]);

  const fetchAssignments = async () => {
    try {
      const data = await apiClient.request<{ assignments: Assignment[] }>("/assignments");
      setAssignments(data.assignments || []);
    } catch (err) {
      console.error("Помилка завантаження призначень:", err);
    }
  };

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      setError(null);
      try {
        const [qData, tData] = await Promise.all([
          apiClient.request<{ questions: Question[] }>("/teacher/questions"),
          apiClient.request<{ topics: Topic[] }>("/teacher/topics"),
        ]);

        const fetchedQuestions = qData.questions ?? [];
        const fetchedTopics = tData.topics ?? [];

        setQuestions(fetchedQuestions);
        setTopics(fetchedTopics);

        const uniqueSubjectsMap: Record<string, Subject> = {};
        fetchedTopics.forEach((t) => {
          if (t.subjects) {
            uniqueSubjectsMap[t.subjects.id] = {
              id: t.subjects.id,
              name: t.subjects.name,
            };
          }
        });

        const fetchedSubjects = Object.values(uniqueSubjectsMap);
        setSubjects(fetchedSubjects);

        if (fetchedSubjects.length > 0) {
          setSelectedSubjectId(fetchedSubjects[0].id);
          setAssignSubjectId(fetchedSubjects[0].id);

          const filteredT = fetchedTopics.filter((t) => t.subject_id === fetchedSubjects[0].id);
          if (filteredT.length > 0) {
            setSelectedTopicId(filteredT[0].id);
            setAssignTopicId(filteredT[0].id);
            setForm((f) => ({ ...f, topicId: filteredT[0].id }));
          }
        }

        await fetchGroupsData();
        await fetchPendingReviewsData();
        await fetchAssignments();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Невідома помилка");
      } finally {
        setLoading(false);
      }
    }
    fetchAllData();
  }, []);

  const fetchGroupsData = async () => {
    try {
      const data = await apiClient.request<{ groups: any[] }>("/teacher/groups");
      if (data.groups) setGroups(data.groups);
    } catch (err) {
      console.error("Помилка завантаження груп:", err);
    }
  };

  const fetchPendingReviewsData = async () => {
    try {
      const data = await apiClient.request<{ pendingReviews: any[] }>("/review/pending");
      if (data.pendingReviews) setPendingReviews(data.pendingReviews);
    } catch (err) {
      console.error("Не вдалося завантажити відкриті питання:", err);
    }
  };

  const handleSubjectFilterChange = (subId: string) => {
    setSelectedSubjectId(subId);
    const filteredT = topics.filter((t) => t.subject_id === subId);
    if (filteredT.length > 0) {
      setSelectedTopicId(filteredT[0].id);
    } else {
      setSelectedTopicId("");
    }
  };

  const handleFormSubjectChange = (subId: string) => {
    const filteredT = topics.filter((t) => t.subject_id === subId);
    if (filteredT.length > 0) {
      setForm((f) => ({ ...f, topicId: filteredT[0].id }));
    } else {
      setForm((f) => ({ ...f, topicId: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!form.text.trim() || !form.topicId) {
      setError("Заповніть обов'язкові поля");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        options: form.options.map(({ text, isCorrect }) => ({ text, isCorrect })),
      };
      const resData = await apiClient.request<{ question: any }>("/teacher/questions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const { question } = resData;
      const topic = topics.find((t) => t.id === form.topicId);
      const newQ: Question = {
        ...question,
        topics: {
          id: form.topicId,
          name: topic?.name ?? "",
          subjects: topic?.subjects
            ? { id: topic.subjects.id, name: topic.subjects.name }
            : null,
        },
      };
      setQuestions([newQ, ...questions]);
      setShowForm(false);
      setSuccessMsg("Питання додано!");
      setTimeout(() => setSuccessMsg(null), 3000);
      setForm((prev) => ({
        ...prev,
        text: "",
        options: [
          createEmptyOption(true),
          createEmptyOption(),
          createEmptyOption(),
          createEmptyOption(),
        ],
      }));
    } catch (e: any) {
      setError(e.message || "Не вдалося зберегти питання");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Видалити це питання?")) return;
    setDeletingId(id);
    try {
      await apiClient.request(`/teacher/questions/${id}`, { method: "DELETE" });
      setQuestions(questions.filter((q) => q.id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditContent(q.content);
    let rawOptions: any = q.options ?? [];
    if (typeof rawOptions === "string") {
      try {
        rawOptions = JSON.parse(rawOptions);
      } catch {
        rawOptions = [];
      }
    }
    if (!Array.isArray(rawOptions)) rawOptions = [];
    const normalized: OptionField[] = rawOptions.map((o: any) => ({
      localId: crypto.randomUUID(),
      text: typeof o === "string" ? o : o?.text ?? "",
      isCorrect: typeof o === "string" ? false : o?.isCorrect ?? false,
    }));
    setEditOptions(normalized);
  };

  const handleUpdateQuestion = async (id: string) => {
    try {
      const cleanOptions = editOptions.map(({ text, isCorrect }) => ({ text, isCorrect }));
      const payload = { content: editContent, options: cleanOptions };
      const resData = await apiClient.request<{ question: any }>(`/teacher/questions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const updatedQuestionFromServer = resData.question;
      setQuestions(
        questions.map((q) =>
          q.id === id
            ? {
                ...q,
                content: updatedQuestionFromServer.content,
                options: updatedQuestionFromServer.options,
                correct_answer: updatedQuestionFromServer.correct_answer,
              }
            : q
        )
      );
      setEditingQuestionId(null);
      setSuccessMsg("Питання успішно відредаговано!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setError(e.message || "Не вдалося оновити дані");
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await apiClient.request("/groups", {
        method: "POST",
        body: JSON.stringify({ name: newGroupName }),
      });
      setNewGroupName("");
      setSuccessMsg("Групу успішно створено!");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchGroupsData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return alert("Оберіть групу!");
    try {
      await apiClient.request(`/groups/${selectedGroup}/students`, {
        method: "POST",
        body: JSON.stringify({ email: studentEmail }),
      });
      alert("Студента додано успішно!");
      setStudentEmail("");
    } catch (err: any) {
      alert(err.message || "Помилка додавання студента");
    }
  };

  const handleAssignTest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGroup) return alert("Оберіть групу!");
    if (!assignSubjectId) return alert("Оберіть предмет!");

    if (assignmentType === "topic" && !assignTopicId) {
      return alert("Оберіть тему!");
    }

    const payload = {
      groupId: selectedGroup,
      subjectId: assignSubjectId,
      topicId: assignmentType === "topic" ? assignTopicId : null,
      dueDate: dueDate || null,
    };

    try {
      await apiClient.request("/assignments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      alert("Тест/Тему успішно призначено для групи!");
      setDueDate("");
    } catch (err: any) {
      alert(err.message || "Помилка призначення");
    }
  };

  const handleClearDueDate = async (assignmentId: string) => {
    if (!confirm("Скасувати дедлайн для цього призначення?")) return;
    try {
      await apiClient.request(`/assignments/${assignmentId}/due-date`, {
        method: "PATCH",
        body: JSON.stringify({ dueDate: null }),
      });
      setAssignments(prev =>
        prev.map(a => a.id === assignmentId ? { ...a, due_date: null } : a)
      );
    } catch (err: any) {
      alert(`Помилка: ${err.message}`);
    }
  };

  const handleSaveDueDate = async (assignmentId: string) => {
    try {
      const newDueDate = editingDueDateValue ? new Date(editingDueDateValue).toISOString() : null;
      await apiClient.request(`/assignments/${assignmentId}/due-date`, {
        method: "PATCH",
        body: JSON.stringify({ dueDate: newDueDate }),
      });
      setAssignments(prev =>
        prev.map(a => a.id === assignmentId ? { ...a, due_date: newDueDate } : a)
      );
      setEditingDueDateId(null);
      setEditingDueDateValue("");
    } catch (err: any) {
      alert(`Помилка: ${err.message}`);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string, groupName: string) => {
    if (!confirm(`Скасувати призначення для групи "${groupName}"? Цю дію не можна відмінити.`)) return;
    try {
      await apiClient.request(`/assignments/${assignmentId}`, { method: "DELETE" });
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (err: any) {
      alert(`Помилка: ${err.message}`);
    }
  };

  const startEditDueDate = (a: Assignment) => {
    setEditingDueDateId(a.id);
    if (a.due_date) {
      const local = new Date(a.due_date);
      const offset = local.getTimezoneOffset();
      const adjusted = new Date(local.getTime() - offset * 60000);
      setEditingDueDateValue(adjusted.toISOString().slice(0, 16));
    } else {
      setEditingDueDateValue("");
    }
  };

  const loadAnalytics = async (groupId: string) => {
    setSelectedGroup(groupId);
    try {
      const data = await apiClient.request(`/groups/${groupId}/analytics`);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReviewAnswer = async (answerId: string, isCorrect: boolean, points: number) => {
    try {
      await apiClient.request(`/review/${answerId}`, {
        method: "PATCH",
        body: JSON.stringify({ isCorrect, points }),
      });
      setPendingReviews((prev) => prev.filter((item) => item.id !== answerId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const loadStudents = async (groupId: string) => {
    const groupName = groups.find((g) => g.id === groupId)?.name ?? "Група";
    setStudentsModalGroup(groupName);
    setStudentsModalList([]);
    setStudentsModalLoading(true);
    setStudentsModalOpen(true);
    try {
      const data = await apiClient.request<{ students: any[] }>(`/groups/${groupId}/students`);
      setStudentsModalList(data.students ?? []);
    } catch (err: any) {
      setStudentsModalOpen(false);
      setError("Помилка завантаження студентів: " + err.message);
    } finally {
      setStudentsModalLoading(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (!q.topics) return false;
    const matchesSubject = q.topics.subjects?.id === selectedSubjectId;
    if (!matchesSubject) return false;
    if (filterMode === "all") return true;
    if (filterMode === "topic") return q.topic_id === selectedTopicId;
    if (filterMode === "type") return q.type === selectedType;
    return true;
  });

  const filteredTopicsForSelect = topics.filter((t) => t.subject_id === selectedSubjectId);
  const assignTopicsFiltered = topics.filter((t) => t.subject_id === assignSubjectId);

  if (loading) return <div className="td-loading">Завантаження контенту...</div>;

  return (
    <>
      <StudentsModal
        isOpen={studentsModalOpen}
        groupName={studentsModalGroup}
        students={studentsModalList}
        loading={studentsModalLoading}
        onClose={() => setStudentsModalOpen(false)}
      />
      <div className="teacher-dashboard">
      <div className="td-inner">
        <div className="td-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "15px" }}>
          <h1>👨‍🏫 Панель викладача Examix</h1>

          <div className="tabs-navigation" style={{ display: "flex", gap: "8px", width: "100%", flexWrap: "wrap" }}>
            <button
              className={`td-btn-new ${activeTab === "questions" ? "active-tab" : ""}`}
              onClick={() => setActiveTab("questions")}
              style={{
                background: activeTab === "questions" ? "var(--td-accent)" : "var(--td-surface-2)",
                color: activeTab === "questions" ? "#0f1117" : "var(--td-text)",
              }}
            >
              📚 Керування питаннями
            </button>
            <button
              className={`td-btn-new ${activeTab === "groups" ? "active-tab" : ""}`}
              onClick={() => setActiveTab("groups")}
              style={{
                background: activeTab === "groups" ? "var(--td-accent)" : "var(--td-surface-2)",
                color: activeTab === "groups" ? "#0f1117" : "var(--td-text)",
              }}
            >
              👥 Навчальні групи
            </button>
            <button
              className={`td-btn-new ${activeTab === "assignments" ? "active-tab" : ""}`}
              onClick={() => setActiveTab("assignments")}
              style={{
                background: activeTab === "assignments" ? "var(--td-accent)" : "var(--td-surface-2)",
                color: activeTab === "assignments" ? "#0f1117" : "var(--td-text)",
              }}
            >
              📅 Призначення тестів
            </button>
            <button
              className={`td-btn-new ${activeTab === "analytics" ? "active-tab" : ""}`}
              onClick={() => setActiveTab("analytics")}
              style={{
                background: activeTab === "analytics" ? "var(--td-accent)" : "var(--td-surface-2)",
                color: activeTab === "analytics" ? "#0f1117" : "var(--td-text)",
              }}
            >
              📊 Статистика учнів
            </button>
            <button
              className={`td-btn-new ${activeTab === "review" ? "active-tab" : ""}`}
              onClick={() => setActiveTab("review")}
              style={{
                background: activeTab === "review" ? "var(--td-accent)" : "var(--td-surface-2)",
                color: activeTab === "review" ? "#0f1117" : "var(--td-text)",
              }}
            >
              📝 Відкриті відповіді ({pendingReviews.length})
            </button>
          </div>
        </div>

        {successMsg && <div className="td-alert success" style={{ marginTop: "15px" }}>{successMsg}</div>}
        {error && <div className="td-alert error" style={{ marginTop: "15px" }}>{error}</div>}

        <div className="main-tab-content" style={{ marginTop: "20px" }}>
          {activeTab === "questions" && (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "15px" }}>
                <button className={`td-btn-new ${showForm ? "cancel" : ""}`} onClick={() => setShowForm(!showForm)}>
                  {showForm ? "Скасувати" : "+ Нове питання"}
                </button>
              </div>

              {showForm && (
                <div className="td-form">
                  <div className="td-field">
                    <label htmlFor="q-text">Текст питання *</label>
                    <textarea
                      id="q-text"
                      className="td-textarea"
                      value={form.text}
                      onChange={(e) => setForm({ ...form, text: e.target.value })}
                    />
                  </div>
                  <div className="td-grid">
                    <div className="td-field">
                      <label htmlFor="q-sub-create">Предмет</label>
                      <select id="q-sub-create" className="td-select" onChange={(e) => handleFormSubjectChange(e.target.value)}>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="td-field">
                      <label htmlFor="q-topic">Тема *</label>
                      <select
                        id="q-topic"
                        className="td-select"
                        value={form.topicId}
                        onChange={(e) => setForm({ ...form, topicId: e.target.value })}
                      >
                        {topics
                          .filter(
                            (t) =>
                              t.subject_id === (document.getElementById("q-sub-create") as HTMLSelectElement)?.value ||
                              t.subject_id === subjects[0]?.id
                          )
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="td-grid">
                    <div className="td-field">
                      <label htmlFor="q-type">Тип відповіді</label>
                      <select
                        id="q-type"
                        className="td-select"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      >
                        {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <span className="td-options-label">Варіанти відповідей (відмітьте правильні)</span>
                    {form.options.map((opt, idx) => (
                      <div key={opt.localId} className="td-option-row">
                        <input
                          type="checkbox"
                          checked={opt.isCorrect}
                          onChange={(e) => {
                            const newOpts = [...form.options];
                            newOpts[idx].isCorrect = e.target.checked;
                            setForm({ ...form, options: newOpts });
                          }}
                        />
                        <input
                          type="text"
                          placeholder={`Варіант ${idx + 1}`}
                          value={opt.text}
                          onChange={(e) => {
                            const newOpts = [...form.options];
                            newOpts[idx].text = e.target.value;
                            setForm({ ...form, options: newOpts });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <button disabled={submitting} onClick={handleSubmit} className="td-btn-submit">
                    {submitting ? "Збереження..." : "Зберегти питання"}
                  </button>
                </div>
              )}

              <div className="td-form" style={{ gap: "14px", marginBottom: "20px" }}>
                <span className="td-options-label" style={{ margin: 0 }}>
                  Каскадний пошук та фільтрація тестів
                </span>
                <div className="td-grid">
                  <div className="td-field">
                    <label>1. Виберіть предмет</label>
                    <select
                      className="td-select"
                      value={selectedSubjectId}
                      onChange={(e) => handleSubjectFilterChange(e.target.value)}
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {filterMode === "topic" && (
                    <div className="td-field">
                      <label>2. Виберіть тему</label>
                      <select
                        className="td-select"
                        value={selectedTopicId}
                        onChange={(e) => setSelectedTopicId(e.target.value)}
                      >
                        {filteredTopicsForSelect.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {filterMode === "type" && (
                    <div className="td-field">
                      <label>2. Виберіть тип відповіді</label>
                      <select
                        className="td-select"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                      >
                        {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button
                    className="td-btn-new"
                    style={{
                      flex: 1,
                      background: filterMode === "all" ? "var(--td-accent)" : "var(--td-surface-2)",
                      color: filterMode === "all" ? "#0f1117" : "var(--td-text)",
                    }}
                    onClick={() => setFilterMode("all")}
                  >
                    Всі питання предмета
                  </button>
                  <button
                    className="td-btn-new"
                    style={{
                      flex: 1,
                      background: filterMode === "topic" ? "var(--td-accent)" : "var(--td-surface-2)",
                      color: filterMode === "topic" ? "#0f1117" : "var(--td-text)",
                    }}
                    onClick={() => setFilterMode("topic")}
                  >
                    За темою
                  </button>
                  <button
                    className="td-btn-new"
                    style={{
                      flex: 1,
                      background: filterMode === "type" ? "var(--td-accent)" : "var(--td-surface-2)",
                      color: filterMode === "type" ? "#0f1117" : "var(--td-text)",
                    }}
                    onClick={() => setFilterMode("type")}
                  >
                    За типом відповіді
                  </button>
                </div>
              </div>

              <div className="td-questions">
                {filteredQuestions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px", color: "var(--td-text-muted)" }}>
                    Запитань за вказаними критеріями не знайдено.
                  </div>
                ) : (
                  filteredQuestions.map((q) => (
                    <div key={q.id} className="td-q-card" style={{ flexDirection: "column" }}>
                      {editingQuestionId === q.id ? (
                        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div className="td-field">
                            <label>Редагування текста питання</label>
                            <textarea
                              className="td-textarea"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                            />
                          </div>
                          <div>
                            <span className="td-options-label">Редагування варіантів та правильних відповідей</span>
                            {editOptions.map((opt, idx) => (
                              <div key={idx} className="td-option-row">
                                <input
                                  type="checkbox"
                                  checked={opt.isCorrect}
                                  onChange={(e) => {
                                    const updated = [...editOptions];
                                    updated[idx].isCorrect = e.target.checked;
                                    setEditOptions(updated);
                                  }}
                                />
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => {
                                    const updated = [...editOptions];
                                    updated[idx].text = e.target.value;
                                    setEditOptions(updated);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                            <button
                              className="td-btn-new"
                              style={{ background: "var(--td-success)", color: "#0f1117" }}
                              onClick={() => handleUpdateQuestion(q.id)}
                            >
                              Зберегти зміни
                            </button>
                            <button className="td-btn-new cancel" onClick={() => setEditingQuestionId(null)}>
                              Скасувати
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-start" }}>
                          <div className="td-q-body">
                            <span className="td-q-type">{QUESTION_TYPE_LABELS[q.type] || q.type}</span>
                            <p className="td-q-text" style={{ fontSize: "1.1rem", fontWeight: "500" }}>
                              <MathText text={q.content} />
                            </p>
                            <div
                              style={{
                                margin: "10px 0",
                                padding: "8px 12px",
                                background: "rgba(110, 207, 160, 0.06)",
                                borderLeft: "3px solid var(--td-success)",
                                borderRadius: "4px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  textTransform: "uppercase",
                                  color: "var(--td-success)",
                                  display: "block",
                                  marginBottom: "2px",
                                }}
                              >
                                Правильна відповідь:
                              </span>
                              <div style={{ fontSize: "0.92rem", color: "var(--td-text)" }}>
                                {(() => {
                                  const rawOptions = q.options;
                                  let parsedOptions: any = [];
                                  if (rawOptions) {
                                    parsedOptions = typeof rawOptions === "string" ? JSON.parse(rawOptions) : rawOptions;
                                  }
                                  if (!Array.isArray(parsedOptions)) {
                                    return <span style={{ color: "var(--td-accent)" }}>Помилка структури options (не є масивом)</span>;
                                  }
                                  const correctOnes = parsedOptions.filter((o: any) => o && o.isCorrect) || [];
                                  if (correctOnes.length > 0) {
                                    return correctOnes.map((o: any, i: number) => (
                                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ color: "var(--td-success)" }}>✓</span>
                                        <MathText text={o.text || ""} />
                                      </div>
                                    ));
                                  } else {
                                    return <span style={{ color: "var(--td-text-muted)" }}>Не вказано (перевірте прапорці у редагуванні)</span>;
                                  }
                                })()}
                              </div>
                            </div>
                            <p className="td-q-meta">
                              {q.topics?.subjects?.name ?? "Без предмета"} / {q.topics?.name ?? "Без теми"}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="td-btn-delete"
                              style={{ color: "var(--td-accent)" }}
                              onClick={() => startEditing(q)}
                              title="Редагувати"
                            >
                              ✏️
                            </button>
                            <button
                              disabled={deletingId === q.id}
                              onClick={() => handleDelete(q.id)}
                              className="td-btn-delete"
                              title="Видалити"
                            >
                              {deletingId === q.id ? "..." : "🗑️"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === "groups" && (
            <div className="td-form">
              <h2>👥 Навчальні групи</h2>
              <p style={{ color: "var(--td-text-muted)", marginBottom: "20px" }}>
                Перегляд та управління навчальними групами по факультетах
              </p>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Оберіть факультет:
                </label>
                <select
                  className="td-select"
                  style={{ width: "100%", maxWidth: "400px" }}
                  value={selectedFaculty}       
                  onChange={(e) => {
                    setSelectedFaculty(e.target.value)
                    console.log("Обрано факультет:", e.target.value);
                  }}
                >
                  <option value="">Всі факультети</option>
                  {Object.keys(groupsByFaculty).map((fac) => (
                    <option key={fac} value={fac}>
                      {fac} ({groupsByFaculty[fac].length})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--td-surface)", borderRadius: "8px" }}>
                  <thead>
                    <tr style={{ background: "var(--td-surface-2)", textAlign: "left" }}>
                      <th style={{ padding: "12px" }}>Назва групи</th>
                      <th style={{ padding: "12px" }}>Факультет</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>Кількість студентів</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "var(--td-text-muted)" }}>
                          Ще немає створених груп
                        </td>
                      </tr>
                    ) : (
                      filteredGroups.map((g: any) => (
                        <tr key={g.id} style={{ borderBottom: "1px solid var(--td-surface-2)" }}>
                          <td style={{ padding: "12px", fontWeight: "500" }}>{g.name}</td>
                          <td style={{ padding: "12px", color: "#888" }}>{g.faculty || "—"}</td>
                          <td style={{ padding: "12px", textAlign: "center", fontWeight: "bold" }}>
                            {g.student_count || 0} студентів
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <button
                              className="td-btn-new"
                              style={{ padding: "6px 12px", fontSize: "0.9rem" }}
                              onClick={() => loadStudents(g.id)}  
                            >
                              Переглянути студентів
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <hr style={{ border: "1px solid var(--td-surface-2)", margin: "30px 0" }} />

              <h3>Створити нову групу</h3>
              <form onSubmit={handleCreateGroup} style={{ display: "flex", gap: "12px", marginBottom: "25px" }}>
                <input
                  type="text"
                  className="td-select"
                  style={{ background: "var(--td-surface)", color: "#fff", padding: "10px", flex: 1 }}
                  placeholder="Назва групи (наприклад: КН-241)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
                <button type="submit" className="td-btn-submit" style={{ margin: 0, whiteSpace: "nowrap" }}>
                  Створити групу
                </button>
              </form>

              <h3>Зарахувати студента</h3>
              <form onSubmit={handleAddStudent} className="td-grid" style={{ marginTop: "15px" }}>
                <div className="td-field">
                  <label>Група</label>
                  <select
                    className="td-select"
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    required
                  >
                    <option value="">-- Оберіть групу --</option>
                    {filteredGroups.map((g: any) => (
                      <option key={g.id} value={g.id}>
                        {g.name} {g.faculty ? `(${g.faculty})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="td-field">
                  <label>Email студента</label>
                  <input
                    type="email"
                    className="td-select"
                    style={{ background: "var(--td-surface)", color: "#fff" }}
                    placeholder="student@gmail.com"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button type="submit" className="td-btn-submit" style={{ margin: 0, width: "100%" }}>
                    Додати до групи
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "assignments" && (
            <div className="td-form">
              <h2>Призначити нове тестування для групи</h2>
              <form onSubmit={handleAssignTest} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
                <div className="td-field">
                  <label>1. Оберіть навчальну групу:</label>
                  <select
                    className="td-select"
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    required
                  >
                    <option value="">-- Виберіть групу --</option>
                    {filteredGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="td-field">
                  <label>2. Що саме ви хочете призначити?</label>
                  <div style={{ display: "flex", gap: "15px", marginTop: "5px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="radio"
                        checked={assignmentType === "subject"}
                        onChange={() => setAssignmentType("subject")}
                      />
                      Весь Предмет (Симуляція НМТ)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="radio"
                        checked={assignmentType === "topic"}
                        onChange={() => setAssignmentType("topic")}
                      />
                      Тест за конкретною Темою
                    </label>
                  </div>
                </div>

                <div className="td-grid">
                  <div className="td-field">
                    <label>Оберіть предмет:</label>
                    <select
                      className="td-select"
                      value={assignSubjectId}
                      onChange={(e) => {
                        setAssignSubjectId(e.target.value);
                        const filtered = topics.filter((t) => t.subject_id === e.target.value);
                        if (filtered.length > 0) setAssignTopicId(filtered[0].id);
                      }}
                      required
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {assignmentType === "topic" && (
                    <div className="td-field">
                      <label>Оберіть тему предмета:</label>
                      <select
                        className="td-select"
                        value={assignTopicId}
                        onChange={(e) => setAssignTopicId(e.target.value)}
                        required
                      >
                        {assignTopicsFiltered.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="td-field" style={{ maxWidth: "300px" }}>
                  <label>Кінцевий термін здачі (Дедлайн - необов'язково):</label>
                  <input
                    type="datetime-local"
                    className="td-select"
                    style={{ background: "var(--td-surface)", color: "#fff" }}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <button type="submit" className="td-btn-submit" style={{ alignSelf: "flex-start", marginTop: "10px" }}>
                  🚀 Надіслати призначення групі
                </button>
              </form>
              <hr style={{ border: "1px solid var(--td-surface-2)", margin: "30px 0" }} />
              <h3 style={{ marginBottom: "16px" }}>
                Активні призначення
                <span style={{ marginLeft: "10px", fontSize: "0.9rem", color: "var(--td-text-muted)", fontWeight: "normal" }}>
                  ({assignments.length})
                </span>
              </h3>

              {assignments.length === 0 ? (
                <p style={{ color: "var(--td-text-muted)", fontStyle: "italic" }}>Ще немає призначених тестів.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {assignments.map(a => {
                    const overdue = isOverdue(a.due_date);
                    const isEditingThis = editingDueDateId === a.id;
                    return (
                      <div key={a.id} style={{
                        padding: "16px",
                        background: "var(--td-surface)",
                        borderRadius: "10px",
                        border: overdue ? "1px solid #ef4444" : "1px solid var(--td-surface-2)",
                        display: "flex", flexDirection: "column", gap: "10px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                          <div>
                            <span style={{ fontSize: "1rem", fontWeight: "bold", color: "var(--td-accent)" }}>
                              👥 {a.group?.name ?? "—"}
                            </span>
                            <span style={{ margin: "0 8px", color: "var(--td-text-muted)" }}>→</span>
                            <span style={{ fontSize: "0.95rem", color: "var(--td-text)" }}>
                              {a.topic
                                ? <>📌 <strong>{a.topic.name}</strong> <span style={{ color: "var(--td-text-muted)", fontSize: "0.85rem" }}>(тема)</span></>
                                : <>📚 <strong>{a.subject?.name ?? "Весь предмет"}</strong> <span style={{ color: "var(--td-text-muted)", fontSize: "0.85rem" }}>(предмет)</span></>
                              }
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteAssignment(a.id, a.group?.name ?? "—")}
                            style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                          >
                            🗑 Скасувати тест
                          </button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--td-text-muted)" }}>⏰ Дедлайн:</span>
                          {isEditingThis ? (
                            <>
                              <input
                                type="datetime-local"
                                value={editingDueDateValue}
                                onChange={(e) => setEditingDueDateValue(e.target.value)}
                                style={{ padding: "4px 8px", borderRadius: "6px", border: "none", fontSize: "0.85rem" }}
                              />
                              <button onClick={() => handleSaveDueDate(a.id)}
                                style={{ background: "#166534", color: "#86efac", border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "0.8rem" }}>
                                ✓ Зберегти
                              </button>
                              <button onClick={() => { setEditingDueDateId(null); setEditingDueDateValue(""); }}
                                style={{ background: "var(--td-surface-2)", color: "var(--td-text)", border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "0.8rem" }}>
                                Відміна
                              </button>
                            </>
                          ) : (
                            <>
                              {a.due_date ? (
                                <span style={{
                                  fontSize: "0.9rem", fontWeight: "500",
                                  color: overdue ? "#f87171" : "#34d399",
                                  background: overdue ? "#450a0a" : "#064e3b",
                                  padding: "2px 8px", borderRadius: "4px"
                                }}>
                                  {formatDateTime(a.due_date)}{overdue && " ⚠️ Прострочено"}
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.85rem", color: "var(--td-text-muted)", fontStyle: "italic" }}>Без дедлайну</span>
                              )}
                              <button onClick={() => startEditDueDate(a)}
                                style={{ background: "var(--td-surface-2)", color: "var(--td-accent)", border: "none", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontSize: "0.78rem" }}>
                                ✏️ Змінити
                              </button>
                              {a.due_date && (
                                <button onClick={() => handleClearDueDate(a.id)}
                                  style={{ background: "#451a03", color: "#fdba74", border: "none", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontSize: "0.78rem" }}>
                                  ✕ Скасувати дедлайн
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "var(--td-text-muted)" }}>
                          Створено: {formatDateTime(a.created_at)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="td-form">
              <h3>Перегляд журналу оцінок за групами:</h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", margin: "15px 0" }}>
                {filteredGroups.map((g) => (
                  <button
                    key={g.id}
                    className="td-btn-new"
                    style={{
                      background: selectedGroup === g.id ? "var(--td-accent)" : "var(--td-surface-2)",
                      color: selectedGroup === g.id ? "#0f1117" : "var(--td-text)",
                    }}
                    onClick={() => loadAnalytics(g.id)}
                  >
                    {g.name}
                  </button>
                ))}
                {groups.length === 0 && (
                  <p style={{ color: "var(--td-text-muted)" }}>Спочатку створіть групу у вкладці «Навчальні групи».</p>
                )}
              </div>

              {analytics && (
                <div style={{ marginTop: "20px" }}>
                  <h4 style={{ marginBottom: "10px" }}>Кількість студентів у групі: {analytics.students?.length || 0}</h4>

                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse", background: "var(--td-surface)", borderRadius: "6px" }}
                    >
                      <thead>
                        <tr style={{ background: "var(--td-surface-2)", textAlign: "left" }}>
                          <th style={{ padding: "12px" }}>Студент</th>
                          <th style={{ padding: "12px" }}>Об'єкт тестування</th>
                          <th style={{ padding: "12px" }}>Набраний бал (%)</th>
                          <th style={{ padding: "12px" }}>Статус</th>
                          <th style={{ padding: "12px" }}>Дата спроби</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.sessions?.map((s: any) => (
                          <tr key={s.id} style={{ borderBottom: "1px solid var(--td-surface-2)" }}>
                            <td style={{ padding: "12px" }}>{s.profiles?.username || "Невідомий користувач"}</td>
                            <td style={{ padding: "12px" }}>{s.test?.title || "Тест по темі"}</td>
                            <td style={{ padding: "12px", fontWeight: "bold", color: "var(--td-success)" }}>{s.score}</td>
                            <td style={{ padding: "12px" }}>
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "0.85rem",
                                  background:
                                    s.status === "completed" ? "rgba(40, 167, 69, 0.2)" : "rgba(255, 193, 7, 0.2)",
                                  color: s.status === "completed" ? "#28a745" : "#ffc107",
                                }}
                              >
                                {s.status || "completed"}
                              </span>
                            </td>
                            <td style={{ padding: "12px", fontSize: "0.9rem" }}>
                              {new Date(s.started_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                        {(!analytics.sessions || analytics.sessions.length === 0) && (
                          <tr>
                            <td
                              colSpan={5}
                              style={{ padding: "20px", textAlign: "center", color: "var(--td-text-muted)" }}
                            >
                              Студенти цієї групи ще не проходили призначених тестів.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "review" && (
            <div className="td-form">
              <h2>Ручна перевірка розгорнутих відповідей учнів</h2>
              <p style={{ color: "var(--td-text-muted)", marginBottom: "20px" }}>
                Тут відображаються текстові есе та короткі відкриті питання, які потребують підтвердження викладача.
              </p>

              {pendingReviews.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--td-success)" }}>
                  🎉 Усі розгорнуті відповіді перевірено! Нових запитів немає.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {pendingReviews.map((item: any) => (
                    <div
                      key={item.id}
                      style={{
                        background: "var(--td-surface)",
                        border: "1px solid var(--td-surface-2)",
                        borderRadius: "8px",
                        padding: "16px",
                      }}
                    >
                      <div style={{ fontSize: "0.9rem", color: "var(--td-accent)", marginBottom: "8px" }}>
                        <strong>Учень:</strong> {item.session?.profiles?.username || "Студент"}
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            textTransform: "uppercase",
                            background: "rgba(255,255,255,0.1)",
                            padding: "2px 6px",
                            borderRadius: "3px",
                          }}
                        >
                          Завдання
                        </span>
                        <p style={{ marginTop: "4px", fontSize: "1.05rem" }}>{item.question?.content}</p>
                      </div>
                      <div
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          borderLeft: "4px solid var(--td-accent)",
                          padding: "10px",
                          borderRadius: "4px",
                          marginBottom: "15px",
                        }}
                      >
                        <strong style={{ fontSize: "0.85rem", color: "var(--td-text-muted)" }}>Написана відповідь учня:</strong>
                        <p style={{ marginTop: "4px", fontStyle: "italic", color: "#fff" }}>{item.student_answer}</p>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          className="td-btn-new"
                          style={{ background: "var(--td-success)", color: "#0f1117" }}
                          onClick={() => handleReviewAnswer(item.id, true, 1)}
                        >
                          ✓ Зарахувати як правильну (+1 бал)
                        </button>
                        <button
                          className="td-btn-new cancel"
                          onClick={() => handleReviewAnswer(item.id, false, 0)}
                        >
                          ✕ Відхилити (0 балів)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}