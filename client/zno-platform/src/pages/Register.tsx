import { useState, useEffect, useMemo } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/authService";
import googleIcon from "../assets/auth/google-logo.png";
import { supabase } from "../services/supabaseClient";
import { useTheme } from "../context/ThemeContext";
import "./Auth.scss";

interface GroupOption {
  id: string;
  name: string;
  faculty: string | null;
}

function Register() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allGroups, setAllGroups] = useState<GroupOption[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    groupId: "",
  });

  const filteredGroups = useMemo(() => {
    if (!selectedFaculty) return [];
    return allGroups.filter((group) => group.faculty === selectedFaculty);
  }, [selectedFaculty, allGroups]);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const data = await authService.getGroups();
        if (data) {
          setAllGroups(data);
          const uniqueFaculties = Array.from(
            new Set(data.map((group) => group.faculty).filter(Boolean))
          ) as string[];
          setFaculties(uniqueFaculties);
        }
      } catch (err: any) {
        console.error("Помилка завантаження груп:", err.message);
        setError("Не вдалося завантажити навчальні групи.");
      }
    }
    fetchGroups();
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleFacultyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const faculty = e.target.value;
    setSelectedFaculty(faculty);
    setFormData((prev) => ({ ...prev, groupId: "" }));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Паролі не збігаються");
      return;
    }
    if (formData.password.length < 8) {
      setError("Пароль має містити мінімум 8 символів");
      return;
    }
    if (!formData.groupId) {
      setError("Оберіть навчальну групу");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        groupId: formData.groupId,
      } as any);

      if (response && response.token) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
      }

      alert("Реєстрація успішна!");
      navigate("/login");
    } catch (err: any) {
      console.error("❌ Помилка реєстрації на фронтенді:", err);
      setError(err.message || "Помилка під час реєстрації");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-container${isDark ? " dark" : ""}`}>
      <div className={`auth-card${isDark ? " dark" : ""}`}>
        <div className="auth-header">
          <div className="logo-icon">
            <img src="/favicon.svg" alt="logo" width={35} style={{ borderRadius: "10px" }} />
          </div>
          <h2>Examix</h2>
        </div>

        <div className="auth-titles">
          <h1 style={{ color: isDark ? "var(--td-text)" : "#17365f" }}>Створити акаунт</h1>
          <p>Приєднуйся до спільноти Examix</p>
        </div>

        <button className="google-btn" type="button" onClick={handleGoogleLogin}>
          <img src={googleIcon} alt="Google" />
          <p>Зареєструватися через Google</p>
        </button>

        <div className="divider">
          <span>або</span>
        </div>

        {error && <div className="error-message">{error}</div>}

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
            <label>Факультет</label>
            <select name="faculty" value={selectedFaculty} onChange={handleFacultyChange} required className="auth-select">
              <option value=""> — Оберіть факультет — </option>
              {faculties.map((faculty) => (
                <option key={faculty} value={faculty}>{faculty}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Навчальна група</label>
            <select name="groupId" value={formData.groupId} onChange={handleChange} disabled={!selectedFaculty} required className="auth-select">
              <option value="">
                {selectedFaculty ? "— Оберіть вашу групу —" : "Спочатку оберіть факультет"}
              </option>
              {filteredGroups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Пароль</label>
            <input name="password" type="password" placeholder="Мінімум 8 символів" value={formData.password} onChange={handleChange} required />
          </div>

          <div className="input-group">
            <label>Підтвердіть пароль</label>
            <input name="confirmPassword" type="password" placeholder="Повторіть пароль" value={formData.confirmPassword} onChange={handleChange} required />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Реєстрація..." : "Зареєструватися"}
          </button>
        </form>

        <p className="auth-footer">
          Вже маєте акаунт? <Link to="/login">Увійти</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;