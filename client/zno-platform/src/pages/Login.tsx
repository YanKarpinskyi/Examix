import { useState } from "react";
import { createPortal } from "react-dom";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import authService from "../services/authService";
import googleIcon from "../assets/auth/google-logo.png";
import { supabase } from "../services/supabaseClient";
import "./Auth.scss";

function BannedModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "#1a1a2e", borderRadius: "16px", padding: "40px 32px",
        maxWidth: "420px", width: "90%", textAlign: "center",
        border: "1px solid #ef4444",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🚫</div>
        <h3 style={{ color: "#f87171", marginBottom: "12px", fontSize: "1.2rem" }}>
          Акаунт заблоковано
        </h3>
        <p style={{ color: "#94a3b8", marginBottom: "24px", lineHeight: 1.6 }}>
          Ваш акаунт заблокований адміністратором платформи.
          Зверніться до підтримки для отримання додаткової інформації.
        </p>
        <button
          onClick={onClose}
          style={{
            padding: "10px 32px", borderRadius: "8px", border: "none",
            background: "#ef4444", color: "#fff", fontWeight: "600",
            cursor: "pointer", fontSize: "0.95rem",
          }}
        >
          Зрозуміло
        </button>
      </div>
    </div>,
    document.body!
  );
}

function Login() {
  const { checkAuth } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBannedModal, setShowBannedModal] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authService.login({
        email: formData.email.trim(),
        password: formData.password,
      });

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      await checkAuth();

    } catch (err: any) {
      if (err.message?.toLowerCase().includes("заблокован")) {
        setShowBannedModal(true);
      } else {
        setError(err.message || "Невірний email або пароль");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {showBannedModal && <BannedModal onClose={() => setShowBannedModal(false)} />}

      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-placeholder">
            <div className="logo-icon">
              <img src="/favicon.svg" alt="logo" width={35} style={{ borderRadius: "10px" }} />
            </div>
          </div>
          <h2 style={{ width: "fit-content", verticalAlign: "middle" }}>Examix</h2>
        </div>

        <div className="auth-titles">
          <h2>З поверненням!</h2>
          <p>Раді бачити тебе знову</p>
        </div>

        <button className="google-btn" type="button" onClick={handleGoogleLogin}>
          <img src={googleIcon} alt="Google" />
          <p>Увійти через Google</p>
        </button>

        <div className="divider"><span>або</span></div>

        {error && (
          <div style={{ color: "#f87171", textAlign: "center", marginBottom: "1rem", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" placeholder="example@gmail.com"
              value={formData.email} onChange={handleChange} required />
          </div>

          <div className="input-group">
            <label htmlFor="password">Пароль</label>
            <div className="password-wrapper">
              <input type={showPassword ? "text" : "password"} id="password" name="password"
                placeholder="Ваш пароль" value={formData.password} onChange={handleChange} required />
              <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          <div className="authOptions">
            <label className="checkbox-label">
              <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} />
              <span>Запам'ятати мене</span>
            </label>
            <Link to="/forgot-password" className="forgot-password">Забули пароль?</Link>
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