import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import type { Role } from "@zno/shared";

interface AdminUser {
    id: string;
    username: string;
    email: string;
    role: Role;
    created_at: string;
}

export default function AdminPanel() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("http://localhost:5002/api/admin/users", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setUsers(data.users || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Помилка завантаження");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId: string, newRole: Role) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`http://localhost:5002/api/admin/users/${userId}/role`, {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            if (!res.ok) throw new Error("Не вдалося оновити роль");
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Помилка");
        }
    };

    if (loading) return <div className="p-6">Завантаження користувачів...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">🛡️ Панель адміністратора</h1>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 border">Користувач</th>
                            <th className="px-4 py-2 border">Email</th>
                            <th className="px-4 py-2 border">Роль</th>
                            <th className="px-4 py-2 border">Дата</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 border">{u.username}</td>
                                <td className="px-4 py-2 border">{u.email}</td>
                                <td className="px-4 py-2 border">
                                    <select 
                                        value={u.role} 
                                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                                        className="p-1 border rounded"
                                    >
                                        <option value="student">student</option>
                                        <option value="teacher">teacher</option>
                                        <option value="admin">admin</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2 border text-sm">
                                    {new Date(u.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}