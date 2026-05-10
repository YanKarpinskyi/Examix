import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import "./Auth.scss";
import googleIcon from "../assets/auth/google-logo.png";

function Login() {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        rememberMe: false
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            navigate("/dashboard");
        } catch (err: any) {
            setError(err.message || "Невірний email або пароль");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo-placeholder">
                        <div className="logo-icon">
                            <img src="" alt="logo" />
                        </div>
                    </div>
                    <h2>Examix</h2>
                </div>
                <div className="auth-titles">
                    <h2>З поверненням!</h2>
                    <p>Раді бачити тебе знову</p>
                </div>
                <button className="google-btn" type="button">
                    <img src={googleIcon} alt="Google" />
                    <p>Увійти через Google</p>
                </button>
                <div className="divider">
                    <span>або</span>
                </div>

                {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="example@gmail.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Пароль</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                placeholder="Ваш пароль"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "👁️" : "🙈"}
                            </button>
                        </div>
                    </div>
                    <div className="authOptions">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleChange}
                            />
                            <span>Запам'ятати мене</span>
                        </label>
                        <a href="#" className="forgot-password">Забули пароль?</a>
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? "Вхід..." : "Увійти"}
                    </button>
                </form>
                <p className="auth-footer">
                    Ще не зареєстровані? <Link to="/register">Створити акаунт</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;