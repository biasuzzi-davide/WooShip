import { z } from "zod";

const EMPTY_TO_UNDEFINED = (value: unknown): unknown => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

function isValidDateLike(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeStoreUrl(url: string): string {
  const trimmed = url.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
}

const storeUrlSchema = z
  .string({ required_error: "storeUrl e obbligatorio" })
  .trim()
  .min(1, "storeUrl e obbligatorio")
  .transform(normalizeStoreUrl)
  .refine(isValidHttpUrl, {
    message: "storeUrl deve essere un URL http(s) valido",
  });

const nonEmptySecretSchema = z
  .string()
  .trim()
  .min(1, "Campo obbligatorio");

const optionalDateLikeString = z.preprocess(
  EMPTY_TO_UNDEFINED,
  z
    .string()
    .refine(isValidDateLike, {
      message: "Data non valida: usa un formato ISO valido",
    })
    .optional()
);

const perPageSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return 100;
    return value;
  },
  z.coerce.number().int().min(1).max(100)
);

const pageSchema = z.preprocess(
  EMPTY_TO_UNDEFINED,
  z.coerce.number().int().min(1).max(500).optional()
);

const optionalStringValue = z.preprocess(
  EMPTY_TO_UNDEFINED,
  z.string().trim().max(120).optional()
);

const pickupDateSchema = z.preprocess(
  EMPTY_TO_UNDEFINED,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "pickupDate deve essere in formato YYYY-MM-DD")
    .optional()
);

export const ordersQuerySchema = z
  .object({
    status: z.preprocess(EMPTY_TO_UNDEFINED, z.string().trim().max(40).optional()),
    after: optionalDateLikeString,
    before: optionalDateLikeString,
    per_page: perPageSchema,
    page: pageSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.after || !value.before) return;
    if (new Date(value.after) > new Date(value.before)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["after"],
        message: "after non puo essere successivo a before",
      });
    }
  });

export const wooCredentialsSchema = z.object({
  storeUrl: storeUrlSchema,
  consumerKey: nonEmptySecretSchema,
  consumerSecret: nonEmptySecretSchema,
});

const positiveIntSchema = z.number().int().positive();

export const csvOptionsSchema = z.object({
  defaultPackageType: z.enum(["Busta", "Pacco"]),
  pickupDate: pickupDateSchema,
  carrier: optionalStringValue,
  service: optionalStringValue,
  codType: z.enum(["A", "E", "D"]),
  includeCod: z.boolean().optional(),
});

export const ordersExportBodySchema = z.object({
  orderIds: z.array(positiveIntSchema).min(1, "Seleziona almeno un ordine"),
  fetchedOrderIds: z
    .array(positiveIntSchema)
    .min(1, "Sessione ordini non valida: ricarica prima la lista"),
  exportToken: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "exportToken non valido"),
  options: csvOptionsSchema,
});
