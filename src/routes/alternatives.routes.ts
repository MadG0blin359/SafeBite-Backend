import { Router } from "express";
import { getProductAlternatives } from "../controllers/safety.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { safetyProductIdParamSchema } from "../validators/products.validator.js";

const router = Router();

// ─── Safer Product Alternatives Route (FR-08) ─────────────────────────
router.get("/:productId", validate({ params: safetyProductIdParamSchema }), getProductAlternatives);

export default router;
