import type { RegisterDTO, LoginRequest, AuthResponse } from "@zno/shared"; 
import { apiClient } from "./apiClient";

const authService = {
    async register(data: RegisterDTO): Promise<AuthResponse> {
        return apiClient.request<AuthResponse>("/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    async login(data: LoginRequest): Promise<AuthResponse> {
        return apiClient.request<AuthResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    async logout(): Promise<void> {
        await apiClient.request("/auth/logout", { method: "POST" });
    },

    async getGroups(): Promise<{ id: string; name: string; faculty: string | null }[]> {
        const result = await apiClient.request<{ groups: any[] }>("/public/groups", {
            method: "GET"
        });
        return result.groups;
    }
};

export default authService;