import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../types/enums.js";

export interface AuthenticatedUser {
  id: string;
  role: Role;
  phone: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "e_rikshanet_secure_pilot_jwt_secret_key_2026";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: "Expired or invalid authorization token" });
  }
}

export function authorizeRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthenticated request" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access forbidden: requires one of [${roles.join(", ")}]`,
      });
      return;
    }

    next();
  };
}
