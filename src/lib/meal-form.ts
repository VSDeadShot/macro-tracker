import { MAX_CALORIES } from "./meal-input";

export const GENERIC_SAVE_ERROR = "Failed to save meal to the database. Please try again.";

// Turns a number-input value into a macro the server will accept: cleared, non-numeric or
// non-finite input becomes 0, and the result is clamped to 0..max (see MAX_* in meal-input.ts).
export function clampMacroInput(raw: string, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(max, Math.max(0, n));
}

// Only a 400 carries a user-facing validation message from POST /api/meals;
// anything else (401, 500, unparseable body) gets the generic message.
export function saveErrorMessage(status: number, body: unknown): string {
  if (status === 400 && typeof body === "object" && body !== null) {
    const { error } = body as { error?: unknown };
    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }
  return GENERIC_SAVE_ERROR;
}

// A template stores both names (template name + food_items), and POST /api/templates rejects either blank
export function canSaveTemplate(templateName: string, mealName: string): boolean {
  return templateName.trim() !== "" && mealName.trim() !== "";
}

// Digits with an optional leading minus and one decimal point, any part possibly still empty ("", "-", "12.")
const PARTIAL_NUMBER = /^-?\d*\.?\d*$/;

// Number inputs show `draft` while focused. Keeping the draft as a string stops React from
// rewriting a cleared/partial field to "0" (which erased a typed "-") and from keeping "05"
// because it loosely equals 5. The draft always matches the stored value once it is a complete number.
export function macroInputChange(raw: string, prevDraft: string, max: number): { draft: string; value: number } {
  if (!PARTIAL_NUMBER.test(raw)) {
    return { draft: prevDraft, value: clampMacroInput(prevDraft, max) };
  }

  const draft = raw.replace(/^(-?)0+(?=\d)/, "$1");
  const n = Number(draft);

  if (draft === "" || !Number.isFinite(n)) {
    return { draft, value: 0 };
  }
  if (n < 0 || Object.is(n, -0)) {
    // Negative macros aren't allowed: store 0 (never the positive value) and show it
    return { draft: "0", value: 0 };
  }
  if (n > max) {
    return { draft: String(max), value: max };
  }
  return { draft, value: n };
}

// Atwater factors: 4 kcal/g protein and carbs, 9 kcal/g fat
export function caloriesFromMacros(macros: { protein: number; carbs: number; fats: number }): number {
  return Math.min(MAX_CALORIES, Math.round(4 * macros.protein + 4 * macros.carbs + 9 * macros.fats));
}

// Manual entry only: keep calories in sync with the macros until the user types a calorie value.
// Photo estimates keep Gemini's calories.
export function applyCalorieAutoFill<T extends { calories: number; protein: number; carbs: number; fats: number }>(
  meal: T,
  mode: { manual: boolean; caloriesTouched: boolean },
): T {
  if (!mode.manual || mode.caloriesTouched) {
    return meal;
  }
  return { ...meal, calories: caloriesFromMacros(meal) };
}
