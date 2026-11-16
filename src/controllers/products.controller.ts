import { Request, Response } from "express";
import { productsService } from "../services/products.service.js";
import {
  ListProductsQuery,
  CategoryProductsQuery,
} from "../validators/products.validator.js";

export const listProducts = async (req: Request, res: Response): Promise<void> => {
  const query = (req.validatedQuery || {}) as ListProductsQuery;
  const result = await productsService.listProducts(query);
  res.status(200).json({
    success: true,
    data: result.items,
    meta: result.pagination,
  });
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  const product = await productsService.getProductById(req.params.id as string);
  res.status(200).json({
    success: true,
    data: product,
  });
};

export const getProductByBarcode = async (req: Request, res: Response): Promise<void> => {
  const product = await productsService.getProductByBarcode(req.params.barcode as string);
  res.status(200).json({
    success: true,
    data: product,
  });
};

export const listCategories = async (_req: Request, res: Response): Promise<void> => {
  const categories = await productsService.listCategories();
  res.status(200).json({
    success: true,
    data: categories,
  });
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  const category = await productsService.getCategoryById(req.params.id as string);
  res.status(200).json({
    success: true,
    data: category,
  });
};

export const getCategoryProducts = async (req: Request, res: Response): Promise<void> => {
  const query = (req.validatedQuery || {}) as CategoryProductsQuery;
  const result = await productsService.getCategoryProducts(req.params.id as string, query);
  res.status(200).json({
    success: true,
    data: result.items,
    meta: result.pagination,
  });
};
