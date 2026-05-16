import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"; 
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

    const fetchProfile = useCallback(async (userId: string) => { 
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
    }, []); 

    const handleStateChange = useCallback(async (session: any) => { 
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
            setLoading(false); 
        } 
    }, [fetchProfile]); 

    useEffect(() => { 
        supabase.auth.getSession().then(({ data: { session } }) => { 
            handleStateChange(session); 
        }); 

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => { 
            handleStateChange(session); 
        }); 

        return () => authListener.subscription.unsubscribe(); 
    }, [handleStateChange]); 

    const logout = async () => { 
        setLoading(true); 
        await supabase.auth.signOut(); 
        setUser(null); 
        setLoading(false); 
    }; 

    // Виправлення SonarLint S6481
    const contextValue = useMemo(() => ({ 
        user, 
        loading, 
        logout 
    }), [user, loading]); 

    return ( 
        <AuthContext.Provider value={contextValue}> 
            {children} 
        </AuthContext.Provider> 
    ); 
}; 

export const useAuth = () => { 
    const context = useContext(AuthContext); 
    if (!context) throw new Error('useAuth must be used within AuthProvider'); 
    return context; 
};