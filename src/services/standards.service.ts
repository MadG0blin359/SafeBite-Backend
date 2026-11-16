import { Prisma, ContaminantType } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { standardResolverService } from "./standard-resolver.service.js";
import { ListStandardsQuery } from "../validators/standards.validator.js";

export const standardsService = {
  async listStandards(query: ListStandardsQuery) {
    const {
      categoryId,
      authority,
      contaminant,
      referenceRole,
      standardCode,
      q,
      page,
      limit,
    } = query;

    const where: Prisma.ReferenceStandardWhereInput = {
      ...(categoryId ? { categoryId } : {}),
      ...(authority ? { authority } : {}),
      ...(contaminant ? { contaminant } : {}),
      ...(referenceRole ? { referenceRole } : {}),
      ...(standardCode
        ? { standardCode: { contains: standardCode, mode: "insensitive" } }
        : {}),
      ...(q
        ? {
            OR: [
              { standardCode: { contains: q, mode: "insensitive" } },
              { productMatrix: { contains: q, mode: "insensitive" } },
              { externalRecordId: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } },
              { category: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.referenceStandard.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { referenceRole: "asc" },
          { standardCode: "asc" },
          { contaminant: "asc" },
          { productMatrix: "asc" },
        ],
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.referenceStandard.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async getStandardsSummary() {
    const [totalRecords, byAuthority, byContaminant, byRole, distinctCodes] = await Promise.all([
      prisma.referenceStandard.count(),
      prisma.referenceStandard.groupBy({
        by: ["authority"],
        _count: { _all: true },
      }),
      prisma.referenceStandard.groupBy({
        by: ["contaminant"],
        _count: { _all: true },
      }),
      prisma.referenceStandard.groupBy({
        by: ["referenceRole"],
        _count: { _all: true },
      }),
      prisma.referenceStandard.findMany({
        distinct: ["standardCode"],
        select: { standardCode: true },
      }),
    ]);

    return {
      totalRecords,
      distinctStandardsCount: distinctCodes.length,
      byAuthority: Object.fromEntries(byAuthority.map((r) => [r.authority, r._count._all])),
      byContaminant: Object.fromEntries(byContaminant.map((r) => [r.contaminant, r._count._all])),
      byReferenceRole: Object.fromEntries(byRole.map((r) => [r.referenceRole, r._count._all])),
    };
  },

  async getStandardById(id: string) {
    const standard = await prisma.referenceStandard.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!standard) {
      throw new AppError(404, "Regulatory standard not found");
    }

    return standard;
  },

  async getCategoryStandards(
    categoryId: string,
    matrix?: string,
    contaminant?: ContaminantType
  ) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, description: true },
    });

    if (!category) {
      throw new AppError(404, "Food category not found");
    }

    const [resolved, applicableLimits] = await Promise.all([
      contaminant
        ? standardResolverService.resolveForContaminant(contaminant, categoryId, matrix).then((r) => ({
            [contaminant]: r,
          }))
        : standardResolverService.resolveAllForCategory(categoryId, matrix),
      prisma.referenceStandard.findMany({
        where: {
          categoryId,
          ...(contaminant ? { contaminant } : {}),
        },
        orderBy: [
          { referenceRole: "asc" },
          { contaminant: "asc" },
          { standardCode: "asc" },
          { productMatrix: "asc" },
        ],
      }),
    ]);

    return {
      category,
      requestedMatrix: matrix || null,
      resolved,
      applicableLimits,
    };
  },
};

export default standardsService;
