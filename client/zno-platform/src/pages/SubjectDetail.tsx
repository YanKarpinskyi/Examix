import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import './SubjectDetail.scss';

interface Topic {
    id: string;
    name: string;
    description: string;
}

function SubjectDetail() {
    const { id: subjectId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [viewMode, setViewMode] = useState<'selection' | 'topics'>('selection');
    const [topics, setTopics] = useState<Topic[]>([]);
    const [subjectName, setSubjectName] = useState('');
    const [loading, setLoading] = useState(true);
    const [errorCounts, setErrorCounts] = useState<Record<string, number>>({});
    const [selectedTime, setSelectedTime] = useState<number>(0);

    useEffect(() => {
        async function fetchSubjectData() {
            setLoading(true);
            
            const { data: subject } = await supabase
                .from('subjects')
                .select('name')
                .eq('id', subjectId)
                .single();
            if (subject) setSubjectName(subject.name);

            const { data: topicsData } = await supabase
                .from('topics')
                .select('*')
                .eq('subject_id', subjectId);
            setTopics(topicsData || []);

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: errorData } = await supabase
                    .from('user_errors')
                    .select('topic_id')
                    .eq('user_id', user.id);

                const counts = errorData?.reduce((acc: any, curr: any) => {
                    acc[curr.topic_id] = (acc[curr.topic_id] || 0) + 1;
                    return acc;
                }, {});
                setErrorCounts(counts || {});
            }

            setLoading(false);
        }
        fetchSubjectData();
    }, [subjectId]);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="subject-detail-page">
            <button className="back-btn" onClick={() => {
                viewMode === 'selection' ? navigate('/dashboard') : setViewMode('selection')
            }}>
                ← {viewMode === 'selection' ? 'Назад до предметів' : 'Назад до вибору режиму'}
            </button>

            <header>
                <h1>{subjectName}</h1>
                <p>{viewMode === 'selection' ? 'Оберіть формат підготовки:' : 'Оберіть тему для вивчення:'}</p>
            </header>

            <div className="content-area">
                {viewMode === 'selection' && (
                    <div className="mode-selection-grid">
                        <div className="mode-card" onClick={() => setViewMode('topics')}>
                            <div className="icon">📂</div>
                            <h3>За темами</h3>
                            <p>Тренуй конкретні розділи предмета крок за кроком</p>
                        </div>
                        <div className="mode-card nmt-highlight" onClick={() => navigate(`/quiz/nmt/${subjectId}`)}>
                            <div className="icon">⏱️</div>
                            <h3>Режим НМТ</h3>
                            <p>30 випадкових завдань, 60 хвилин та повна симуляція</p>
                        </div>
                    </div>
                )}

                {viewMode === 'topics' && (
                    <div className="topics-list">
                        <div className="time-selector">
                            <label>Таймер: </label>
                            <select value={selectedTime} onChange={(e) => setSelectedTime(Number(e.target.value))}>
                                <option value={0}>Без таймеру</option>
                                <option value={20}>20 хвилин</option>
                                <option value={40}>40 хвилин</option>
                            </select>
                        </div>

                        {topics.map(topic => (
                            <div key={topic.id} className="topic-item">
                                <h3>{topic.name}</h3>
                                <div className="topic-actions">
                                    <button className="start-btn" onClick={() => navigate(`/topic/${topic.id}/quiz?time=${selectedTime}`)}>
                                        Тренуватися
                                    </button>
                                    <button 
                                        className={`errors-btn ${errorCounts[topic.id] ? 'has-errors' : 'no-errors'}`} 
                                        disabled={!errorCounts[topic.id]}
                                        onClick={() => navigate(`/topic/${topic.id}/quiz?mode=errors`)}
                                    >
                                        Помилки ({errorCounts[topic.id] || 0})
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SubjectDetail;