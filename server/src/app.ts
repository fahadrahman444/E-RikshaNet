import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import authRoutes from "./modules/auth.routes.js";
import driversRoutes from "./modules/drivers.routes.js";
import vehiclesRoutes from "./modules/vehicles.routes.js";
import zonesRoutes from "./modules/zones.routes.js";
import permitsRoutes from "./modules/permits.routes.js";
import { createTrackingRouter } from "./modules/tracking.routes.js";
import violationsRoutes from "./modules/violations.routes.js";
import { createTripsRouter } from "./modules/trips.routes.js";
import auditRoutes from "./modules/audit.routes.js";

export function createApp() {
  const app = express();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  // Socket.io connection handling
  io.on("connection", (socket) => {
    // Client joins authority room for live map updates
    socket.on("join:authority", () => {
      socket.join("authority-room");
    });

    // Driver joins operating zone room for ride dispatch
    socket.on("join:zone", (zoneId: string) => {
      socket.join(`zone:${zoneId}`);
    });

    // Passenger joins passenger room
    socket.on("join:passenger", (passengerId: string) => {
      socket.join(`passenger:${passengerId}`);
    });

    // Join specific trip room
    socket.on("join:trip", (tripId: string) => {
      socket.join(`trip:${tripId}`);
    });
  });

  // Middlewares
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/drivers", driversRoutes);
  app.use("/api/vehicles", vehiclesRoutes);
  app.use("/api/zones", zonesRoutes);
  app.use("/api/permits", permitsRoutes);
  app.use("/api/tracking", createTrackingRouter(io));
  app.use("/api/violations", violationsRoutes);
  app.use("/api/trips", createTripsRouter(io));
  app.use("/api/audit", auditRoutes);

  return { app, server, io };
}
