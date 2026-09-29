import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { count } = vi.hoisted(() => ({ count: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { dailyTarget: { count } } }));

import { GET } from "./route";

// Fake placeholders only — never real values.
const SECRET = "test-cron-secret";
const SUPABASE_URL = "https://test-project.supabase.co";
const ANON_KEY = "test-anon-key";

const fetchMock = vi.fn();
let consoleError: ReturnType<typeof vi.spyOn>;

function request(authorization?: string) {
  const headers = authorization ? { authorization } : undefined;
  return new NextRequest("http://localhost/api/keepalive", { headers });
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON_KEY);
  vi.stubGlobal("fetch", fetchMock);
  count.mockResolvedValue(1);
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("GET /api/keepalive", () => {
  describe("unauthorized", () => {
    it("returns 401 without touching the DB or Supabase when the header is missing", async () => {
      const res = await GET(request());

      expect(res.status).toBe(401);
      expect(count).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns 401 without touching the DB or Supabase when the secret is wrong", async () => {
      const res = await GET(request("Bearer wrong-secret"));

      expect(res.status).toBe(401);
      expect(count).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns 401 when CRON_SECRET is not configured", async () => {
      vi.stubEnv("CRON_SECRET", "");

      const res = await GET(request("Bearer "));

      expect(res.status).toBe(401);
      expect(count).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("authorized", () => {
    it("reads the DB, pings Supabase Auth health, and reports both ok", async () => {
      const res = await GET(request(`Bearer ${SECRET}`));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, db: "ok", auth: "ok" });
      expect(count).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${SUPABASE_URL}/auth/v1/health`);
      expect(init.headers).toMatchObject({ apikey: ANON_KEY });
    });

    it("still returns 200 when the auth ping throws, reporting auth failed", async () => {
      fetchMock.mockRejectedValue(new Error("network down"));

      const res = await GET(request(`Bearer ${SECRET}`));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, db: "ok", auth: "failed" });
      expect(consoleError).toHaveBeenCalled();
    });

    it("still returns 200 when the auth ping gets a non-2xx, reporting auth failed", async () => {
      fetchMock.mockResolvedValue(new Response("unavailable", { status: 503 }));

      const res = await GET(request(`Bearer ${SECRET}`));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, db: "ok", auth: "failed" });
      expect(consoleError).toHaveBeenCalled();
    });

    it("returns 500 without leaking error details when the DB read fails", async () => {
      count.mockRejectedValue(new Error("connection refused at db-host:6543"));

      const res = await GET(request(`Bearer ${SECRET}`));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toMatchObject({ ok: false, db: "failed" });
      expect(JSON.stringify(body)).not.toContain("connection refused");
      expect(consoleError).toHaveBeenCalled();
    });
  });
});
