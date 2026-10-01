import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { create, getUser } = vi.hoisted(() => ({ create: vi.fn(), getUser: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: { meal: { create } } }));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser } }),
}));

import { POST } from "./route";

const VALID = { foodName: "Paneer Bhurji", calories: 420, protein: 24, carbs: 10, fats: 30 };

function request(body: unknown) {
  return new NextRequest("http://localhost/api/meals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  create.mockImplementation(async ({ data }) => ({ id: "meal-1", ...data }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/meals", () => {
  it("returns 401 without touching the DB when not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(request(VALID));

    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("saves a valid meal scoped to the signed-in user", async () => {
    const res = await POST(request(VALID));

    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledWith({
      data: { user_id: "user-1", food_items: "Paneer Bhurji", calories: 420, protein: 24, carbs: 10, fats: 30 },
    });
  });

  it("coerces numeric strings and trims the name before saving", async () => {
    const res = await POST(request({ foodName: "  Shake ", calories: "250", protein: "48.5", carbs: "6", fats: "3" }));

    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledWith({
      data: { user_id: "user-1", food_items: "Shake", calories: 250, protein: 48.5, carbs: 6, fats: 3 },
    });
  });

  it.each([
    ["missing name", { ...VALID, foodName: "" }],
    ["non-numeric protein", { ...VALID, protein: "abc" }],
    ["negative fats", { ...VALID, fats: -5 }],
    ["missing calories", { foodName: "Dal", protein: 10, carbs: 20, fats: 5 }],
    ["empty-string carbs", { ...VALID, carbs: "" }],
    ["absurd calories", { ...VALID, calories: 45000 }],
  ])("returns 400 without touching the DB for %s", async (_label, body) => {
    const res = await POST(request(body));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: expect.any(String) });
    expect(create).not.toHaveBeenCalled();
  });
});
