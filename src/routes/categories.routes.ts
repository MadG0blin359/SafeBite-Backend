import { Router } from "express";
import {
  listCategories,
  getCategoryById,
  getCategoryProducts,
} from "../controllers/products.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  categoryIdParamSchema,
  categoryProductsQuerySchema,
} from "../validators/products.validator.js";

const router = Router();

// ─── Categories Routes ────────────────────────────────────────────────
router.get("/", listCategories);
router.get("/:id", validate({ params: categoryIdParamSchema }), getCategoryById);
router.get(
  "/:id/products",
  validate({ params: categoryIdParamSchema, query: categoryProductsQuerySchema }),
  getCategoryProducts
);

export default router;
