import type { MaterialId } from "@/content/site";

export type CalculatorDeliveryMethod = "send" | "pickup" | "warehouse";

export type CalculatorDraft = {
  version: 2;
  savedAt: number;
  expiresAt: number;
  materialId: MaterialId;
  weightText: string;
  city: string;
  deliveryMethod: CalculatorDeliveryMethod;
};

type DraftValues = Pick<
  CalculatorDraft,
  "materialId" | "weightText" | "city" | "deliveryMethod"
>;

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const calculatorDraftKey = "metalduro:calculator-draft:v2";
export const calculatorDraftTtlMs = 60 * 60 * 1000;

const materialIds = new Set<MaterialId>(["inserts", "solid", "scrap", "mixed"]);
const deliveryMethods = new Set<CalculatorDeliveryMethod>([
  "send",
  "pickup",
  "warehouse",
]);

function isDraft(value: unknown, now: number): value is CalculatorDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<CalculatorDraft>;
  const weight = Number(draft.weightText);
  return (
    draft.version === 2 &&
    typeof draft.savedAt === "number" &&
    Number.isFinite(draft.savedAt) &&
    typeof draft.expiresAt === "number" &&
    Number.isFinite(draft.expiresAt) &&
    draft.expiresAt > now &&
    draft.expiresAt - draft.savedAt === calculatorDraftTtlMs &&
    materialIds.has(draft.materialId as MaterialId) &&
    typeof draft.weightText === "string" &&
    Number.isFinite(weight) &&
    weight >= 5 &&
    weight <= 100000 &&
    typeof draft.city === "string" &&
    draft.city.length <= 160 &&
    deliveryMethods.has(draft.deliveryMethod as CalculatorDeliveryMethod)
  );
}

export function readCalculatorDraft(
  storage: BrowserStorage,
  now = Date.now(),
): CalculatorDraft | null {
  try {
    const raw = storage.getItem(calculatorDraftKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isDraft(parsed, now)) return parsed;
    storage.removeItem(calculatorDraftKey);
  } catch {
    try {
      storage.removeItem(calculatorDraftKey);
    } catch {}
  }
  return null;
}

export function writeCalculatorDraft(
  storage: BrowserStorage,
  values: DraftValues,
  now = Date.now(),
) {
  const draft: CalculatorDraft = {
    version: 2,
    savedAt: now,
    expiresAt: now + calculatorDraftTtlMs,
    materialId: values.materialId,
    weightText: values.weightText,
    city: values.city.trim(),
    deliveryMethod: values.deliveryMethod,
  };
  try {
    storage.setItem(calculatorDraftKey, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearCalculatorDraft(storage: BrowserStorage) {
  try {
    storage.removeItem(calculatorDraftKey);
  } catch {}
}
