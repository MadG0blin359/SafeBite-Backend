import { Router } from "express";
import {
  listProducts,
  getProductById,
  getProductByBarcode,
} from "../controllers/products.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  listProductsQuerySchema,
  productIdParamSchema,
  barcodeParamSchema,
} from "../validators/products.validator.js";

const router = Router();

// ─── Products Routes ──────────────────────────────────────────────────
router.get("/", validate({ query: listProductsQuerySchema }), listProducts);
router.get("/barcode/:barcode", validate({ params: barcodeParamSchema }), getProductByBarcode);
router.get("/:id", validate({ params: productIdParamSchema }), getProductById);

export default router;
