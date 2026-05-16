import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

const API = "http://localhost:5002/api/teacher";

// Додаємо локальний інтерфейс для стабільного ключа в UI
interface OptionField {
    localId: string; // Унікальний ключ для React
    text: string;
    isCorrect: boolean;
}

interface Topic {
    id: string;
    name: string;
    subject_id: string;
    subjects: { name: string };
}

interface Question {
    id: string;
    text: string;
    type: string;
    created_at: string;
    topics: {
        id: string;
        name: string;
        subjects: { name: string };
    };
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
};

// Хелпер для створення нового порожнього варіанту
const createEmptyOption = (isCorrect = false): OptionField => ({
    localId: crypto.randomUUID(), // Генеруємо стабільний ID
    text: "",
    isCorrect,
});

export default function TeacherDashboard() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
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
            try {
                const token = await getToken();
                const headers = { Authorization: `Bearer ${token}` };
                const [qRes, tRes] = await Promise.all([
                    fetch(`${API}/questions`, { headers }),
                    fetch(`${API}/topics`, { headers }),
                ]);

                if (!qRes.ok || !tRes.ok) throw new Error("Помилка завантаження даних");

                const qData = await qRes.json();
                const tData = await tRes.json();

                setQuestions(qData.questions ?? []);
                setTopics(tData.topics ?? []);

                if (tData.topics?.length > 0) {
                    setForm((f) => ({ ...f, topicId: tData.topics[0].id }));
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : "Невідома помилка");
            } finally {
                setLoading(false);
            }
        }
        fetchAll();
    }, []);

    const handleSubmit = async () => {
        if (!form.text.trim() || !form.topicId) {
            setError("Заповніть обов'язкові поля");
            return;
        }

        setSubmitting(true);
        try {
            const token = await getToken();
            // Перед відправкою очищуємо дані від localId (якщо бекенд їх не очікує)
            const payload = {
                ...form,
                options: form.options.map(({ text, isCorrect }) => ({ text, isCorrect }))
            };

            const res = await fetch(`${API}/questions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Помилка збереження");

            const { question } = await res.json();
            const topic = topics.find(t => t.id === form.topicId);
            
            const newQ: Question = {
                ...question,
                topics: {
                    id: form.topicId,
                    name: topic?.name ?? "",
                    subjects: { name: topic?.subjects?.name ?? "" }
                }
            };

            setQuestions([newQ, ...questions]);
            setShowForm(false);
            setSuccessMsg("Питання додано!");
            setTimeout(() => setSuccessMsg(null), 3000);
            
            // Скидаємо форму
            setForm(prev => ({
                ...prev,
                text: "",
                options: [createEmptyOption(true), createEmptyOption(), createEmptyOption(), createEmptyOption()]
            }));
        } catch (e) {
            setError("Не вдалося зберегти питання");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Видалити це питання?")) return;
        setDeletingId(id);
        try {
            const token = await getToken();
            await fetch(`${API}/questions/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            setQuestions(questions.filter(q => q.id !== id));
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <div className="p-10 text-center">Завантаження...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Панель викладача</h1>
                <button 
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? "Скасувати" : "+ Нове питання"}
                </button>
            </div>

            {successMsg && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{successMsg}</div>}
            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

            {showForm && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8 border">
                    <div className="mb-4">
                        <label htmlFor="q-text" className="block font-semibold mb-1">Текст питання *</label>
                        <textarea
                            id="q-text"
                            className="w-full border p-2 rounded"
                            value={form.text}
                            onChange={(e) => setForm({ ...form, text: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="q-type" className="block font-semibold mb-1">Тип</label>
                            <select
                                id="q-type"
                                className="w-full border p-2 rounded"
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                            >
                                {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="q-topic" className="block font-semibold mb-1">Тема *</label>
                            <select
                                id="q-topic"
                                className="w-full border p-2 rounded"
                                value={form.topicId}
                                onChange={(e) => setForm({ ...form, topicId: e.target.value })}
                            >
                                {topics.map(t => (
                                    <option key={t.id} value={t.id}>{t.subjects.name} — {t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <span className="block font-semibold mb-2">Варіанти відповідей</span>
                        {form.options.map((opt, idx) => (
                            <div key={opt.localId} className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    checked={opt.isCorrect}
                                    onChange={(e) => {
                                        const newOpts = [...form.options];
                                        newOpts[idx].isCorrect = e.target.checked;
                                        setForm({ ...form, options: newOpts });
                                    }}
                                    aria-label={`Варіант ${idx + 1} правильний`}
                                />
                                <input
                                    type="text"
                                    className="flex-1 border p-1 rounded"
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

                    <button 
                        disabled={submitting}
                        onClick={handleSubmit}
                        className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700"
                    >
                        {submitting ? "Збереження..." : "Зберегти питання"}
                    </button>
                </div>
            )}

            <div className="grid gap-4">
                {questions.map(q => (
                    <div key={q.id} className="bg-white p-4 rounded shadow border flex justify-between items-start">
                        <div>
                            <span className="text-xs font-bold uppercase text-blue-500">{QUESTION_TYPE_LABELS[q.type]}</span>
                            <p className="font-medium mt-1">{q.text}</p>
                            <p className="text-sm text-gray-500 mt-2">
                                {q.topics.subjects.name} / {q.topics.name}
                            </p>
                        </div>
                        <button 
                            disabled={deletingId === q.id}
                            onClick={() => handleDelete(q.id)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded"
                        >
                            {deletingId === q.id ? "..." : "🗑️"}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}