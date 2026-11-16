import { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { verifyEmailInputDeliverability } from "../utils/email-validation.js";

export const validateEmailInput = async (req: Request, res: Response): Promise<void> => {
  const result = await verifyEmailInputDeliverability(req.body.email);
  res.status(200).json({
    success: true,
    data: result,
  });
};

export const signUp = async (req: Request, res: Response): Promise<void> => {
  const data = await authService.signUp(req.body);
  res.status(201).json({
    success: true,
    message: "Account created. Please check your email for the 6-digit verification code.",
    data,
  });
};

export const verifyEmailOtp = async (req: Request, res: Response): Promise<void> => {
  const data = await authService.verifyEmailOtp(req.body);
  res.status(200).json({
    success: true,
    message: "Email verified successfully. Account is now active.",
    data: {
      user: data.user,
      token: data.token,
    },
  });
};

export const resendVerificationOtp = async (req: Request, res: Response): Promise<void> => {
  await authService.resendVerificationOtp(req.body.email);
  res.status(200).json({
    success: true,
    message: "If an unverified account exists with that email, a 6-digit verification code has been sent.",
  });
};

export const signIn = async (req: Request, res: Response): Promise<void> => {
  const data = await authService.signIn(req.body);
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    data: {
      user: data.user,
      token: data.token,
    },
  });
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.getProfile(req.user!.id);
  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.updateProfile(req.user!.id, req.body);
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      user,
    },
  });
};

export const signOut = async (req: Request, res: Response): Promise<void> => {
  if (req.user?.id) {
    await authService.signOut(req.user.id);
  }
  res.status(200).json({
    success: true,
    message: "Signed out successfully",
  });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  await authService.requestPasswordReset(req.body.email);
  res.status(200).json({
    success: true,
    message: "If an account exists with that email, a 6-digit verification code has been sent.",
  });
};

export const verifyResetOtp = async (req: Request, res: Response): Promise<void> => {
  const result = await authService.verifyResetOtp(req.body);
  res.status(200).json({
    success: true,
    message: "Verification code confirmed.",
    data: result,
  });
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  await authService.completePasswordReset(req.body);
  res.status(200).json({
    success: true,
    message: "Password reset successfully. Please sign in with your new password.",
  });
};
