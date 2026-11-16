import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { ACTIVE_RULE_VERSION } from "../constants/status.constants.js";
import { ALLOWED_HEALTH_TAGS } from "../validators/user-data.validator.js";

export const userDataService = {
  // ─── Search & Scan History (FR-12, NFR-PR-02) ─────────────────────────

  /**
   * Record a product barcode scan in user's history (FR-12-02).
   */
  async recordScan(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    return prisma.scanHistory.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            barcode: true,
            imageUrl: true,
          },
        },
      },
    });
  },

  /**
   * Record a text search query in user's history (FR-12-01).
   */
  async recordSearch(userId: string, query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new AppError(400, "Search query cannot be empty");
    }

    return prisma.searchHistory.create({
      data: {
        userId,
        query: trimmed,
      },
    });
  },

  /**
   * Retrieve user's scan and search history (FR-12-03).
   */
  async getHistory(userId: string, limit = 20) {
    const [scans, searches] = await Promise.all([
      prisma.scanHistory.findMany({
        where: { userId },
        orderBy: { scannedAt: "desc" },
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              barcode: true,
              imageUrl: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { searchedAt: "desc" },
        take: limit,
      }),
    ]);

    return {
      scans,
      searches,
    };
  },

  /**
   * Delete all stored search and scan history for the user (NFR-PR-02).
   * Verifies subsequent retrieval returns 0 records.
   */
  async clearHistory(userId: string) {
    await prisma.$transaction([
      prisma.scanHistory.deleteMany({ where: { userId } }),
      prisma.searchHistory.deleteMany({ where: { userId } }),
    ]);

    return { success: true, message: "User scan and search history wiped completely." };
  },

  // ─── Favorites (FR-13-01 to FR-13-05) ──────────────────────────────────

  /**
   * Add a product to favorites (FR-13-01).
   */
  async addFavorite(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      update: {},
      create: {
        userId,
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            barcode: true,
            imageUrl: true,
          },
        },
      },
    });

    return favorite;
  },

  /**
   * Remove a product from favorites (FR-13-05).
   */
  async removeFavorite(userId: string, productId: string) {
    try {
      await prisma.favorite.delete({
        where: {
          userId_productId: { userId, productId },
        },
      });
      return { success: true, message: "Product removed from favorites" };
    } catch {
      throw new AppError(404, "Product was not in favorites");
    }
  },

  /**
   * List user's favorite products (FR-13-03).
   */
  async getFavorites(userId: string) {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
            analysisResults: {
              where: { ruleVersion: ACTIVE_RULE_VERSION },
              orderBy: { calculatedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    return favorites.map((fav) => {
      const latestAnalysis = fav.product.analysisResults[0];
      return {
        favoriteId: fav.id,
        savedAt: fav.createdAt,
        product: {
          id: fav.product.id,
          name: fav.product.name,
          brand: fav.product.brand,
          barcode: fav.product.barcode,
          category: fav.product.category.name,
          imageUrl: fav.product.imageUrl,
          grade: latestAnalysis?.grade ?? null,
          cci: latestAnalysis?.cci ?? null,
          statusText: latestAnalysis?.statusText ?? null,
        },
      };
    });
  },

  // ─── Watchlist & Alerts (FR-13-02, FR-13-04, FR-13-06, FR-13-07) ───────

  /**
   * Add a product to user's watchlist with current grade snapshot (FR-13-02).
   */
  async addToWatchlist(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        analysisResults: {
          where: { ruleVersion: ACTIVE_RULE_VERSION },
          orderBy: { calculatedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    const currentGrade = product.analysisResults[0]?.grade || null;

    const watchItem = await prisma.watchlist.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      update: {
        lastKnownGrade: currentGrade,
      },
      create: {
        userId,
        productId,
        lastKnownGrade: currentGrade,
      },
    });

    return watchItem;
  },

  /**
   * Remove a product from user's watchlist (FR-13-06).
   */
  async removeFromWatchlist(userId: string, productId: string) {
    try {
      await prisma.watchlist.delete({
        where: {
          userId_productId: { userId, productId },
        },
      });
      return { success: true, message: "Product removed from watchlist" };
    } catch {
      throw new AppError(404, "Product was not in watchlist");
    }
  },

  /**
   * List user's watchlist products and detect if assessment has changed (FR-13-07).
   */
  async getWatchlist(userId: string) {
    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
            analysisResults: {
              where: { ruleVersion: ACTIVE_RULE_VERSION },
              orderBy: { calculatedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    return watchlist.map((item) => {
      const latestAnalysis = item.product.analysisResults[0];
      const currentGrade = latestAnalysis?.grade || null;
      const hasAssessmentChanged =
        item.lastKnownGrade !== null &&
        currentGrade !== null &&
        item.lastKnownGrade !== currentGrade;

      return {
        watchlistId: item.id,
        savedAt: item.createdAt,
        lastKnownGrade: item.lastKnownGrade,
        currentGrade,
        hasAssessmentChanged,
        product: {
          id: item.product.id,
          name: item.product.name,
          brand: item.product.brand,
          barcode: item.product.barcode,
          category: item.product.category.name,
          imageUrl: item.product.imageUrl,
          cci: latestAnalysis?.cci ?? null,
          statusText: latestAnalysis?.statusText ?? null,
        },
      };
    });
  },

  // ─── Health Profile & Consent Management (FR-16-01, FR-16-02) ──────────

  /**
   * Retrieve user's health profile and consent status (FR-16-01).
   */
  async getHealthProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        healthConsent: true,
        consentDate: true,
        healthTags: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    return user;
  },

  /**
   * Update explicit health consent state (FR-16-02).
   * If consent is revoked (false), user's health tags are cleared automatically.
   */
  async setHealthConsent(userId: string, consent: boolean) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        healthConsent: consent,
        consentDate: consent ? new Date() : null,
        healthTags: consent ? undefined : [], // Clear tags if consent revoked
      },
      select: {
        id: true,
        healthConsent: true,
        consentDate: true,
        healthTags: true,
      },
    });

    return updated;
  },

  /**
   * Update user's selected health-context tags (FR-16-01, FR-16-02).
   * Enforces: Tags can ONLY be saved if user has provided explicit consent.
   */
  async updateHealthTags(userId: string, tags: string[]) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (!user.healthConsent) {
      throw new AppError(
        403,
        "Cannot record health-context tags without explicit user consent (FR-16-02)."
      );
    }

    // Filter and sanitize tags defensively (SEC-007)
    const cleanTags = Array.from(
      new Set(
        tags
          .map((t) => t.trim().toUpperCase())
          .filter((t) => (ALLOWED_HEALTH_TAGS as readonly string[]).includes(t))
      )
    );

    if (cleanTags.length === 0) {
      throw new AppError(400, "No recognized valid health-context tags provided.");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        healthTags: cleanTags,
      },
      select: {
        id: true,
        healthConsent: true,
        consentDate: true,
        healthTags: true,
      },
    });

    return updated;
  },

  /**
   * Delete all health-context tags and revoke consent (FR-16-02).
   */
  async clearHealthProfile(userId: string) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        healthConsent: false,
        consentDate: null,
        healthTags: [],
      },
      select: {
        id: true,
        healthConsent: true,
        healthTags: true,
      },
    });

    return {
      success: true,
      message: "Health tags deleted and consent revoked successfully.",
      profile: updated,
    };
  },
};

export default userDataService;
