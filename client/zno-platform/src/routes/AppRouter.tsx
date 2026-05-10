import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from '../hooks/useAuth';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import SubjectDetail from '../pages/SubjectDetail';

const ProtectedRoute = ({ children }: {children: React.ReactNode}) => {
    const { user, loading } = useAuth();
    if (loading) return <p>Завантаження...</p>;
    return user ? <>{children}</>: <Navigate to="/login" />
};

const PublicRoute = ({ children }: {children: React.ReactNode}) => {
    const { user, loading } = useAuth();
    if (loading) return <p>Завантаження...</p>;
    return !user ? <>{children}</>: <Navigate to="/dashboard" />
};

const AppRouter = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />}></Route>
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>}></Route>
                    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>}></Route>
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}></Route>
                    <Route path="/subject/:id" element={<ProtectedRoute><SubjectDetail /></ProtectedRoute>}></Route>
                    <Route path="*" element={<><p>Сторінку не знайдено</p></>}></Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default AppRouter