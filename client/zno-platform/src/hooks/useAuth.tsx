import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { apiClient } from "../services/apiClient"; 
import authService from "../services/authService";
import type { UserDTO } from "@zno/shared";

interface AuthContextType {
  user: UserDTO | null;
  loading: boolean;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }

      const data = await apiClient.request<{ user: UserDTO }>("/auth/me");
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (err) {
      console.error("Помилка верифікації токена:", err);
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error("Помилка при виході:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setLoading(false);
      window.location.href = "/login";
    }
  }, []);

  const contextValue = useMemo(() => ({ 
    user, 
    loading, 
    logout, 
    checkAuth 
  }), [user, loading, logout, checkAuth]);

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