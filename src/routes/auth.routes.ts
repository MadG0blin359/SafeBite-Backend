import { Router } from "express";
import {
  signUp,
  signIn,
  getProfile,
  updateProfile,
  signOut,
  forgotPassword,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authRateLimiter } from "../middlewares/rate-limit.middleware.js";
import {
  signUpSchema,
  signInSchema,
  updateProfileSchema,
  resetPasswordSchema,
} from "../validators/auth.validator.js";

const router = Router();

// Apply auth rate limiter
router.use(authRateLimiter);

router.post("/signup", validate({ body: signUpSchema }), signUp);
router.post("/login", validate({ body: signInSchema }), signIn);
router.post("/forgot-password", validate({ body: resetPasswordSchema }), forgotPassword);

// Protected routes
router.get("/profile", requireAuth, getProfile);
router.patch("/profile", requireAuth, validate({ body: updateProfileSchema }), updateProfile);
router.post("/logout", requireAuth, signOut);

export default router;
