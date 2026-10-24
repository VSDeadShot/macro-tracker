import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { count } = vi.hoisted(() => ({ count: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { dailyTarget: { count } } }));

import { GET } from "./route";

// Fake placeholders only — never real values.
const SECRET = "test-cron-secret";
const SUPABASE_URL = "https://test-project.supabase.co";
const SECRET_KEY = "sb_secret_test-placeholder-key";

const fetchMock = vi.fn();
let consoleError: ReturnType<typeof vi.spyOn>;

function request(authorization?: string) {
  const headers = authorization ? { authorization } : undefined;
  return new NextRequest("http://localhost/api/keepalive", { headers });
}

function loggedText() {
  return consoleError.mock.calls.flat().map(String).join(" ");
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", SECRET_KEY);
  vi.stubGlobal("fetch", fetchMock);
  count.mockResolvedValue(1);
  fetchMock.mockResolvedValue(new Response('[{"id":"row-1"}]', { status: 200 }));
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

  describe("misconfigured", () => {
    it.each([
      ["missing", undefined],
      ["empty", ""],
      ["whitespace", "   "],
    ])("returns 500 with a generic message when SUPABASE_SERVICE_ROLE_KEY is %s", async (_, value) => {
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", value);

      const res = await GET(request(`Bearer ${SECRET}`));

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ ok: false, error: "Keep-alive misconfigured" });
      expect(count).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("authorized", () => {
    it("reads the DB and DailyTarget via PostgREST, and reports both ok", async () => {
      const res = await GET(request(`Bearer ${SECRET}`));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, db: "ok", rest: "ok" });
      expect(count).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("sends the secret key in the apikey header only, with no-store and a timeout", async () => {
      await GET(request(`Bearer ${SECRET}`));

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${SUPABASE_URL}/rest/v1/DailyTarget?select=id&limit=1`);
      expect(init.headers).toEqual({ apikey: SECRET_KEY });
      expect(init.cache).toBe("no-store");
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("returns 500 when the PostgREST read throws, without leaking the key", async () => {
      fetchMock.mockRejectedValue(new Error(`request failed (apikey: ${SECRET_KEY})`));

      const res = await GET(request(`Bearer ${SECRET}`));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ ok: false, db: "ok", rest: "failed" });
      expect(JSON.stringify(body)).not.toContain(SECRET_KEY);
      expect(consoleError).toHaveBeenCalled();
      expect(loggedText()).not.toContain(SECRET_KEY);
    });

    it("returns 500 when the PostgREST read gets a non-2xx, logging the status but not the key", async () => {
      fetchMock.mockResolvedValue(new Response('{"code":"42501"}', { status: 403 }));

      const res = await GET(request(`Bearer ${SECRET}`));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ ok: false, db: "ok", rest: "failed" });
      expect(JSON.stringify(body)).not.toContain(SECRET_KEY);
      expect(loggedText()).toContain("403");
      expect(loggedText()).not.toContain(SECRET_KEY);
    });

    it("returns 500 without leaking error details when the DB read fails", async () => {
      count.mockRejectedValue(new Error("connection refused at db-host:6543"));

      const res = await GET(request(`Bearer ${SECRET}`));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ ok: false, db: "failed", rest: "ok" });
      expect(JSON.stringify(body)).not.toContain("connection refused");
      expect(consoleError).toHaveBeenCalled();
    });
  });
});
