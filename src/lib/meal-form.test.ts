import { describe, expect, it } from "vitest";
import {
  applyCalorieAutoFill,
  caloriesFromMacros,
  canSaveTemplate,
  clampMacroInput,
  GENERIC_SAVE_ERROR,
  macroInputChange,
  saveErrorMessage,
} from "./meal-form";
import { MAX_CALORIES, MAX_MACRO_GRAMS } from "./meal-input";

describe("clampMacroInput", () => {
  it.each([
    ["12", 12],
    ["12.5", 12.5],
    ["0", 0],
  ])("parses %j as %d", (raw, expected) => {
    expect(clampMacroInput(raw, MAX_MACRO_GRAMS)).toBe(expected);
  });

  it("treats a cleared field as 0", () => {
    expect(clampMacroInput("", MAX_MACRO_GRAMS)).toBe(0);
  });

  it("clamps negative values to 0", () => {
    expect(clampMacroInput("-3", MAX_MACRO_GRAMS)).toBe(0);
  });

  it("clamps values above the server cap to the cap", () => {
    expect(clampMacroInput("45000", MAX_CALORIES)).toBe(MAX_CALORIES);
    expect(clampMacroInput("1500", MAX_MACRO_GRAMS)).toBe(MAX_MACRO_GRAMS);
  });

  it.each(["abc", "Infinity", "NaN"])("treats non-finite input %j as 0", (raw) => {
    expect(clampMacroInput(raw, MAX_MACRO_GRAMS)).toBe(0);
  });
});

describe("saveErrorMessage", () => {
  it("shows the server's validation message for a 400", () => {
    const message = "Calories must be 0-10000 and protein, carbs and fats 0-1000g";

    expect(saveErrorMessage(400, { error: message })).toBe(message);
  });

  it.each([
    ["400 without an error field", 400, {}],
    ["400 with a non-string error", 400, { error: { code: 1 } }],
    ["400 with an empty error", 400, { error: "" }],
    ["400 with an unparseable body", 400, null],
    ["500 even when it has an error string", 500, { error: "Failed to save meal" }],
    ["401", 401, { error: "Unauthorized" }],
  ])("falls back to the generic message for %s", (_label, status, body) => {
    expect(saveErrorMessage(status, body)).toBe(GENERIC_SAVE_ERROR);
  });
});

describe("canSaveTemplate", () => {
  it("allows saving when both names are filled", () => {
    expect(canSaveTemplate("Morning Shake", "Protein Shake")).toBe(true);
  });

  it.each([
    ["empty template name", "", "Protein Shake"],
    ["whitespace template name", "   ", "Protein Shake"],
    ["empty meal name", "Morning Shake", ""],
    ["whitespace meal name", "Morning Shake", "  "],
  ])("blocks saving with %s", (_label, templateName, mealName) => {
    expect(canSaveTemplate(templateName, mealName)).toBe(false);
  });
});

// Simulates typing into the real <input type="number" value={draft}>, using only browser facts
// observed in Brave (Chromium) on Windows on 2026-10-02:
//  - a lone "-" is reported to onChange as "" (the field still shows "-")
//  - React only writes into the field when its reported text differs from the draft it is given
function typeInto(startText: string, keys: string, max = 1000) {
  let text = startText;
  let draft = startText;
  let stored = Number(startText) || 0;
  for (const key of keys) {
    text += key; // caret at the end
    const reported = text === "-" ? "" : text;
    ({ draft, value: stored } = macroInputChange(reported, draft, max));
    if (reported !== draft) text = draft;
  }
  return { shows: text, stored };
}

describe("typing into a macro field (real UI path)", () => {
  it('select-all then "-5" never stores 5 (was: shows "05", stores 5)', () => {
    expect(typeInto("", "-5")).toEqual({ shows: "0", stored: 0 });
  });

  it('typing "5" into a field holding 0 shows "5" (was: shows "05")', () => {
    expect(typeInto("0", "5")).toEqual({ shows: "5", stored: 5 });
  });

  it('typing "12.5" from empty shows and stores 12.5', () => {
    expect(typeInto("", "12.5")).toEqual({ shows: "12.5", stored: 12.5 });
  });
});

describe("macroInputChange", () => {
  it.each([
    ["05", "5", 5],
    ["007.5", "7.5", 7.5],
    ["0.5", "0.5", 0.5],
    ["0", "0", 0],
  ])("normalizes leading zeros: %j shows %j and stores %d", (raw, draft, value) => {
    expect(macroInputChange(raw, "0", 1000)).toEqual({ draft, value });
  });

  it("keeps a cleared field empty instead of rewriting it to 0", () => {
    expect(macroInputChange("", "5", 1000)).toEqual({ draft: "", value: 0 });
  });

  it("keeps a trailing decimal point while typing", () => {
    expect(macroInputChange("12.", "12", 1000)).toEqual({ draft: "12.", value: 12 });
  });

  it("turns a complete negative number into 0 — never into its positive value", () => {
    expect(macroInputChange("-5", "-", 1000)).toEqual({ draft: "0", value: 0 });
  });

  it("clamps values above the cap and shows the cap", () => {
    expect(macroInputChange("1500", "150", 1000)).toEqual({ draft: "1000", value: 1000 });
  });

  it("ignores characters that can't form a number, keeping the previous draft", () => {
    expect(macroInputChange("12e", "12", 1000)).toEqual({ draft: "12", value: 12 });
  });
});

describe("caloriesFromMacros", () => {
  it("uses 4 kcal/g protein, 4 kcal/g carbs and 9 kcal/g fat", () => {
    expect(caloriesFromMacros({ protein: 10, carbs: 20, fats: 5 })).toBe(165);
  });

  it("rounds to a whole number", () => {
    expect(caloriesFromMacros({ protein: 12.3, carbs: 0, fats: 0.1 })).toBe(50);
  });

  it("is 0 when all macros are 0", () => {
    expect(caloriesFromMacros({ protein: 0, carbs: 0, fats: 0 })).toBe(0);
  });

  it("caps at the server's calorie limit", () => {
    expect(caloriesFromMacros({ protein: 1000, carbs: 1000, fats: 1000 })).toBe(MAX_CALORIES);
  });
});

describe("applyCalorieAutoFill", () => {
  const meal = { foodName: "Shake", calories: 0, protein: 48, carbs: 6, fats: 3, confidence: "manual" };

  it("fills calories from macros in manual mode until calories are typed", () => {
    expect(applyCalorieAutoFill(meal, { manual: true, caloriesTouched: false }).calories).toBe(243);
  });

  it("leaves a typed calorie value alone", () => {
    const typed = { ...meal, calories: 250 };

    expect(applyCalorieAutoFill(typed, { manual: true, caloriesTouched: true }).calories).toBe(250);
  });

  it("leaves photo estimates alone", () => {
    const estimate = { ...meal, calories: 260 };

    expect(applyCalorieAutoFill(estimate, { manual: false, caloriesTouched: false }).calories).toBe(260);
  });

  it("changes nothing but calories", () => {
    const filled = applyCalorieAutoFill(meal, { manual: true, caloriesTouched: false });

    expect({ ...filled, calories: meal.calories }).toEqual(meal);
  });
});
