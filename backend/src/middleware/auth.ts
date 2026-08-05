import type { Response, NextFunction, Request } from "express";
import { verifyToken } from "../utils/jwt.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    inGameName?: string;
    role: "user" | "admin" | "partner";
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Access denied. No token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ message: "Invalid or expired token." });
    return;
  }

  (req as AuthenticatedRequest).user = {
    uid: decoded.uid,
    inGameName: decoded.inGameName,
    role: decoded.role || "user",
  };

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.role !== "admin") {
      res.status(403).json({ message: "Access denied. Administrator privileges required." });
      return;
    }
    next();
  });
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.role !== "admin" && authReq.user?.role !== "partner") {
      res.status(403).json({ message: "Access denied. Staff privileges required." });
      return;
    }
    next();
  });
}
