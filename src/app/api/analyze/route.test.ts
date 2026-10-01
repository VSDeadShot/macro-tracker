import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateContent, getUser } = vi.hoisted(() => {
  // The route reads the key at module load, so it must be set before the import below. Fake placeholder only.
  process.env.GEMINI_API_KEY = "test-gemini-key";
  return { generateContent: vi.fn(), getUser: vi.fn() };
});

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent };
    }
  },
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser } }),
}));

import { POST } from "./route";

const IMAGE = "data:image/jpeg;base64,AAAA";
const ESTIMATE = { foodName: "Dal Rice", calories: 450, protein: 15, carbs: 70, fats: 10, confidence: "medium" };

let consoleError: ReturnType<typeof vi.spyOn>;

function request(body: unknown) {
  return new NextRequest("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function geminiReturns(text: string) {
  generateContent.mockResolvedValue({ response: { text: () => text } });
}

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  geminiReturns(JSON.stringify(ESTIMATE));
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

afterAll(() => {
  delete process.env.GEMINI_API_KEY;
});

describe("POST /api/analyze", () => {
  describe("unauthenticated", () => {
    it("returns 401 and never calls Gemini", async () => {
      getUser.mockResolvedValue({ data: { user: null } });

      const res = await POST(request({ imageBase64: IMAGE }));

      expect(res.status).toBe(401);
      expect(generateContent).not.toHaveBeenCalled();
    });
  });

  describe("authenticated", () => {
    it("returns the parsed estimate", async () => {
      const res = await POST(request({ imageBase64: IMAGE }));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(ESTIMATE);
      expect(generateContent).toHaveBeenCalledTimes(1);
    });

    it("returns a generic 500 without raw error details when Gemini throws", async () => {
      const raw = "[429 Too Many Requests] Quota exceeded for project 1234567890";
      generateContent.mockRejectedValue(new Error(raw));

      const res = await POST(request({ imageBase64: IMAGE }));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).not.toHaveProperty("details");
      expect(JSON.stringify(body)).not.toContain("Quota exceeded");
      expect(body.error).toEqual(expect.any(String));
      expect(consoleError).toHaveBeenCalled();
    });

    it("returns a generic 500 without the parser message when Gemini returns malformed JSON", async () => {
      geminiReturns("this is not json");

      const res = await POST(request({ imageBase64: IMAGE }));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).not.toHaveProperty("details");
      expect(JSON.stringify(body)).not.toMatch(/Unexpected token|not valid JSON/);
      expect(consoleError).toHaveBeenCalled();
    });

    it("returns a generic 500 that doesn't name the env var when GEMINI_API_KEY is missing", async () => {
      // The key is read at module load, so re-import the route with it unset
      const savedKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      vi.resetModules();
      const { POST: postWithoutKey } = await import("./route");
      process.env.GEMINI_API_KEY = savedKey;

      const res = await postWithoutKey(request({ imageBase64: IMAGE }));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(JSON.stringify(body)).not.toContain("GEMINI_API_KEY");
      expect(body).toEqual({ error: "Failed to analyze image" });
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("GEMINI_API_KEY"));
      expect(generateContent).not.toHaveBeenCalled();
    });
  });
});
