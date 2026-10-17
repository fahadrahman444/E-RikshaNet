import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate } from "../middlewares/auth.js";
import { Role } from "../types/enums.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "e_rikshanet_secure_pilot_jwt_secret_key_2026";

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  password: z.string().min(6),
  role: z.nativeEnum(Role).default(Role.PASSENGER),
  email: z.string().email().optional(),
  // For driver registration
  nidNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  emergencyContact: z.string().optional(),
});

router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phone: data.phone }, ...(data.email ? [{ email: data.email }] : [])],
      },
    });

    if (existingUser) {
      res.status(409).json({ error: "User with this phone or email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        passwordHash,
        role: data.role,
        ...(data.role === Role.DRIVER
          ? {
              driverProfile: {
                create: {
                  nidNumber: data.nidNumber || `NID-${Date.now()}`,
                  licenseNumber: data.licenseNumber,
                  emergencyContact: data.emergencyContact,
                },
              },
            }
          : {}),
      },
      include: {
        driverProfile: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        driverProfile: user.driverProfile,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { driverProfile: true },
    });

    if (!user) {
      res.status(401).json({ error: "Invalid phone number or password" });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid phone number or password" });
      return;
    }

    if (user.status === "SUSPENDED") {
      res.status(403).json({ error: "Account suspended. Please contact platform support." });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        driverProfile: user.driverProfile,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

router.get("/me", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        driverProfile: {
          include: {
            permits: { include: { zone: true } },
            driverVehicleLinks: { include: { vehicle: true } },
          },
        },
        ownedVehicles: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

export default router;
