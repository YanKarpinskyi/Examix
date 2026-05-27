import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/db.js";

export async function logAction(userId: string, action: string, details?: any) {
  try {
    await supabaseAdmin.from("user_logs").insert([{
      user_id: userId,
      action,
      details: details ?? null,
    }]);
  } catch (err) {
    console.error("❌ Log error:", err);
  }
}

export function withLogging(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode < 400) {
        const userId = (req as any).userId;
        if (userId) logAction(userId, action, req.body);
      }
      return originalJson(body);
    };
    next();
  };
}