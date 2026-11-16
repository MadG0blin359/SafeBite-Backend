import { Request, Response } from "express";
import { standardsService } from "../services/standards.service.js";
import {
  ListStandardsQuery,
  ResolveCategoryStandardsQuery,
} from "../validators/standards.validator.js";

export const listStandards = async (req: Request, res: Response): Promise<void> => {
  const query = (req.validatedQuery || {}) as ListStandardsQuery;
  const result = await standardsService.listStandards(query);
  res.status(200).json({
    success: true,
    data: result.items,
    meta: result.pagination,
  });
};

export const getStandardsSummary = async (_req: Request, res: Response): Promise<void> => {
  const summary = await standardsService.getStandardsSummary();
  res.status(200).json({
    success: true,
    data: summary,
  });
};

export const getStandardById = async (req: Request, res: Response): Promise<void> => {
  const standard = await standardsService.getStandardById(req.params.id as string);
  res.status(200).json({
    success: true,
    data: standard,
  });
};

export const getCategoryStandards = async (req: Request, res: Response): Promise<void> => {
  const query = (req.validatedQuery || {}) as ResolveCategoryStandardsQuery;
  const result = await standardsService.getCategoryStandards(
    req.params.categoryId as string,
    query.matrix,
    query.contaminant
  );
  res.status(200).json({
    success: true,
    data: result,
  });
};
