import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { supabase } from '../services/supabaseClient';
import { useTheme } from '../context/ThemeContext';
import QuestionRenderer from '../components/QuestionRenderer';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import './QuizPage.scss';
import 'katex/dist/katex.min.css';

interface QuizPageProps {
  mode?: 'default' | 'nmt';
}

const NMT_CONFIGS: Record<string, any> = {
  'Історія України': { single: 20, matching: 4, sequence: 3, multiple: 3 },
  'Українська мова': { matching: 5, single: 25 },
  'Математика': { single: 15, matching: 3, short: 4 },
  'default': { single: 30 }
};

export default function QuizPage({ mode = 'default' }: QuizPageProps) {
  const { topicId, subjectId } = useParams();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignmentId");
  const navigate = useNavigate();
  const isErrorMode = searchParams.get('mode') === 'errors';
  const urlTime = Number(searchParams.get('time')) || 0;

  const { isDark } = useTheme();

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(mode === 'nmt' ? 3600 : urlTime * 60);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        if (mode === 'nmt' && subjectId) {
          const topicsRes = await apiClient.request<{ topics: any[] }>(
            `/student/subjects/${subjectId}/topics`
          );
          const topicIds = topicsRes.topics.map((t: any) => t.id);
          const { data: subjectData } = await supabase
            .from('subjects')
            .select('name')
            .eq('id', subjectId)
            .single();
          const subjectName = subjectData?.name?.trim() || 'default';
          const config = NMT_CONFIGS[subjectName] || NMT_CONFIGS['default'];
          const { data: allQuestions } = await supabase
            .from('questions')
            .select('*')
            .in('topic_id', topicIds);
          let finalPool: any[] = [];
          Object.keys(config).forEach(type => {
            const countNeeded = config[type];
            const typeQuestions = allQuestions
              ?.filter((q: any) => q.type === type)
              .sort(() => Math.random() - 0.5)
              .slice(0, countNeeded) || [];
            finalPool = [...finalPool, ...typeQuestions];
          });
          setQuestions(finalPool);
        } else if (isErrorMode && topicId) {
          const response = await apiClient.request<{ questions: any[] }>(
            `/student/topics/${topicId}/error-questions`
          );
          setQuestions(response.questions || []);
        } else if (topicId) {
          const response = await apiClient.request<{ questions: any[] }>(
            `/student/topics/${topicId}/questions`
          );
          setQuestions(response.questions || []);
        }
      } catch (err) {
        console.error("Fetch questions error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [topicId, subjectId, isErrorMode, mode]);

  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          processFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft]);

  const handleAnswer = useCallback((questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleFinish = () => {
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      setUnansweredCount(unanswered.length);
      setIsModalOpen(true);
    } else {
      processFinish();
    }
  };

  const processFinish = async () => {
    const userString = localStorage.getItem("user");
    if (!userString) {
      alert("Ваша сесія завершилася. Будь ласка, увійдіть знову.");
      return;
    }
    const user = JSON.parse(userString);
    try {
      const payload = {
        user_id: user.id,
        topic_id: mode === 'nmt' ? null : topicId,
        subject_id: subjectId,
        mode: mode,
        answers: answers,
        group_assignment_id: assignmentId ?? null,
      };
      const result = await apiClient.request<{ attemptId: string }>(
        '/student/submit-test',
        { method: 'POST', body: JSON.stringify(payload) }
      );
      setIsModalOpen(false);
      if (result?.attemptId) {
        navigate(`/quiz-result/${result.attemptId}`);
      }
    } catch (err: any) {
      console.error("❌ Помилка при збереженні тесту:", err);
      alert(err.message || "Сталася помилка при завершенні тесту. Спробуйте ще раз.");
    }
  };

  if (loading) return <LoadingSpinner />;

  if (questions.length === 0) {
    return (
      <div className={`quiz-container${isDark ? ' dark' : ''}`}>
        <div className="question-card">
          <button className="back-btn" onClick={() => navigate(-1)}>← Назад</button>
          <h2>Тест поки порожній</h2>
          <p>Для цього режиму ще не додано жодного питання.</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className={`quiz-container${isDark ? ' dark' : ''}`}>
      <div className="quiz-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Залишити</button>
        <span className="quiz-title">
          {mode === 'nmt' ? 'НМТ-режим: ' : isErrorMode ? '📌 Помилки: ' : ''} 
          Питання {currentIndex + 1} з {questions.length}
        </span>
      </div>

      <div className="progress-bar">
        <div className="bar-bg">
          <div className="bar-fill" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="question-card">
        {(timeLeft > 0 || mode === 'nmt') && (
          <div className={`timer ${timeLeft < 300 ? 'danger' : ''}`}>
            ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        )}
        
        {currentQ?.image_url && (
          <img src={currentQ.image_url} alt="Завдання" className="q-image" />
        )}

        {currentQ && (
          <QuestionRenderer 
            question={currentQ} 
            onAnswer={(val: any) => handleAnswer(currentQ.id, val)} 
            savedAnswer={answers[currentQ.id]} 
            showResult={false} 
          />
        )}
      </div>

      <div className="quiz-footer">
        <button 
          className="nav-btn prev-btn" 
          disabled={currentIndex === 0} 
          onClick={() => setCurrentIndex(i => i - 1)}
        >
          Назад
        </button>

        <span className="footer-status">
          {currentIndex + 1} / {questions.length}
        </span>

        <button 
          className="nav-btn next-btn" 
          onClick={() => {
            if (currentIndex < questions.length - 1) {
              setCurrentIndex(i => i + 1);
            } else {
              handleFinish();
            }
          }}
        >
          {currentIndex === questions.length - 1 ? 'Завершити' : 'Далі'}
        </button>
      </div>

      <ConfirmModal 
        isOpen={isModalOpen} 
        title="Не всі питання заповнені" 
        message={`Ви пропустили ${unansweredCount} питань. Все одно завершити і відправити на перевірку?`} 
        confirmText="Завершити зараз" 
        cancelText="Повернутися"      
        onConfirm={() => {
          setIsModalOpen(false);
          processFinish();
        }} 
        onCancel={() => {
          setIsModalOpen(false); 
        }} 
      />
    </div>
  );
}