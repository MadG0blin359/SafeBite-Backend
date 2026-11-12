import { Router } from "express";
import {
  validateEmailInput,
  signUp,
  verifyEmailOtp,
  resendVerificationOtp,
  signIn,
  getProfile,
  updateProfile,
  signOut,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authRateLimiter } from "../middlewares/rate-limit.middleware.js";
import {
  validateEmailInputSchema,
  signUpSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  signInSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} from "../validators/auth.validator.js";

const router = Router();

// Apply auth rate limiter
router.use(authRateLimiter);

router.post("/validate-email", validate({ body: validateEmailInputSchema }), validateEmailInput);
router.post("/signup", validate({ body: signUpSchema }), signUp);
router.post("/verify-email", validate({ body: verifyEmailSchema }), verifyEmailOtp);
router.post("/resend-verification-otp", validate({ body: resendVerificationSchema }), resendVerificationOtp);
router.post("/login", validate({ body: signInSchema }), signIn);
router.post("/forgot-password", validate({ body: forgotPasswordSchema }), forgotPassword);
router.post("/verify-reset-otp", validate({ body: verifyResetOtpSchema }), verifyResetOtp);
router.post("/reset-password", validate({ body: resetPasswordSchema }), resetPassword);

// Protected routes
router.get("/profile", requireAuth, getProfile);
router.patch("/profile", requireAuth, validate({ body: updateProfileSchema }), updateProfile);
router.post("/logout", requireAuth, signOut);

export default router;
