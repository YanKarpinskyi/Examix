export type Role = "student" | "teacher" | "admin";

export interface RegisterDTO {
    username: string;
    email: string;
    password: string;
}

export interface UserDTO {
    id: string;
    email: string;
    role: Role;
    username: string;
    createdAt: string;
}

export interface AuthResponse {
  user: UserDTO | null;
  token?: string;
  error?: string;
}