import { test } from "node:test";
import assert from "node:assert/strict";
import { ordenarColumnasVisibles, ordenarRegistroColumnas } from "../src/lib/columnasTabla.mjs";
const registro = [{ key: "empleado" }, { key: "puesto" }, { key: "estado" }, { key: "campo:equipo", extra: true }];
test("intercala columnas personalizadas y estándar en el orden elegido", () => {
  assert.deepEqual(ordenarColumnasVisibles(registro, ["campo:equipo", "estado", "empleado"]), ["campo:equipo", "estado", "empleado"]);
});
test("ignora columnas retiradas y duplicadas sin alterar el orden guardado", () => {
  assert.deepEqual(ordenarColumnasVisibles(registro, ["estado", "retirada", "empleado", "estado"]), ["estado", "empleado"]);
});
test("el selector muestra primero el orden visible y luego las columnas ocultas", () => {
  assert.deepEqual(ordenarRegistroColumnas(registro, ["estado", "empleado"]).map(c => c.key), ["estado", "empleado", "puesto", "campo:equipo"]);
});
test("sin preferencia se conserva el orden del registro", () => {
  assert.deepEqual(ordenarColumnasVisibles(registro, null), registro.map(c => c.key));
});
