import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import storageRoutes from "./storage.routes.js";
import userDataRoutes from "./user-data.routes.js";

const router = Router();

// Root health check mounted directly
router.use("/", healthRoutes);

// Core API routes
router.use("/api/auth", authRoutes);
router.use("/api/storage", storageRoutes);
router.use("/api/user", userDataRoutes);

export default router;
