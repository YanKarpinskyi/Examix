import { useEffect, useState } from "react"; 
import { supabase } from "../services/supabaseClient"; 
import MathText from "../components/MathText"; 
import './TeacherDashboard.scss'; 

const API = "http://localhost:5002/api/teacher"; 

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

  const getToken = async () => { 
    const { data: { session } } = await supabase.auth.getSession(); 
    return session?.access_token ?? ""; 
  }; 

  useEffect(() => { 
    async function fetchAll() { 
      setLoading(true); 
      setError(null); 
      try { 
        const token = await getToken(); 
        const headers = { Authorization: `Bearer ${token}` }; 
        const [qRes, tRes] = await Promise.all([ 
          fetch(`${API}/questions`, { headers }), 
          fetch(`${API}/topics`, { headers }), 
        ]); 

        const qData = await qRes.json(); 
        const tData = await tRes.json(); 

        if (!qRes.ok) throw new Error(qData.error || "Помилка завантаження питань"); 
        if (!tRes.ok) throw new Error(tData.error || "Помилка завантаження тем"); 

        const fetchedQuestions: Question[] = qData.questions ?? [];
        const fetchedTopics: Topic[] = tData.topics ?? [];

        setQuestions(fetchedQuestions); 
        setTopics(fetchedTopics); 

        const uniqueSubjectsMap: Record<string, Subject> = {};
        fetchedTopics.forEach(t => {
          if (t.subjects) {
            uniqueSubjectsMap[t.subjects.id] = { id: t.subjects.id, name: t.subjects.name };
          }
        });
        const fetchedSubjects = Object.values(uniqueSubjectsMap);
        setSubjects(fetchedSubjects);

        if (fetchedSubjects.length > 0) {
          setSelectedSubjectId(fetchedSubjects[0].id);
          const filteredT = fetchedTopics.filter(t => t.subject_id === fetchedSubjects[0].id);
          if (filteredT.length > 0) {
            setSelectedTopicId(filteredT[0].id);
            setForm((f) => ({ ...f, topicId: filteredT[0].id })); 
          }
        }
      } catch (e) { 
        setError(e instanceof Error ? e.message : "Невідома помилка"); 
      } finally { 
        setLoading(false); 
      } 
    } 
    fetchAll(); 
  }, []); 

  const handleSubjectFilterChange = (subId: string) => {
    setSelectedSubjectId(subId);
    const filteredT = topics.filter(t => t.subject_id === subId);
    if (filteredT.length > 0) {
      setSelectedTopicId(filteredT[0].id);
    } else {
      setSelectedTopicId("");
    }
  };

  const handleFormSubjectChange = (subId: string) => {
    const filteredT = topics.filter(t => t.subject_id === subId);
    if (filteredT.length > 0) {
      setForm(f => ({ ...f, topicId: filteredT[0].id }));
    } else {
      setForm(f => ({ ...f, topicId: "" }));
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
      const token = await getToken(); 
      const payload = { ...form, options: form.options.map(({ text, isCorrect }) => ({ text, isCorrect })) }; 
      const res = await fetch(`${API}/questions`, { 
        method: "POST", 
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}`, 
        }, 
        body: JSON.stringify(payload), 
      }); 

      const resData = await res.json(); 
      if (!res.ok) throw new Error(resData.error || "Помилка збереження"); 

      const { question } = resData; 
      const topic = topics.find(t => t.id === form.topicId); 
      const newQ: Question = { 
        ...question, 
        topics: { 
          id: form.topicId, 
          name: topic?.name ?? "", 
          subjects: topic?.subjects ? { id: topic.subjects.id, name: topic.subjects.name } : null 
        } 
      }; 

      setQuestions([newQ, ...questions]); 
      setShowForm(false); 
      setSuccessMsg("Питання додано!"); 
      setTimeout(() => setSuccessMsg(null), 3000); 
      setForm(prev => ({ 
        ...prev, 
        text: "", 
        options: [createEmptyOption(true), createEmptyOption(), createEmptyOption(), createEmptyOption()] 
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
      const token = await getToken(); 
      const res = await fetch(`${API}/questions/${id}`, { 
        method: "DELETE", 
        headers: { Authorization: `Bearer ${token}` } 
      }); 
      if (!res.ok) throw new Error("Не вдалося видалити"); 
      setQuestions(questions.filter(q => q.id !== id)); 
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
      try { rawOptions = JSON.parse(rawOptions); } catch { rawOptions = []; }
    }
    if (!Array.isArray(rawOptions)) rawOptions = [];

    const normalized: OptionField[] = rawOptions.map((o: any) => ({
      localId: crypto.randomUUID(),
      text: typeof o === "string" ? o : (o?.text ?? ""),
      isCorrect: typeof o === "string" ? false : (o?.isCorrect ?? false),
    }));

    setEditOptions(normalized);
  };

  const handleUpdateQuestion = async (id: string) => {
    try {
      const token = await getToken();
      
      const cleanOptions = editOptions.map(({ text, isCorrect }) => ({ text, isCorrect }));

      const payload = { 
        content: editContent, 
        options: cleanOptions 
      };

      const res = await fetch(`${API}/questions/${id}`, { 
        method: "PATCH", 
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify(payload) 
      }); 

      const resData = await res.json(); 
      if (!res.ok) throw new Error(resData.error || "Помилка оновлення на сервері"); 

      const updatedQuestionFromServer = resData.question;

      setQuestions(questions.map(q => q.id === id ? { 
        ...q, 
        content: updatedQuestionFromServer.content, 
        options: updatedQuestionFromServer.options, 
        correct_answer: updatedQuestionFromServer.correct_answer
      } : q)); 

      setEditingQuestionId(null); 
      setSuccessMsg("Питання успішно відредаговано!"); 
      setTimeout(() => setSuccessMsg(null), 3000); 
    } catch (e: any) { 
      setError(e.message || "Не вдалося оновити дані"); 
    } 
  };

  const filteredQuestions = questions.filter(q => {
    if (!q.topics) return false;
    
    const matchesSubject = q.topics.subjects?.id === selectedSubjectId;
    if (!matchesSubject) return false;

    if (filterMode === "all") return true;
    if (filterMode === "topic") return q.topic_id === selectedTopicId;
    if (filterMode === "type") return q.type === selectedType;

    return true;
  });

  const filteredTopicsForSelect = topics.filter(t => t.subject_id === selectedSubjectId);

  if (loading) return <div className="td-loading">Завантаження контенту...</div>; 

  return ( 
    <div className="teacher-dashboard"> 
      <div className="td-inner"> 
        
        <div className="td-header"> 
          <h1>Панель викладача</h1> 
          <button 
            className={`td-btn-new ${showForm ? "cancel" : ""}`} 
            onClick={() => setShowForm(!showForm)} 
          > 
            {showForm ? "Скасувати" : "+ Нове питання"} 
          </button> 
        </div> 

        {successMsg && <div className="td-alert success">{successMsg}</div>} 
        {error && <div className="td-alert error">{error}</div>} 

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
                <select
                  id="q-sub-create"
                  className="td-select"
                  onChange={(e) => handleFormSubjectChange(e.target.value)}
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                  {topics.filter(t => t.subject_id === (document.getElementById('q-sub-create') as HTMLSelectElement)?.value || t.subject_id === subjects[0]?.id).map(t => ( 
                    <option key={t.id} value={t.id}>{t.name}</option> 
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
                    <option key={k} value={k}>{v}</option> 
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
          <span className="td-options-label" style={{ margin: 0 }}>Каскадний пошук та фільтрація тестів</span>
          
          <div className="td-grid">
            <div className="td-field">
              <label>1. Виберіть предмет</label>
              <select className="td-select" value={selectedSubjectId} onChange={(e) => handleSubjectFilterChange(e.target.value)}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {filterMode === "topic" && (
              <div className="td-field">
                <label>2. Виберіть тему</label>
                <select className="td-select" value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)}>
                  {filteredTopicsForSelect.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            {filterMode === "type" && (
              <div className="td-field">
                <label>2. Виберіть тип відповіді</label>
                <select className="td-select" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button 
              className="td-btn-new" 
              style={{ flex: 1, background: filterMode === "all" ? "var(--td-accent)" : "var(--td-surface-2)", color: filterMode === "all" ? "#0f1117" : "var(--td-text)" }}
              onClick={() => setFilterMode("all")}
            >
              Всі питання предмета
            </button>
            <button 
              className="td-btn-new" 
              style={{ flex: 1, background: filterMode === "topic" ? "var(--td-accent)" : "var(--td-surface-2)", color: filterMode === "topic" ? "#0f1117" : "var(--td-text)" }}
              onClick={() => setFilterMode("topic")}
            >
              За темою
            </button>
            <button 
              className="td-btn-new" 
              style={{ flex: 1, background: filterMode === "type" ? "var(--td-accent)" : "var(--td-surface-2)", color: filterMode === "type" ? "#0f1117" : "var(--td-text)" }}
              onClick={() => setFilterMode("type")}
            >
              За типом відповіді
            </button>
          </div>
        </div>

        <div className="td-questions"> 
          {filteredQuestions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--td-text-muted)" }}>Запитань за вказаними критеріями не знайдено.</div>
          ) : (
            filteredQuestions.map(q => ( 
              <div key={q.id} className="td-q-card" style={{ flexDirection: "column" }}> 
                
                {editingQuestionId === q.id ? (
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div className="td-field">
                      <label>Редагування тексту питання</label>
                      <textarea className="td-textarea" value={editContent} onChange={(e) => setEditContent(e.target.value)} />
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
                      <button className="td-btn-new" style={{ background: "var(--td-success)", color: "#0f1117" }} onClick={() => handleUpdateQuestion(q.id)}>Зберегти зміни</button>
                      <button className="td-btn-new cancel" onClick={() => setEditingQuestionId(null)}>Скасувати</button>
                    </div>
                  </div>
                ) : (
                  
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-start" }}>
                    <div className="td-q-body"> 
                      <span className="td-q-type"> 
                        {QUESTION_TYPE_LABELS[q.type] || q.type} 
                      </span> 
                      
                      <p className="td-q-text" style={{ fontSize: "1.1rem", fontWeight: "500" }}>
                        <MathText text={q.content} />
                      </p> 

                      <div style={{ margin: "10px 0", padding: "8px 12px", background: "rgba(110, 207, 160, 0.06)", borderLeft: "3px solid var(--td-success)", borderRadius: "4px" }}>
                        <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--td-success)", display: "block", marginBottom: "2px" }}>Правильна відповідь:</span>
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
                      <button className="td-btn-delete" style={{ color: "var(--td-accent)" }} onClick={() => startEditing(q)} title="Редагувати">✏️</button>
                      <button disabled={deletingId === q.id} onClick={() => handleDelete(q.id)} className="td-btn-delete" title="Видалити"> 
                        {deletingId === q.id ? "..." : "🗑️"} 
                      </button> 
                    </div>
                  </div>
                )}

              </div> 
            ))
          )}
        </div> 

      </div> 
    </div> 
  ); 
}