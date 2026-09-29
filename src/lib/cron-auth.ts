import { createHash, timingSafeEqual } from "node:crypto";

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set on the project.
// Fails closed if the secret is unset/blank, so a missing env var never opens the endpoint.
export function isAuthorizedCronRequest(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret?.trim() || !authHeader) {
    return false;
  }

  // Hash both sides so the constant-time compare works on equal-length buffers and doesn't leak the secret's length
  const received = createHash("sha256").update(authHeader).digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();

  return timingSafeEqual(received, expected);
}
