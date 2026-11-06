export interface SafeBiteUserPayload {
  id: string;
  email: string;
  fullName?: string | null;
  role: string;
  healthConsent?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: SafeBiteUserPayload;
      token?: string;
    }
  }
}

export {};
