import { z } from "zod";
import type { Dict } from "@/content/dict";

export const calculatorApplicationSchema = z
  .object({
    materialId: z.string().trim().min(1).max(50),
    weightKg: z.number().finite().min(5).max(100000),
    city: z.string().trim().max(160),
    deliveryMethod: z.enum(["send", "pickup", "warehouse"]),
    phone: z.string().trim().min(6).max(32),
    repeatCustomer: z.boolean(),
    paymentRecipientName: z.string().trim().max(120),
    paymentIban: z.string().trim().max(64),
    preferredVisitDates: z
      .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .max(6),
    idempotencyKey: z.string().uuid(),
    previewRateEur: z.number().finite().positive(),
  })
  .superRefine((value, context) => {
    if (value.deliveryMethod !== "send") return;

    if (value.paymentRecipientName.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["paymentRecipientName"],
        message: "payment_recipient_required",
      });
    }
    const normalizedIban = value.paymentIban
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    if (!/^ES[0-9]{22}$/.test(normalizedIban)) {
      context.addIssue({
        code: "custom",
        path: ["paymentIban"],
        message: "invalid_iban",
      });
    }
  });

export type CalculatorApplicationInput = z.input<
  typeof calculatorApplicationSchema
>;

export type CalculatorApplicationResult =
  | { status: "success"; applicationId: string }
  | { status: "auth_required"; message: string }
  | {
      status: "price_changed";
      message: string;
      currentRateEur: number;
      currentEstimateEur: number;
    }
  | { status: "error"; message: string };

export type CreateApplicationRpcArgs = {
  p_material_id: string;
  p_declared_weight_kg: number;
  p_city: string | null;
  p_delivery_method: "send" | "pickup" | "warehouse";
  p_idempotency_key: string;
  p_contact_phone: string;
  p_repeat_customer: boolean;
  p_payment_recipient_name: string | null;
  p_payment_iban: string | null;
  p_preferred_visit_dates: string[];
  p_expected_rate_eur: number;
};

type ActiveMaterialRate = {
  rateEur: number | null;
  error: boolean;
};

type CreateApplicationResponse = {
  applicationId: string | null;
  errorMessage: string | null;
};

export type CalculatorApplicationDependencies = {
  configured: boolean;
  getAuthenticatedUser: () => Promise<{ profile: { role: string } } | null>;
  getActiveMaterialRate: (materialId: string) => Promise<ActiveMaterialRate>;
  createApplication: (
    args: CreateApplicationRpcArgs,
  ) => Promise<CreateApplicationResponse>;
};

export function buildCreateApplicationRpcArgs(
  input: z.output<typeof calculatorApplicationSchema>,
): CreateApplicationRpcArgs {
  const isSend = input.deliveryMethod === "send";

  return {
    p_material_id: input.materialId,
    p_declared_weight_kg: input.weightKg,
    p_city: input.city || null,
    p_delivery_method: input.deliveryMethod,
    p_idempotency_key: input.idempotencyKey,
    p_contact_phone: input.phone,
    p_repeat_customer: input.repeatCustomer,
    p_payment_recipient_name: isSend
      ? input.paymentRecipientName
      : null,
    p_payment_iban: isSend
      ? input.paymentIban.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
      : null,
    p_preferred_visit_dates: isSend ? [] : input.preferredVisitDates,
    p_expected_rate_eur: input.previewRateEur,
  };
}

function validationMessage(copy: Dict["calc"], path: PropertyKey | undefined) {
  return path === "phone"
    ? copy.errPhone
    : path === "paymentIban"
      ? copy.errIban
      : path === "paymentRecipientName"
        ? copy.errPayName
        : path === "weightKg"
          ? copy.errWeight
          : copy.errValidation;
}

function rpcErrorMessage(copy: Dict["calc"], errorMessage: string) {
  return errorMessage === "material_not_available"
    ? copy.errMaterial
    : errorMessage === "invalid_weight"
      ? copy.errWeight
      : errorMessage === "invalid_phone"
        ? copy.errPhone
        : errorMessage === "invalid_iban"
          ? copy.errIban
          : errorMessage === "invalid_payment_recipient"
            ? copy.errPayName
            : errorMessage === "idempotency_key_conflict"
              ? copy.errIntentChanged
              : copy.errCreate;
}

export async function processCalculatorApplication(
  input: CalculatorApplicationInput,
  copy: Dict["calc"],
  dependencies: CalculatorApplicationDependencies,
): Promise<CalculatorApplicationResult> {
  const parsed = calculatorApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(copy, parsed.error.issues[0]?.path[0]),
    };
  }
  if (!dependencies.configured) {
    return { status: "error", message: copy.errUnavailable };
  }

  try {
    const auth = await dependencies.getAuthenticatedUser();
    if (!auth) {
      return { status: "auth_required", message: copy.authRequired };
    }
    if (auth.profile.role !== "client") {
      return { status: "error", message: copy.errClientOnly };
    }

    const material = await dependencies.getActiveMaterialRate(
      parsed.data.materialId,
    );
    if (material.error) {
      return { status: "error", message: copy.errUnavailable };
    }
    if (material.rateEur === null) {
      return { status: "error", message: copy.errMaterial };
    }

    const currentEstimateEur =
      Math.round(parsed.data.weightKg * material.rateEur * 100) / 100;
    if (Math.abs(material.rateEur - parsed.data.previewRateEur) >= 0.005) {
      return {
        status: "price_changed",
        message: copy.priceChanged,
        currentRateEur: material.rateEur,
        currentEstimateEur,
      };
    }

    const created = await dependencies.createApplication(
      buildCreateApplicationRpcArgs(parsed.data),
    );
    if (created.errorMessage === "material_rate_changed") {
      const latest = await dependencies.getActiveMaterialRate(
        parsed.data.materialId,
      );
      if (!latest.error && latest.rateEur !== null) {
        return {
          status: "price_changed",
          message: copy.priceChanged,
          currentRateEur: latest.rateEur,
          currentEstimateEur:
            Math.round(parsed.data.weightKg * latest.rateEur * 100) / 100,
        };
      }
    }
    if (created.errorMessage) {
      return {
        status: "error",
        message: rpcErrorMessage(copy, created.errorMessage),
      };
    }
    if (!created.applicationId) {
      return { status: "error", message: copy.errCreate };
    }

    return { status: "success", applicationId: created.applicationId };
  } catch {
    return { status: "error", message: copy.errCreate };
  }
}
