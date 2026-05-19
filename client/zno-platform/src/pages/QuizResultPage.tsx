import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import "./QuizResultPage.scss";

export default function QuizResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attemptData, setAttemptData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAttempt() {
      setLoading(true);
      const { data: attempt, error: attemptError } = await supabase
        .from('test_attempts')
        .select(`
          *,
          topics (name)
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError || !attempt) {
        console.error("Error fetching attempt:", attemptError);
        setLoading(false);
        return;
      }

      const questionIds = Object.keys(attempt.answers);
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, content, correct_answer, options, type')
        .in('id', questionIds);

      if (questionsError) {
        console.error("Error fetching questions:", questionsError);
        setAttemptData(attempt);
      } else {
        const sortedQuestions = questions.sort((a, b) => questionIds.indexOf(a.id) - questionIds.indexOf(b.id));
        setAttemptData({ ...attempt, questions: sortedQuestions });
      }
      setLoading(false);
    }
    fetchAttempt();
  }, [attemptId]);

  if (loading) return <LoadingSpinner />;
  if (!attemptData) return <div className="error-msg">Спробу не знайдено.</div>;

  const percentage = Math.round((attemptData.score / attemptData.total_questions) * 100);

  const renderAnswer = (ans: any) => {

    if (ans === undefined || ans === null || ans === "") return "Немає відповіді";
    let parsedAns = ans;

    if (typeof ans === 'string') {
      const trimmed = ans.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          parsedAns = JSON.parse(trimmed);
        } catch {
          parsedAns = ans;
        }
      }
    }

    if (Array.isArray(parsedAns) && parsedAns.length === 1 && typeof parsedAns[0] === 'string') {
      const inner = parsedAns[0].trim();
      if (inner.startsWith('[') || inner.startsWith('{')) {
        try { parsedAns = JSON.parse(inner); } catch { /* залишаємо як є */ }
      }
    }

    if (Array.isArray(parsedAns)) {
      return parsedAns.join(' → ');
    }

    if (typeof parsedAns === 'object') {
      return Object.entries(parsedAns)
        .map(([key, val]) => {
          const isNumericKey = !isNaN(Number(key));
          const displayKey = isNumericKey ? Number(key) + 1 : key;
          return `${displayKey} — ${val}`;
        })
        .join(', ');
    }

    return String(parsedAns);
  };

  return (
    <div className="result-page">
      <div className="result-card">
        <h1>
          {attemptData.topics?.name ? `Результати: ${attemptData.topics.name}` : 'Результати НМТ симуляції'}
        </h1>
        
        <div className="score-container">
          <div className="score-circle">
            <span className="score-num">{attemptData.score}/{attemptData.total_questions}</span>
          </div>
          <p className="percentage-text">Успішність: {percentage}%</p>
        </div>

        <div className="review-section">
          <h3>Детальний розгляд питань:</h3>
          {attemptData.questions?.map((q: any) => {
            const userAns = attemptData.answers[q.id];
            const correctAns = q.correct_answer;

            const checkIsCorrect = () => {
              if (!userAns) return false;

              const getRawData = (val: any) => {
                if (typeof val === 'string') {
                  const trimmed = val.trim();
                  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                    try { return JSON.parse(trimmed); } catch { return val; }
                  }
                }
                if (Array.isArray(val) && val.length === 1 && typeof val[0] === 'string') {
                  const inner = val[0].trim();
                  if (inner.startsWith('[') || inner.startsWith('{')) {
                    try { return JSON.parse(inner); } catch { return val; }
                  }
                }
                return val;
              };

              const data1 = getRawData(userAns);
              const data2 = getRawData(correctAns);

              if (Array.isArray(data1) && Array.isArray(data2)) {
                if (data1.length !== data2.length) return false;
                return data1.every((val, index) => String(val).trim().toLowerCase() === String(data2[index]).trim().toLowerCase());
              }

              if (typeof data1 === 'object' && typeof data2 === 'object' && data1 !== null && data2 !== null) {
                return JSON.stringify(data1) === JSON.stringify(data2);
              }

              const normalize = (val: any) => String(val).trim().toLowerCase();

              return normalize(userAns) === normalize(correctAns);
            };

            const isCorrect = checkIsCorrect();

            return (
              <div key={q.id} className={`review-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                <p><strong>Питання:</strong> {q.content}</p>
                <div className="ans-details">
                  <p className="user-ans">
                    <strong>Ваша відповідь:</strong> {renderAnswer(userAns)}
                  </p>
                  {!isCorrect && (
                    <p className="correct-ans">
                      <strong>Правильна відповідь:</strong> {renderAnswer(correctAns)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button className="dashboard-btn" onClick={() => navigate('/dashboard')}>
          До кабінету
        </button>
      </div>
    </div>
  );
}