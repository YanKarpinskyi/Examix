import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { Link } from "react-router-dom";
import "./Auth.scss";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) throw error;
            setMessage("Інструкції надіслано на вашу пошту!");
        } catch (err: any) {
            setError(err.message || "Помилка при відправці запиту");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-titles">
                    <h1>Відновлення пароля</h1>
                    <p>Введіть email, щоб отримати посилання для зміни пароля.</p>
                </div>
                
                {message && <div className="success-message">{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleReset}>
                    <div className="input-group">
                        <label htmlFor="reset-email">Email</label>
                        <input 
                            id="reset-email" 
                            type="email" 
                            placeholder="example@gmail.com" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? "Відправка..." : "Надіслати лінк"}
                    </button>
                </form>
                <p className="auth-footer">
                    <Link to="/login">Повернутися до входу</Link>
                </p>
            </div>
        </div>
    );
}