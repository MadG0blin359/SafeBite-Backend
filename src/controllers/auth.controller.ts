import { Request, Response } from "express";
import { authService } from "../services/auth.service.js";

export const signUp = async (req: Request, res: Response): Promise<void> => {
  const data = await authService.signUp(req.body);
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: data.user,
      token: data.token,
    },
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
  // Stateless JWT: client discards token
  res.status(200).json({
    success: true,
    message: "Signed out successfully",
  });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  await authService.resetPassword(req.body.email);
  res.status(200).json({
    success: true,
    message: "If an account exists with that email, instructions have been sent.",
  });
};
