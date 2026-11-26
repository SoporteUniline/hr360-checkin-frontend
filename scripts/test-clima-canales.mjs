// Clima · canales, recordatorios, vista del jefe y «¿Cómo te fue hoy?» (lógica pura). node --test scripts/test-clima-canales.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../src/lib/clima/canales.mjs";

test("recordatorios: hasta 3, sin repetir, del más lejano al más cercano al cierre", () => {
  assert.deepEqual(C.alternarRecordatorio([], 1), [1]);
  assert.deepEqual(C.alternarRecordatorio([1], 5), [5, 1]);
  assert.deepEqual(C.alternarRecordatorio([5, 1, 0], 3), [5, 1, 0], "no pasa de 3");
  assert.deepEqual(C.alternarRecordatorio([5, 1, 0], 1), [5, 0], "quitar");
  assert.equal(C.textoDiasAntes(0), "El día que cierra");
  assert.equal(C.textoDiasAntes(3), "3 días antes del cierre");
  assert.equal(C.textoCortoDias(1), "1 día antes");
  assert.equal(C.textoCortoDias(0), "El día del cierre");
  assert.deepEqual(C.fechasRecordatorios("2027-03-01", "2027-03-10", [5, 0]).map((x) => x.fecha), ["2027-03-05", "2027-03-10"]);
  assert.deepEqual(C.recordatoriosFuera("2027-03-01", "2027-03-05", [7, 4, 1]), [7, 4], "caen el día que abre o antes");
});

test("estado del canal WhatsApp en la pantalla de lanzar", () => {
  assert.equal(C.estadoWhatsapp({ migracion: false }).disponible, false);
  assert.equal(C.estadoWhatsapp({ migracion: true, whatsapp: { configurado: false } }).respaldo, true);
  assert.equal(C.estadoWhatsapp({ migracion: true, whatsapp: { configurado: true } }).respaldo, false);
});

test("«¿Cómo te fue hoy?»: solo con la jornada cerrada (todas las filas con salida)", () => {
  assert.equal(C.salidaRegistrada([{ entrada: "09:00", salida: "-" }]), false);
  assert.equal(C.salidaRegistrada([{ hora_salida: "2027-03-01T18:00:00" }]), true);
  assert.equal(C.salidaRegistrada([{ salida: "14:00" }, { entrada: "15:00", salida: "—" }]), false, "volvió y sigue abierta");
  assert.equal(C.salidaRegistrada([{ salida: "-", salida_corregida: "18:00" }]), true);
  assert.equal(C.salidaRegistrada([]), false);
  assert.equal(C.salidaRegistrada(null), false);
  assert.equal(C.llavePulso(4, "2027-03-01"), "clima-pulso:4:2027-03-01");
});

test("vista del jefe: rutas, aviso de equipo chico y diferencia contra la empresa", () => {
  assert.equal(C.rutaEquipo("/empleado/panel/encuestas", 7), "/empleado/panel/encuestas/equipo/7");
  assert.deepEqual(C.vistaDeRuta(["equipo", "7"]), { vista: "equipo", id: 7 });
  assert.deepEqual(C.vistaDeRuta(["12"]), { vista: "encuesta", id: 12 });
  assert.deepEqual(C.vistaDeRuta([]), { vista: "lista", id: null });
  assert.deepEqual(C.vistaDeRuta(["equipo", "x"]), { vista: "lista", id: null });
  assert.ok(C.avisoEquipoChico(2));
  assert.equal(C.avisoEquipoChico(8), null);
  const filas = C.contraEmpresa(
    { dimensiones: [{ clave: "a", nombre: "A", favorabilidad: { favorable: 80 } }, { clave: "b", nombre: "B", favorabilidad: null }] },
    { dimensiones: [{ clave: "a", favorabilidad: { favorable: 70 } }] }
  );
  assert.equal(filas[0].dif, 10);
  assert.equal(filas[1].dif, null);
  assert.equal(C.textoDif(10), "+10 vs. empresa");
  assert.equal(C.textoDif(-3), "−3 vs. empresa");
  assert.equal(C.textoDif(null), "—");
});
