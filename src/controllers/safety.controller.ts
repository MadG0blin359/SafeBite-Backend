import { Request, Response } from "express";
import { safetyEngineService } from "../services/safety-engine.service.js";
import { alternativeService } from "../services/alternative.service.js";
import { productsService } from "../services/products.service.js";
import { AppError } from "../utils/app-error.js";

export const getProductSafety = async (req: Request, res: Response): Promise<void> => {
  const identifier = req.params.productId as string;
  const product = await productsService.getProductById(identifier);

  const analysis = await safetyEngineService.analyzeProduct(product.id);
  if (!analysis) {
    throw new AppError(404, `Safety analysis could not be generated for product: ${identifier}`);
  }

  res.status(200).json({
    success: true,
    data: analysis,
  });
};

export const getProductAlternatives = async (req: Request, res: Response): Promise<void> => {
  const identifier = req.params.productId as string;
  const product = await productsService.getProductById(identifier);

  const alternatives = await alternativeService.getSaferAlternatives(product.id);

  res.status(200).json({
    success: true,
    data: alternatives,
  });
};
