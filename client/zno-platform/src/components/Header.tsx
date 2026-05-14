import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
    const [hovered, setHovered] = useState(false);

    const { user, logout } = useAuth(); 
    const navigate = useNavigate();
    const location = useLocation();

    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    return (
        <header className="main-header" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '10px 20px', 
            alignItems: 'center', 
            borderBottom: '1px solid #eee',
            backgroundColor: '#34fadc' 
        }}>
            {/* Блок з логотипом */}
            <div 
                onClick={() => navigate('/dashboard')} 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    cursor: 'pointer' 
                }}
            >
                <img 
                    src="/favicon.svg" 
                    style={{ width: '35px', height: '35px' }} 
                />
                <span style={{ 
                    fontWeight: 800, 
                    fontSize: '1.5rem', 
                    color: '#333' 
                }}>
                    Exami<span style={{ color: '#007bff' }}>X</span>
                </span>
            </div>
            
            <nav>
                {user ? (
                    <div className="user-controls" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {(user.role === 'teacher' || user.role === 'admin') && (
                            <button 
                                onClick={() => navigate('/teacher/panel')} 
                                className="teacher-link"
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #007bff',
                                    background: 'none',
                                    color: '#007bff',
                                    cursor: 'pointer'
                                }}
                            >
                                Панель викладача
                            </button>
                        )}
                        
                        <div className="user-meta" style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 500, display: 'block' }}>{user.username}</span>
                            <small style={{ display: 'block', fontSize: '10px', color: '#1b052e', textTransform: 'uppercase' }}>
                                {user.role}
                            </small>
                        </div>
                        <button 
                            onClick={logout} 
                            onMouseEnter={() => setHovered(true)}
                            onMouseLeave={() => setHovered(false)}
                            style={{
                                background: hovered ? 'rgb(44, 77, 137)' : 'rgb(64, 105, 181)',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                transition: 'background 0.2s',
                                color: hovered ? '#ffffff' : '#f0ebeb',
                            }}
                        >
                            Вийти
                        </button>
                    </div>
                ) : (
                    !isAuthPage && (
                        <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600'}}>
                            Увійти
                        </button>
                    )
                )}
            </nav>
        </header>
    );
}