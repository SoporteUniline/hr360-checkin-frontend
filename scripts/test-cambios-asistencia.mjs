import assert from "node:assert/strict";
import test from "node:test";
import { cambiosRegistro, estadoEdicion, leerOriginales, resumenCambios } from "../src/lib/asistencia/cambios.mjs";

const base = {
  id: 1, correccion: 1, entrada: "2026-11-18 08:00:00", salida: "2026-11-18 17:00:00",
  id_tipo_permiso: 14, asistencia: 1, notas: "Olvidó checar",
};

test("muestra solo los campos que cambiaron, en orden legible", () => {
  const r = { ...base, valores_originales: { salida: "2026-11-18T13:19:53", id_tipo_permiso: 2, asistencia: 0, entrada: "2026-11-18 08:00:00", notas: null } };
  const c = cambiosRegistro(r);
  assert.deepEqual(c.map((x) => x.campo), ["salida", "id_tipo_permiso", "asistencia", "notas"]);
  assert.equal(c[0].etiqueta, "Salida");
  assert.equal(c[0].antes, "2026-11-18T13:19:53");
  assert.equal(c[0].despues, "2026-11-18 17:00:00");
});

test("misma hora con otro formato o mismo número como texto no cuenta como cambio", () => {
  const r = { ...base, valores_originales: { entrada: "2026-11-18T08:00:00.000", id_tipo_permiso: "14", asistencia: true } };
  assert.deepEqual(cambiosRegistro(r), []);
});

test("acepta valores_originales como texto JSON (así llega de MySQL)", () => {
  const r = { ...base, valores_originales: JSON.stringify({ salida: null }) };
  assert.deepEqual(leerOriginales(r), { salida: null });
  assert.equal(cambiosRegistro(r)[0].campo, "salida");
  assert.equal(leerOriginales({ valores_originales: "{roto" }), null);
});

test("ignora identificadores, sellos y la propia marca de corrección", () => {
  const r = { ...base, valores_originales: { id: 9, updated_at: "x", correccion: 0, tipo_registro_nombre: "Falta" } };
  assert.deepEqual(cambiosRegistro(r), []);
});

test("estado de edición para la columna Editado", () => {
  assert.deepEqual(estadoEdicion({ ...base, correccion: 0 }), { editado: false, conDetalle: false, totalCambios: 0 });
  assert.deepEqual(estadoEdicion({ ...base, valores_originales: null }), { editado: true, conDetalle: false, totalCambios: 0 });
  assert.deepEqual(estadoEdicion({ ...base, valores_originales: { salida: null } }), { editado: true, conDetalle: true, totalCambios: 1 });
});

test("resumen para Excel usa el formateador y la flecha antes → después", () => {
  const r = { ...base, valores_originales: { salida: null, asistencia: 0 } };
  const fmt = (campo, v) => (v == null ? "—" : campo === "asistencia" ? (Number(v) ? "Sí" : "No") : String(v).slice(11, 16));
  assert.equal(resumenCambios(r, fmt), "Salida: — → 17:00; Asistió: No → Sí");
});
