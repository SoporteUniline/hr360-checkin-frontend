// «Las checadas tienen que pedir motivo» (decisión del dueño, 27/11/2026): src/lib/asistencia/motivoCorreccion.mjs (espejo
// de services/motivoCorreccion.js del backend), el historial con motivo y pantalla, y el reloj del día (quitar lo agregado
// a mano pide motivo; «Otro» con 5 letras).
import assert from "node:assert/strict";
import test from "node:test";
import {
  MOTIVO_MAX, MOTIVO_MIN, PANTALLAS, SUGERENCIAS, camposMotivo, errorMotivo, errorMotivoServidor, limpiarMotivo, motivoDelCambio,
} from "../src/lib/asistencia/motivoCorreccion.mjs";
import { etiquetaOrigen } from "../src/lib/asistencia/historial.mjs";
import { errorDe, errorMotivoOtro, nuevoRenglon } from "../src/lib/asistencia/relojDia.mjs";

test("motivo: obligatorio, recortado, de 5 a 500 letras (mismos mensajes que el servidor)", () => {
  assert.deepEqual([MOTIVO_MIN, MOTIVO_MAX], [5, 500]);
  for (const v of [undefined, null, "", "   "]) assert.equal(errorMotivo(v), "Escribe el motivo de la corrección.");
  assert.equal(errorMotivo(" casa "), "El motivo debe tener al menos 5 letras.");
  assert.equal(errorMotivo("x".repeat(501)), "El motivo no puede pasar de 500 letras.");
  assert.equal(errorMotivo("x".repeat(500)), "");
  assert.equal(errorMotivo("Olvidó checar"), "");
  assert.equal(limpiarMotivo("  Falla   del reloj "), "Falla del reloj");
  for (const s of SUGERENCIAS) assert.equal(errorMotivo(s), "", s);
});

test("cuerpo para el servidor: motivo_correccion limpio y la pantalla de origen", () => {
  assert.deepEqual(camposMotivo("  Olvidó  checar ", "incidencias"), { motivo_correccion: "Olvidó checar", pantalla: "incidencias" });
  assert.deepEqual(camposMotivo("Falla del reloj"), { motivo_correccion: "Falla del reloj" });
});

test("422 «falta el motivo» del servidor → mensaje para mostrar junto al campo; otros errores no", () => {
  const e = (status, data) => ({ response: { status, data } });
  assert.equal(errorMotivoServidor(e(422, { codigo: "FALTA_MOTIVO", error: "El motivo debe tener al menos 5 letras." })), "El motivo debe tener al menos 5 letras.");
  assert.equal(errorMotivoServidor(e(422, { campo: "motivo_correccion", message: "Escribe el motivo de la corrección." })), "Escribe el motivo de la corrección.");
  assert.equal(errorMotivoServidor(e(400, { codigo: "FALTA_MOTIVO", error: "x" })), "");
  assert.equal(errorMotivoServidor(e(422, { error: "Otra cosa" })), "");
  assert.equal(errorMotivoServidor(new Error("red")), "");
});

test("historial: motivo de su columna o del final de «después» (base sin la migración 20261230)", () => {
  assert.deepEqual(motivoDelCambio({ valor_despues: "2026-11-23 09:00:00", motivo: "Olvidó checar" }), { despues: "2026-11-23 09:00:00", motivo: "Olvidó checar" });
  assert.deepEqual(motivoDelCambio({ valor_despues: "2026-11-23 09:00:00 · Motivo: Olvidó checar" }), { despues: "2026-11-23 09:00:00", motivo: "Olvidó checar" });
  assert.deepEqual(motivoDelCambio({ valor_despues: "— · Motivo: Error de captura" }), { despues: null, motivo: "Error de captura" });
  assert.deepEqual(motivoDelCambio({ valor_despues: "09:18–13:00 jornada · Olvidó checar" }), { despues: "09:18–13:00 jornada · Olvidó checar", motivo: null });
  assert.deepEqual(motivoDelCambio(null), { despues: null, motivo: null });
});

test("historial: dice desde qué pantalla se corrigió; sin pantalla, el origen de siempre", () => {
  assert.equal(etiquetaOrigen("asistencia", "incidencias"), "Centro de incidencias");
  assert.equal(etiquetaOrigen("reloj", "entradas_salidas"), "Entradas y salidas");
  assert.equal(etiquetaOrigen("reloj", "reloj_dia"), "Reloj del día");
  assert.equal(etiquetaOrigen("asistencia", "registro_masivo"), "Registro masivo de incidencias");
  assert.equal(etiquetaOrigen("sistema"), "Sistema (automático)");
  assert.equal(etiquetaOrigen("reloj"), "Reloj checador");
  assert.equal(etiquetaOrigen("asistencia", "inventada"), "Edición");
  assert.deepEqual(Object.keys(PANTALLAS).sort(), ["acciones_masivas", "asistencias", "comida", "entradas_salidas", "estado_dia",
    "horas_extra", "incidencias", "registro_masivo", "reloj_dia"]);
});

test("reloj del día: quitar lo agregado a mano pide motivo; «Otro» pide 5 letras", () => {
  const manual = { ...nuevoRenglon(1020, 1080, "jornada", ""), k: "m", id: 9, nuevo: false, anulado: true, anuladoAntes: false };
  assert.equal(errorDe(manual, [manual]), "Para quitar un registro agregado a mano elige el motivo.");
  assert.equal(errorDe({ ...manual, motivo: "duplicada" }, [manual]), "");
  const reloj = { ...manual, origen: "reloj" };
  assert.equal(errorDe(reloj, [reloj]), "Para anular una checada del reloj elige el motivo.");
  assert.equal(errorMotivoOtro("otro: casa"), "Escribe el motivo (al menos 5 letras).");
  assert.equal(errorMotivoOtro("otro: junta"), "");
});
