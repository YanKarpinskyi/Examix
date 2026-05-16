import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import UpdatePassword from '../pages/UpdatePassword';
import Dashboard from '../pages/Dashboard';
import SubjectDetail from '../pages/SubjectDetail';
import QuizPage from '../pages/QuizPage';
import QuizResultPage from '../pages/QuizResultPage';
import TeacherDashboard from '../pages/TeacherDashboard';
import AdminPanel from '../pages/AdminPanel';
import LoadingSpinner from '../components/LoadingSpinner';

const ProtectedRoute = ({ 
    children, 
    allowedRoles 
}: { 
    children: React.ReactNode; 
    allowedRoles?: string[]; 
}) => {
    const { user, loading } = useAuth();
    
    if (loading) return <LoadingSpinner />;
    if (!user) return <Navigate to="/login" replace />;
    
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }
    
    return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    
    if (loading) return <LoadingSpinner />;
    if (user) return <Navigate to="/dashboard" replace />;
    
    return <>{children}</>;
};

const AppRouter = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Header />
                <main className="min-h-screen">
                    <Routes>
                        <Route path="/" element={<Home />} />

                        {/* Публічні роути (недоступні для авторизованих) */}
                        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

                        {/* Роути без авторизації */}
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/update-password" element={<UpdatePassword />} />

                        {/* Захищені роути для всіх авторизованих користувачів */}
                        <Route path="/dashboard" element={
                            <ProtectedRoute><Dashboard /></ProtectedRoute>
                        } />
                        <Route path="/subject/:id" element={
                            <ProtectedRoute><SubjectDetail /></ProtectedRoute>
                        } />

                        {/* Quiz роути */}
                        <Route path="/topic/:topicId/quiz" element={
                            <ProtectedRoute><QuizPage /></ProtectedRoute>
                        } />
                        <Route path="/quiz/nmt/:subjectId" element={
                            <ProtectedRoute><QuizPage mode="nmt" /></ProtectedRoute>
                        } />
                        <Route path="/quiz-result/:attemptId" element={
                            <ProtectedRoute><QuizResultPage /></ProtectedRoute>
                        } />

                        {/* Панель викладача (teacher + admin) */}
                        <Route path="/teacher/*" element={
                            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                                <TeacherDashboard />
                            </ProtectedRoute>
                        } />

                        {/* Панель адміністратора (тільки admin) */}
                        <Route path="/admin/*" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminPanel />
                            </ProtectedRoute>
                        } />

                        {/* 404 */}
                        <Route path="*" element={
                            <div className="p-10 text-center">
                                <h1 className="text-2xl font-bold">Сторінку не знайдено</h1>
                            </div>
                        } />
                    </Routes>
                </main>
                <Footer />
            </BrowserRouter>
        </AuthProvider>
    );
};

export default AppRouter;