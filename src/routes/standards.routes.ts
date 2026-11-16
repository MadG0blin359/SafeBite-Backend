import { Router } from "express";
import {
  listStandards,
  getStandardsSummary,
  getStandardById,
  getCategoryStandards,
} from "../controllers/standards.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  listStandardsQuerySchema,
  resolveCategoryStandardsQuerySchema,
  standardIdParamSchema,
  categoryIdParamSchema,
} from "../validators/standards.validator.js";

const router = Router();

router.get("/", validate({ query: listStandardsQuerySchema }), listStandards);
router.get("/summary", getStandardsSummary);
router.get(
  "/categories/:categoryId",
  validate({ params: categoryIdParamSchema, query: resolveCategoryStandardsQuerySchema }),
  getCategoryStandards
);
router.get("/:id", validate({ params: standardIdParamSchema }), getStandardById);

export default router;
