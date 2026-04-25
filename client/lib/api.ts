const API_URL = "http://localhost:5000";

export const api = {
  get: async <T>(url: string): Promise<T> => {
    const res = await fetch(API_URL + url);
    if (!res.ok) throw new Error("Network response was not ok");
    return res.json();
  }
};