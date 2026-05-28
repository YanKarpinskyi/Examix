import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
    const [hovered, setHovered] = useState(false);
    const [isAdminToggleHovered, setIsAdminToggleHovered] = useState(false);
    const [isAdminToggleActive, setIsAdminToggleActive] = useState(false);

    const { isDark, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isAuthPage = 
        location.pathname === '/' || 
        location.pathname === '/login' || 
        location.pathname === '/register' || 
        location.pathname === '/forgot-password' || 
        location.pathname === '/update-password';
    const isAdminPanel = location.pathname.startsWith('/admin');

    return (
        <header className="main-header" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '10px 20px', 
            alignItems: 'center', 
            borderBottom: '1px solid #eee',
            backgroundColor: '#34fadc' 
        }}>
            <div 
                onClick={() => navigate('/dashboard')} 
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            >
                <img src="/favicon.svg" style={{ width: '35px', height: '35px' }} />
                <span style={{ fontWeight: 800, fontSize: '1.5rem', color: '#333' }}>
                    Exami<span style={{ color: '#007bff' }}>X</span>
                </span>
            </div>
            
            <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                
                <div 
                    onClick={toggleTheme}
                    style={{
                        width: '60px',
                        height: '32px',
                        backgroundColor: isDark ? '#302e51' : '#cbd5e1',
                        borderRadius: '50px',
                        padding: '3px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isDark ? 'flex-end' : 'flex-start',
                        transition: 'all 0.3s ease',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    <div style={{
                        width: '26px',
                        height: '26px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s ease',
                    }}>
                        {isDark ? (
                            <span role="img" aria-label="active">☀️</span>
                        ) : (
                            <span role="img" aria-label="inactive">🌙</span>
                        )}
                    </div>
                </div>

                {user ? (
                    <div className="user-controls" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {user.role === 'admin' && (
                            <button
                                onClick={() => navigate(isAdminPanel ? '/teacher/panel' : '/admin')}
                                onMouseEnter={() => setIsAdminToggleHovered(true)}
                                onMouseLeave={() => {
                                    setIsAdminToggleHovered(false);
                                    setIsAdminToggleActive(false);
                                }}
                                onMouseDown={() => setIsAdminToggleActive(true)}
                                onMouseUp={() => setIsAdminToggleActive(false)}
                                style={{
                                    padding: '5px 12px',
                                    fontSize:'0.8rem',
                                    fontWeight:'600',
                                    borderRadius: '6px',
                                    border: `3px solid ${isAdminPanel ? '#007bff' : '#ef4444'}`,
                                    background: isAdminToggleActive
                                        ? (isAdminPanel ? '#cfe3ff' : '#fecaca')
                                        : isAdminToggleHovered
                                        ? (isAdminPanel ? '#e3f2ff' : '#fee2e2')
                                        : 'none',
                                    color: isAdminPanel ? '#007bff' : '#ef4444',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    transform: isAdminToggleActive ? 'scale(0.97)' : 'scale(1)',
                                }}
                            >
                                {isAdminPanel ? '👨‍🏫 Панель викладача' : '🛡️ Адмін панель'}
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