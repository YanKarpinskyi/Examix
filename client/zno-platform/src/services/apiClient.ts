const BASE_URL = "http://localhost:5002/api";

export const apiClient = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("token");
    
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      throw new Error("Сесія застаріла. Будь ласка, увійдіть знову.");
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Сталася помилка при запиті");
    }

    return result as T;
  }
};