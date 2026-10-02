export interface MealInput {
  food_items: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export type ParseResult = { ok: true; value: MealInput } | { ok: false; error: string };

const MAX_NAME_LENGTH = 200;
// Sanity caps to catch typos (e.g. 45000 kcal), not nutritional limits
export const MAX_CALORIES = 10000;
export const MAX_MACRO_GRAMS = 1000;

// Accepts finite numbers or numeric strings (form inputs). Rejects "", null and booleans,
// which Number() would otherwise silently turn into 0.
function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inRange(value: unknown, max: number): number | null {
  const n = toNumber(value);
  return n !== null && n >= 0 && n <= max ? n : null;
}

// Validates a meal from POST /api/meals (photo estimate, manual entry, or Quick Log template)
export function parseMealInput(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Invalid meal data" };
  }

  const { foodName, calories, protein, carbs, fats } = body as Record<string, unknown>;

  const name = typeof foodName === "string" ? foodName.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Meal name is required (max ${MAX_NAME_LENGTH} characters)` };
  }

  const cal = inRange(calories, MAX_CALORIES);
  const pro = inRange(protein, MAX_MACRO_GRAMS);
  const carb = inRange(carbs, MAX_MACRO_GRAMS);
  const fat = inRange(fats, MAX_MACRO_GRAMS);

  if (cal === null || pro === null || carb === null || fat === null) {
    return {
      ok: false,
      error: `Calories must be 0-${MAX_CALORIES} and protein, carbs and fats 0-${MAX_MACRO_GRAMS}g`,
    };
  }

  return { ok: true, value: { food_items: name, calories: cal, protein: pro, carbs: carb, fats: fat } };
}
