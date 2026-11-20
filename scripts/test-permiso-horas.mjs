import assert from "node:assert/strict";
import test from "node:test";
import { etiquetaPermisoHoras, horarioPermiso, movimientosCuenta } from "../src/lib/asistencia/permisoHoras.mjs";
import { cambiosAutorizar, cambiosQuitar, estadoHorasExtra, FORMA_REPOSICION, resumenHorasExtra } from "../src/lib/asistencia/horasExtra.mjs";

test("textos del permiso por horas en 12 h", () => {
  assert.equal(horarioPermiso({ tipo_horas: "llega_tarde", hora_fin: "11:00" }), "Llega tarde · hasta 11:00 a.m.");
  assert.equal(horarioPermiso({ tipo_horas: "sale_antes", hora_inicio: "15:00" }), "Sale antes · desde 3:00 p.m.");
  assert.equal(horarioPermiso({ tipo_horas: "sale_regresa", hora_inicio: "10:00", hora_fin: "12:30" }), "Sale y regresa · 10:00 a.m. a 12:30 p.m.");
  const p = { tipo_horas: "llega_tarde", hora_fin: "11:00", estado: "calculado" };
  assert.equal(etiquetaPermisoHoras({ ...p, tratamiento: "repone", minutos: 180 }).texto, "Permiso · por reponer 3 h");
  assert.equal(etiquetaPermisoHoras({ ...p, tratamiento: "rebaja", minutos: 90 }).texto, "Permiso · rebaja 1 h 30 min");
  assert.equal(etiquetaPermisoHoras({ ...p, tratamiento: "repone", minutos: 0 }).texto, "Permiso · cubierto");
  assert.match(etiquetaPermisoHoras({ ...p, estado: "sin_checadas" }).detalle, /aún sin checadas/);
  assert.equal(etiquetaPermisoHoras(null), null);
});

test("reposición: es autorizada con su forma, no cuenta como hora extra y se puede quitar", () => {
  const r = { fecha: "2026-11-20", hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00", hrs_comida: 1,
    entrada: "2026-11-20 08:00:00", salida: "2026-11-20 19:00:00" };
  const cambios = cambiosAutorizar({ forma: FORMA_REPOSICION, idAutorizador: 4 });
  assert.deepEqual(cambios, { hrs_extra: 1, forma_pago_extras: FORMA_REPOSICION, extras_autorizadas_por: 4 });
  const repuesta = { ...r, ...cambios };
  assert.equal(estadoHorasExtra(repuesta).estado, "reposicion");
  assert.equal(estadoHorasExtra({ ...r, hrs_extra: 1, forma_pago_extras: "Pago de horas extras" }).estado, "autorizada");
  assert.deepEqual(cambiosQuitar(repuesta), { hrs_extra: 0 });
  assert.deepEqual(resumenHorasExtra([repuesta]), { total: 1, pendientes: 0, autorizadas: 0, noAutorizadas: 0, reposiciones: 1 });
});

test("movimientos de la cuenta: cargos suman, reposiciones y cierres restan, del más reciente al más antiguo", () => {
  const m = movimientosCuenta({
    cargos: [{ id_solicitud: 1, fecha: "2026-11-17", tipo_horas: "llega_tarde", hora_fin: "11:00", minutos: 180, estado: "calculado" }],
    reposiciones: [{ id_asistencia: 2, fecha: "2026-11-18", minutos: 60 }],
    cierres: [{ id: 3, tipo: "condonacion", minutos: 30, nota: "Buen trabajo", creado_por_nombre: "Laura", creado_en: "2026-11-19 10:00:00" }],
  });
  assert.deepEqual(m.map((x) => [x.fecha, x.texto, x.minutos]), [
    ["2026-11-19", "Condonado", -30], ["2026-11-18", "Reposición", -60], ["2026-11-17", "Llega tarde · hasta 11:00 a.m.", 180],
  ]);
  assert.equal(m[0].nota, "Buen trabajo · por Laura");
});
