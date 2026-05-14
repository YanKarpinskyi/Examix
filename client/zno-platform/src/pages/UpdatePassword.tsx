import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function UpdatePassword() {
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            alert(error.message);
        } else {
            alert("Пароль успішно змінено!");
            navigate("/login");
        }
        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Встановіть новий пароль</h2>
                <form onSubmit={handleUpdate}>
                    <div className="input-group">
                        <label>Новий пароль</label>
                        <input 
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        Оновити пароль
                    </button>
                </form>
            </div>
        </div>
    );
}