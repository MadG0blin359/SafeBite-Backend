import { Router } from "express";
import {
  getHistory,
  recordScan,
  recordSearch,
  clearHistory,
  getFavorites,
  addFavorite,
  removeFavorite,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getHealthProfile,
  setHealthConsent,
  updateHealthTags,
  clearHealthProfile,
} from "../controllers/user-data.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  recordScanSchema,
  recordSearchSchema,
  healthConsentSchema,
  healthTagsSchema,
  productIdParamSchema,
  historyQuerySchema,
} from "../validators/user-data.validator.js";

const router = Router();

// All user data routes require a valid authenticated session (NFR-S-01)
router.use(requireAuth);

// ─── History Routes (FR-12, NFR-PR-02) ────────────────────────────────
router.get("/history", validate({ query: historyQuerySchema }), getHistory);
router.post("/history/scan", validate({ body: recordScanSchema }), recordScan);
router.post("/history/search", validate({ body: recordSearchSchema }), recordSearch);
router.delete("/history", clearHistory);

// ─── Favorites Routes (FR-13-01 to FR-13-05) ──────────────────────────
router.get("/favorites", getFavorites);
router.post("/favorites/:productId", validate({ params: productIdParamSchema }), addFavorite);
router.delete("/favorites/:productId", validate({ params: productIdParamSchema }), removeFavorite);

// ─── Watchlist Routes (FR-13-02, FR-13-04, FR-13-06, FR-13-07) ─────────
router.get("/watchlist", getWatchlist);
router.post("/watchlist/:productId", validate({ params: productIdParamSchema }), addToWatchlist);
router.delete("/watchlist/:productId", validate({ params: productIdParamSchema }), removeFromWatchlist);

// ─── Health Profile & Consent (FR-16-01, FR-16-02) ─────────────────────
router.get("/health-profile", getHealthProfile);
router.put("/health-profile/consent", validate({ body: healthConsentSchema }), setHealthConsent);
router.put("/health-profile/tags", validate({ body: healthTagsSchema }), updateHealthTags);
router.delete("/health-profile", clearHealthProfile);

export default router;
