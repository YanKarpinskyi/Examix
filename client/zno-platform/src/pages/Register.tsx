import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/authService"
import "./Auth.scss";
import googleIcon from "../assets/auth/google-logo.png";

function Register() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (formData.password !== formData.confirmPassword) {
      alert("Паролі не збігаються!");
      return;
    }

    if (formData.password.length < 8) {
      setError("Пароль має бути не менше 8 символів");
      return;
    }

    console.log("Реєстрація:", formData);

    setLoading(true);

    try {
      const response = await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      console.log("Успішна реєстрація:", response);

      if (response.token) {
        localStorage.setItem("token", response.token);
      }

      alert("Реєстрація успішна!");

      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Сталася помилка при реєстрації");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Examix</h2>
        </div>
        <div className="auth-titles">
          <h1>Створити акаунт</h1>
          <p>Приєднуйся до спільноти Examix</p>
        </div>

        <button className="google-btn" type="button">
          <img src={googleIcon} alt="Google" />
          <span>Зареєструватися через Google</span>
        </button>

        <div className="divider"><span>або</span></div>

        {error && <div className="error-message" style={{color: 'red', marginBottom: '10px', textAlign: 'center'}}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Ім'я користувача</label>
            <input name="username" type="text" placeholder="Твоє ім'я" value={formData.username} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input name="email" type="email" placeholder="example@gmail.com" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label>Пароль</label>
            <input name="password" type="password" placeholder="Мінімум 8 символів" value={formData.password} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label>Підтвердіть пароль</label>
            <input name="confirmPassword" type="password" placeholder="Повторіть пароль" value={formData.confirmPassword} onChange={handleChange} required />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>{loading ? "Реєстрація..." : "Зареєструватися"}</button>
        </form>

        <p className="auth-footer">
          Вже маєте акаунт? <Link to="/login">Увійти</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;