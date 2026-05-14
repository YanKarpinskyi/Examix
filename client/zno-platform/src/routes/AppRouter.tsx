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
import LoadingSpinner from '../components/LoadingSpinner';

const ProtectedRoute = ({ children }: {children: React.ReactNode}) => {
    const { user, loading } = useAuth();
    if (loading) return <div><LoadingSpinner /></div>;
    return user ? <>{children}</>: <Navigate to="/login" />
};

const PublicRoute = ({ children }: {children: React.ReactNode}) => {
    const { user, loading } = useAuth();
    if (loading) return <div><LoadingSpinner /></div>;
    return !user ? <>{children}</>: <Navigate to="/dashboard" />
};

const AppRouter = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Header />
                <Routes>
                    <Route path="/" element={<Home />}></Route>
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>}></Route>
                    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>}></Route>
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/update-password" element={<UpdatePassword />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}></Route>
                    <Route path="/subject/:id" element={<ProtectedRoute><SubjectDetail /></ProtectedRoute>}></Route>
                    <Route path="/topic/:topicId/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
                    <Route path="/quiz-result/:attemptId" element={<QuizResultPage />} />
                    <Route path="/quiz/nmt/:subjectId" element={<ProtectedRoute><QuizPage mode="nmt" /></ProtectedRoute>} />

                    <Route path="*" element={<><p>Сторінку не знайдено</p></>}></Route>
                </Routes>
                <Footer />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default AppRouter