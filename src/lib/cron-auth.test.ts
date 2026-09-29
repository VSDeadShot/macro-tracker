import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./cron-auth";

// Fake placeholder only — never a real secret.
const SECRET = "test-cron-secret";

describe("isAuthorizedCronRequest", () => {
  it("accepts the exact Bearer secret", () => {
    expect(isAuthorizedCronRequest(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("rejects a missing Authorization header", () => {
    expect(isAuthorizedCronRequest(null, SECRET)).toBe(false);
  });

  it("rejects a wrong secret of the same length", () => {
    const wrong = "x".repeat(SECRET.length);
    expect(isAuthorizedCronRequest(`Bearer ${wrong}`, SECRET)).toBe(false);
  });

  it("rejects a wrong secret of a different length", () => {
    expect(isAuthorizedCronRequest(`Bearer ${SECRET}-extra`, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer short", SECRET)).toBe(false);
  });

  it("rejects the secret without the Bearer prefix", () => {
    expect(isAuthorizedCronRequest(SECRET, SECRET)).toBe(false);
  });

  it("fails closed when CRON_SECRET is unset", () => {
    expect(isAuthorizedCronRequest("Bearer undefined", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", undefined)).toBe(false);
  });

  it("fails closed when CRON_SECRET is empty or whitespace", () => {
    expect(isAuthorizedCronRequest("Bearer ", "")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer    ", "   ")).toBe(false);
  });
});
