import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { SignUpInput, SignInInput, UpdateProfileInput } from "../validators/auth.validator.js";

const SALT_ROUNDS = 12;

export const authService = {
  /**
   * Register a new user with salted password hash (NFR-S-02).
   */
  async signUp(input: SignUpInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError(409, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        fullName: input.fullName ? input.fullName.trim().normalize("NFC") : undefined,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        healthConsent: true,
        healthTags: true,
        createdAt: true,
      },
    });

    // Decoupled: Stateless JWT contains strictly identity & authorization claims (SEC-001)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        healthConsent: user.healthConsent,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    return { user, token };
  },

  /**
   * Log in user using email and password.
   */
  async signIn(input: SignInInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError(401, "Invalid email or password");
    }

    // Decoupled: Stateless JWT contains strictly identity & authorization claims (SEC-001)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        healthConsent: user.healthConsent,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    const userProfile = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      healthConsent: user.healthConsent,
      healthTags: user.healthTags,
      createdAt: user.createdAt,
    };

    return { user: userProfile, token };
  },

  /**
   * Fetch current authenticated user's profile.
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        healthConsent: true,
        consentDate: true,
        healthTags: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User profile not found");
    }

    return user;
  },

  /**
   * Update profile information with strict validation (SEC-001).
   */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName ? input.fullName.trim().normalize("NFC") : undefined,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        healthConsent: true,
        consentDate: true,
        healthTags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },

  /**
   * Placeholder password reset (initiates reset workflow).
   */
  async resetPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't leak whether user exists for security
    return Boolean(user);
  },
};

export default authService;
