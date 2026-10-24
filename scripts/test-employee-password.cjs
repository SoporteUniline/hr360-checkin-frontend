const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { z } = require("zod");

// The schema contains plain JS; load it without a JSX build step.
const source = fs.readFileSync(require.resolve("../src/schemas/schemaEmpleado.jsx"), "utf8")
  .replace('import { z } from "zod";', "")
  .replace("export const schemaEmpleado", "globalThis.schemaEmpleado");
const context = vm.createContext({ z });
vm.runInContext(source, context);
const validEmployee = {
  nombre: "Prueba", apellido_paterno: "Prueba", apellido_materno: "Prueba",
  puesto: "Prueba", correo: "prueba@example.test", sucursal: "1", id_empresa: 1,
  hrs_por_dia: 8, hrs_de_comida: 1,
  horarios: Array.from({ length: 7 }, (_, i) => ({ dia: String(i), entrada: "09:00", salida: "18:00" })),
  periodo_pago: "Semanal", forma_pago: "Transferencia", forma_calculo: "$", sueldo: 100,
};
const parse = (passwords) => context.schemaEmpleado.safeParse({ ...validEmployee, ...passwords });
assert.equal(parse({}).success, true);
assert.equal(parse({ new_pass: "", confirm_pass: "" }).success, true);
assert.equal(parse({ new_pass: "Prueba 123!", confirm_pass: "Prueba 123!" }).success, true);
for (const passwords of [
  { new_pass: "Prueba 123!" },
  { new_pass: "Prueba 123!", confirm_pass: "Otra" },
  { new_pass: "", confirm_pass: "Prueba 123!" },
  { new_pass: "Prueba 123!", confirm_pass: "Prueba 123! " },
]) {
  const result = parse(passwords);
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "confirm_pass"));
}
console.log("PASS: optional unchanged password, matching confirmation, missing confirmation, mismatch and exact spaces");
