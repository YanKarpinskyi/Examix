import type { RegisterDTO, AuthResponse } from "@zno/shared";

const API_URL = "http://localhost:5002/api/auth";

const authService = {
    async register(data: RegisterDTO): Promise<AuthResponse>{
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result: AuthResponse = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Помилка при реєстрації");
        }

        return result;
    },
};

export default authService