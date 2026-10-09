import { z } from "zod";
import { createHash } from "node:crypto";
export class ActivosError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}
export function ensure(value, message, status = 422) {
  if (!value) throw new ActivosError(message, status);
}
export const id = z
  .union([z.string(), z.number().int().positive().safe()])
  .transform(String)
  .pipe(z.string().regex(/^[1-9]\d{0,18}$/));
const optionalId = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  id.optional()
);
const text = (max = 1500) => z.string().trim().max(max);
const required = (max = 1500) => text(max).min(1);
const qty = z.coerce.number().int().min(1).max(1000000);
const nonnegative = z.coerce.number().int().min(0).max(1000000);
const date = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        Number.isFinite(Date.parse(v + "T12:00:00Z")) &&
        new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v),
    "Fecha no válida."
  )
  .optional();
const line = z.object({ productId: id, qty, locationId: optionalId });
const returns = z.object({
  deliveryId: id,
  lineId: id,
  qty,
  condition: z.enum(["good", "review", "lost"]),
  locationId: optionalId,
});
export const schemas = {
  "category.save": z.object({
    id: optionalId,
    type: z.enum(["asset", "uniform"]),
    name: required(100),
    description: text(500).default(""),
    active: z.boolean().default(true),
    version: nonnegative.optional(),
  }),
  "location.save": z.object({
    id: optionalId,
    name: required(150),
    description: text().optional(),
    branchId: optionalId,
    version: nonnegative.optional(),
  }),
  "product.save": z.object({
    id: optionalId,
    type: z.enum(["asset", "uniform"]),
    name: required(180),
    code: required(80),
    category: text(100).default(""),
    categoryId: optionalId,
    photo: z.string().max(700000).nullable().optional(),
    serial: text(120).optional(),
    variant: text(150).optional(),
    size: text(30).optional(),
    color: text(60).optional(),
    locationId: optionalId,
    stock: nonnegative.default(1),
    minimum: nonnegative.default(0),
    cost: z.coerce.number().min(0).max(9999999999.99).default(0),
    renewalMonths: z.coerce.number().int().min(0).max(65535).default(0),
    returnable: z.boolean(),
    version: nonnegative.optional(),
  }),
  "product.archive": z.object({ id }),
  "stock.move": z.object({
    id,
    operation: z.enum(["entrada", "ajuste", "traslado"]),
    qty,
    note: required(),
    locationId: id,
    destinationId: optionalId,
  }),
  "delivery.create": z.object({
    employeeId: id,
    mode: z.enum(["Asignación", "Préstamo"]),
    due: date,
    note: text().default(""),
    lines: z.array(line).min(1).max(100),
  }),
  "delivery.return": z.object({
    employeeId: id,
    note: text().default(""),
    lines: z.array(returns).min(1).max(100),
  }),
  "uniform.exchange": z.object({
    deliveryId: id,
    lineId: id,
    productId: id,
    qty,
    condition: z.enum(["good", "review"]),
    note: required(),
    locationId: optionalId,
    destinationId: optionalId,
  }),
  "delivery.cancel": z.object({ id, note: required() }),
  "delivery.ack": z.object({
    id,
    status: z.enum(["accepted", "difference"]),
    note: text().default(""),
  }),
  "maintenance.open": z.object({
    productId: id,
    qty,
    reason: required(),
    supplier: text(180).default(""),
    due: date,
    locationId: optionalId,
  }),
  "maintenance.close": z.object({
    id,
    outcome: z.enum(["repaired", "retired"]),
    cost: z.coerce.number().min(0).max(9999999999.99),
    note: required(),
  }),
  "employee.sizes": z.object({
    id,
    size: text(30).default(""),
    pantsSize: text(30).default(""),
    shoeSize: text(30).default(""),
    shoeSystem: text(20).default(""),
    notes: text().default(""),
  }),
  "kit.save": z.object({
    id: optionalId,
    name: required(160),
    roleId: optionalId,
    lines: z.array(line).min(1).max(100),
  }),
  "request.create": z.object({
    employeeId: id,
    kind: z.enum(["Falla de equipo", "Cambio de talla", "Reposición", "Otro"]),
    note: required(),
    lineId: optionalId,
  }),
  "request.resolve": z.object({ id, resolution: required() }),
};
export function validateCommand(command) {
  ensure(command && schemas[command.type], "Operación no permitida.", 400);
  const parsed = schemas[command.type].safeParse(command.payload);
  ensure(
    parsed.success,
    parsed.success
      ? ""
      : parsed.error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; "),
    422
  );
  return { type: command.type, payload: parsed.data };
}
function canonical(x) {
  if (Array.isArray(x)) return x.map(canonical);
  if (x && typeof x === "object")
    return Object.fromEntries(
      Object.keys(x)
        .sort()
        .map((k) => [k, canonical(x[k])])
    );
  return x;
}
export const commandHash = (command) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(command)))
    .digest("hex");
export const parseJson = (v) => (typeof v === "string" ? JSON.parse(v) : v);
export const day = (v) =>
  v ? (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10) : "";
