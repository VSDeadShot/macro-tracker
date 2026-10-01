import { describe, expect, it } from "vitest";
import { parseMealInput } from "./meal-input";

const VALID = { foodName: "Paneer Bhurji", calories: 420, protein: 24, carbs: 10, fats: 30 };
const MACROS = ["calories", "protein", "carbs", "fats"] as const;

describe("parseMealInput", () => {
  it("accepts a valid meal and maps foodName to food_items", () => {
    expect(parseMealInput(VALID)).toEqual({
      ok: true,
      value: { food_items: "Paneer Bhurji", calories: 420, protein: 24, carbs: 10, fats: 30 },
    });
  });

  it("ignores extra fields like ingredients and confidence", () => {
    const result = parseMealInput({ ...VALID, ingredients: "Paneer, Onion", confidence: "high" });

    expect(result.ok && result.value).toEqual({
      food_items: "Paneer Bhurji", calories: 420, protein: 24, carbs: 10, fats: 30,
    });
  });

  it("trims the food name", () => {
    const result = parseMealInput({ ...VALID, foodName: "  Dal Tadka  " });

    expect(result.ok && result.value.food_items).toBe("Dal Tadka");
  });

  it("accepts zero for every macro", () => {
    const result = parseMealInput({ foodName: "Black Coffee", calories: 0, protein: 0, carbs: 0, fats: 0 });

    expect(result.ok).toBe(true);
  });

  it("coerces numeric strings (form inputs) to numbers", () => {
    const result = parseMealInput({ foodName: "Shake", calories: "250", protein: "48.5", carbs: "6", fats: "3" });

    expect(result).toEqual({
      ok: true,
      value: { food_items: "Shake", calories: 250, protein: 48.5, carbs: 6, fats: 3 },
    });
  });

  it.each([undefined, "", "   ", 42])("rejects foodName %j", (foodName) => {
    expect(parseMealInput({ ...VALID, foodName }).ok).toBe(false);
  });

  it("rejects a food name over 200 characters", () => {
    expect(parseMealInput({ ...VALID, foodName: "x".repeat(201) }).ok).toBe(false);
    expect(parseMealInput({ ...VALID, foodName: "x".repeat(200) }).ok).toBe(true);
  });

  it.each(MACROS)("rejects a missing %s", (field) => {
    const body: Record<string, unknown> = { ...VALID };
    delete body[field];

    expect(parseMealInput(body).ok).toBe(false);
  });

  it.each([
    ["empty string", ""],
    ["whitespace", "  "],
    ["null", null],
    ["boolean", true],
    ["non-numeric string", "abc"],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["negative", -1],
  ])("rejects protein as %s", (_label, protein) => {
    expect(parseMealInput({ ...VALID, protein }).ok).toBe(false);
  });

  it("rejects calories above 10000 but accepts exactly 10000", () => {
    expect(parseMealInput({ ...VALID, calories: 10001 }).ok).toBe(false);
    expect(parseMealInput({ ...VALID, calories: 10000 }).ok).toBe(true);
  });

  it.each(["protein", "carbs", "fats"] as const)("rejects %s above 1000g but accepts exactly 1000g", (field) => {
    expect(parseMealInput({ ...VALID, [field]: 1001 }).ok).toBe(false);
    expect(parseMealInput({ ...VALID, [field]: 1000 }).ok).toBe(true);
  });

  // Wrapped in tuples: it.each spreads array rows, so a bare [VALID] would arrive as VALID itself
  it.each([
    ["null", null],
    ["a string", "meal"],
    ["an array", [VALID]],
  ])("rejects a non-object body (%s)", (_label, body) => {
    expect(parseMealInput(body).ok).toBe(false);
  });

  it("returns an error message when invalid", () => {
    const result = parseMealInput({ ...VALID, fats: -5 });

    expect(result).toEqual({ ok: false, error: expect.any(String) });
  });
});
