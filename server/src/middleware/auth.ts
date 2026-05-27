import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@zno/shared";

const JWT_SECRET = process.env.JWT_SECRET ?? "fallback_secret";

export function detectRoleByEmail(email: string): Role {
  return email.endsWith("@knu.edu.ua") ? "teacher" : "student";
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "Токен відсутній або має неправильний формат" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: Role };
    (req as any).userId = decoded.userId;
    (req as any).userEmail = decoded.email;
    (req as any).userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: "Невалідний або прострочений токен" });
  }
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).userRole;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: "Недостатньо прав" });
    }
    next();
  };
}