import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import type { UserDTO } from "@zno/shared";

interface AuthContectType {
    user: UserDTO | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContectType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserDTO | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('username, role')
                    .eq('id', userId)
                    .single();
                if (error) throw error;
                return data;
            } catch (e) {
                console.error("Profile error:", e);
                return null;
            }
        };

        const handleStateChange = async (session: any) => {
            try {
                if (session?.user) {
                    const profile = await fetchProfile(session.user.id);
                    setUser({
                        id: session.user.id,
                        email: session.user.email || '',
                        username: profile?.username || 'Користувач',
                        role: profile?.role || 'student',
                        createdAt: session.user.created_at
                    });
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error("Auth handler error:", err);
            } finally {
                setLoading(false); // ГАРАНТОВАНО вимикаємо loading
            }
        };

        // 1. Спочатку перевіряємо поточну сесію вручну
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleStateChange(session);
        });

        // 2. Підписуємось на зміни
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            handleStateChange(session);
        });

        return () => authListener.subscription.unsubscribe();
    }, []);

    const logout = async () => {
        setLoading(true); // Показуємо завантаження при виході
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};