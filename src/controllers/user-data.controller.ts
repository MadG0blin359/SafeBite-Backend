import { Request, Response } from "express";
import { userDataService } from "../services/user-data.service.js";

// ─── History ──────────────────────────────────────────────────────────

export const getHistory = async (req: Request, res: Response): Promise<void> => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const history = await userDataService.getHistory(req.user!.id, limit);
  res.status(200).json({
    success: true,
    data: history,
  });
};

export const recordScan = async (req: Request, res: Response): Promise<void> => {
  const result = await userDataService.recordScan(req.user!.id, req.body.productId);
  res.status(201).json({
    success: true,
    message: "Product scan recorded in history",
    data: result,
  });
};

export const recordSearch = async (req: Request, res: Response): Promise<void> => {
  const result = await userDataService.recordSearch(req.user!.id, req.body.query);
  res.status(201).json({
    success: true,
    message: "Search query recorded in history",
    data: result,
  });
};

export const clearHistory = async (req: Request, res: Response): Promise<void> => {
  const result = await userDataService.clearHistory(req.user!.id);
  res.status(200).json({
    success: true,
    message: result.message,
  });
};

// ─── Favorites ────────────────────────────────────────────────────────

export const getFavorites = async (req: Request, res: Response): Promise<void> => {
  const favorites = await userDataService.getFavorites(req.user!.id);
  res.status(200).json({
    success: true,
    data: favorites,
  });
};

export const addFavorite = async (req: Request, res: Response): Promise<void> => {
  const favorite = await userDataService.addFavorite(
    req.user!.id,
    req.params.productId as string
  );
  res.status(201).json({
    success: true,
    message: "Product added to favorites",
    data: favorite,
  });
};

export const removeFavorite = async (req: Request, res: Response): Promise<void> => {
  const result = await userDataService.removeFavorite(
    req.user!.id,
    req.params.productId as string
  );
  res.status(200).json({
    success: true,
    message: result.message,
  });
};

// ─── Watchlist ────────────────────────────────────────────────────────

export const getWatchlist = async (req: Request, res: Response): Promise<void> => {
  const watchlist = await userDataService.getWatchlist(req.user!.id);
  res.status(200).json({
    success: true,
    data: watchlist,
  });
};

export const addToWatchlist = async (req: Request, res: Response): Promise<void> => {
  const item = await userDataService.addToWatchlist(
    req.user!.id,
    req.params.productId as string
  );
  res.status(201).json({
    success: true,
    message: "Product added to watchlist",
    data: item,
  });
};

export const removeFromWatchlist = async (req: Request, res: Response): Promise<void> => {
  const result = await userDataService.removeFromWatchlist(
    req.user!.id,
    req.params.productId as string
  );
  res.status(200).json({
    success: true,
    message: result.message,
  });
};

// ─── Health Profile & Consent ──────────────────────────────────────────

export const getHealthProfile = async (req: Request, res: Response): Promise<void> => {
  const profile = await userDataService.getHealthProfile(req.user!.id);
  res.status(200).json({
    success: true,
    data: profile,
  });
};

export const setHealthConsent = async (req: Request, res: Response): Promise<void> => {
  const profile = await userDataService.setHealthConsent(req.user!.id, req.body.consent);
  res.status(200).json({
    success: true,
    message: `Health consent updated to ${req.body.consent}`,
    data: profile,
  });
};

export const updateHealthTags = async (req: Request, res: Response): Promise<void> => {
  const profile = await userDataService.updateHealthTags(req.user!.id, req.body.tags);
  res.status(200).json({
    success: true,
    message: "Health tags updated successfully",
    data: profile,
  });
};

export const clearHealthProfile = async (req: Request, res: Response): Promise<void> => {
  const result = await userDataService.clearHealthProfile(req.user!.id);
  res.status(200).json({
    success: true,
    message: result.message,
    data: result.profile,
  });
};
