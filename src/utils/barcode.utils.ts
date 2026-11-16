/**
 * SafeBite Barcode & GTIN Processing Utility
 * Implements GS1 Modulo-10 validation, normalization, and candidate resolution.
 */

/**
 * Strips whitespace, control characters, and non-numeric artifacts from barcode input.
 */
export function cleanBarcode(input: string): string {
  if (!input) return "";
  return input.trim().replace(/[\s\-_]+/g, "");
}

/**
 * Calculates GS1 Modulo-10 check digit for a GTIN payload.
 * For an (N-1) length payload, weights alternate 3 and 1 from right to left.
 */
export function calculateGs1CheckDigit(payload: string): number {
  const digits = payload.replace(/\D/g, "");
  let sum = 0;
  let multiplier = 3;

  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * multiplier;
    multiplier = multiplier === 3 ? 1 : 3;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Verifies whether a numeric barcode string passes standard GS1 Modulo-10 check digit validation.
 */
export function isValidGtin(barcode: string): boolean {
  const cleaned = cleanBarcode(barcode);
  if (!/^\d{8}$|^\d{12,14}$/.test(cleaned)) {
    return false;
  }

  const payload = cleaned.slice(0, -1);
  const checkDigit = parseInt(cleaned.slice(-1), 10);
  return calculateGs1CheckDigit(payload) === checkDigit;
}

/**
 * Generates candidate barcode variants for database lookup.
 * Restores leading zeros stripped by spreadsheets (11-digit UPC-A, 12-digit EAN-13).
 */
export function getBarcodeLookupCandidates(barcode: string): string[] {
  const cleaned = cleanBarcode(barcode);
  if (!cleaned) return [];

  const candidates = new Set<string>();
  candidates.add(cleaned);

  // If 11 digits, test 12-digit zero-padded UPC-A
  if (cleaned.length === 11 && /^\d+$/.test(cleaned)) {
    candidates.add(`0${cleaned}`);
  }

  // If 12 digits, test 13-digit zero-padded EAN-13
  if (cleaned.length === 12 && /^\d+$/.test(cleaned)) {
    candidates.add(`0${cleaned}`);
  }

  // If 13 digits with leading zero, test 12-digit stripped variant
  if (cleaned.length === 13 && cleaned.startsWith("0")) {
    candidates.add(cleaned.substring(1));
  }

  return Array.from(candidates);
}
