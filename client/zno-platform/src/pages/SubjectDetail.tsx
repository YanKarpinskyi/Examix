import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

interface Topic {
    id: string;
    name: string;
    description: string;
}

function SubjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [subjectName, setSubjectName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSubjectData() {
            setLoading(true);
            const { data: subject } = await supabase
                .from('subjects')
                .select('name')
                .eq('id', id)
                .single();
            
            if (subject) setSubjectName(subject.name);

            const { data: topicsData } = await supabase
                .from('topics')
                .select('*')
                .eq('subject_id', id);

            setTopics(topicsData || []);
            setLoading(false);
        }

        fetchSubjectData();
    }, [id]);

    return (
        <div className="subject-detail-page" style={{ padding: '20px' }}>
            <button onClick={() => navigate('/dashboard')}>← Назад до предметів</button>
            
            <header style={{ margin: '20px 0' }}>
                <h1>{subjectName}</h1>
                <p>Оберіть тему для вивчення:</p>
            </header>

            {loading ? <p>Завантаження тем...</p> : (
                <div className="topics-list">
                    {topics.length > 0 ? topics.map(topic => (
                        <div key={topic.id} className="topic-item" style={{
                            border: '1px solid #ddd', 
                            padding: '15px', 
                            marginBottom: '10px',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}>
                            <h3>{topic.name}</h3>
                            <p>{topic.description}</p>
                        </div>
                    )) : <p>Тем поки немає. Адміністратор скоро їх додасть!</p>}
                </div>
            )}
        </div>
    );
}

export default SubjectDetail;