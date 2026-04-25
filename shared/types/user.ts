export type Role = "student" | "teacher" | "admin";

export interface UserDTO {
    id: string;
    email: string;
    role: Role
}