import crypto from "crypto";

export function generateSecureToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
