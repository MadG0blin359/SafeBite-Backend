import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import storageRoutes from "./storage.routes.js";
import userDataRoutes from "./user-data.routes.js";
import standardsRoutes from "./standards.routes.js";
import productsRoutes from "./products.routes.js";
import categoriesRoutes from "./categories.routes.js";
import safetyRoutes from "./safety.routes.js";
import alternativesRoutes from "./alternatives.routes.js";

const router = Router();

// Root health check mounted directly
router.use("/", healthRoutes);

// Core API routes
router.use("/api/auth", authRoutes);
router.use("/api/storage", storageRoutes);
router.use("/api/user", userDataRoutes);
router.use("/api/standards", standardsRoutes);
router.use("/api/products", productsRoutes);
router.use("/api/categories", categoriesRoutes);
router.use("/api/safety", safetyRoutes);
router.use("/api/alternatives", alternativesRoutes);

export default router;
