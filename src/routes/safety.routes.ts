import { Router } from "express";
import { getProductSafety } from "../controllers/safety.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { safetyProductIdParamSchema } from "../validators/products.validator.js";

const router = Router();

// ─── Deterministic Safety Analysis Route ──────────────────────────────
router.get("/:productId", validate({ params: safetyProductIdParamSchema }), getProductSafety);

export default router;
