// «Respuestas de WhatsApp sin aplicar» (panel de Permisos): reglas de presentación (src/lib/aprobacion-whatsapp).
import assert from "node:assert/strict";
import test from "node:test";
import { confianza, confirmacion, consulta, fechaCorta, momento, mostrar, rangoFechas, sugerencia, titulo } from "../src/lib/aprobacion-whatsapp/presentacion.mjs";

const hoy = new Date("2026-12-10T12:00:00Z");

test("fechas cortas y rangos", () => {
  assert.equal(fechaCorta("2026-12-08", hoy), "8 dic");
  assert.equal(fechaCorta("2025-12-08", hoy), "8 dic 2025");
  assert.equal(fechaCorta("", hoy), "");
  assert.equal(rangoFechas("2026-12-08", "2026-12-08", hoy), "8 dic");
  assert.equal(rangoFechas("2026-12-08", null, hoy), "8 dic");
  assert.equal(rangoFechas("2026-12-08", "2026-12-09", hoy), "8 – 9 dic");
  assert.equal(rangoFechas("2026-11-30", "2026-12-02", hoy), "30 nov – 2 dic");
});

test("momento de la respuesta en hora de la empresa", () => {
  assert.match(momento("2026-12-08T16:15:00.000Z"), /^8 dic, 10:15\s?a/);
  assert.equal(momento("no es fecha"), "");
});

test("título, sugerencia, confianza y cuándo se muestra", () => {
  assert.equal(titulo(3), "Respuestas de WhatsApp sin aplicar (3)");
  assert.equal(titulo(undefined), "Respuestas de WhatsApp sin aplicar (0)");
  assert.equal(sugerencia("Aprobado"), "Parece que la aprobó");
  assert.equal(sugerencia("Rechazado"), "Parece que la rechazó");
  assert.equal(confianza("alta").etiqueta, "Confianza alta");
  assert.equal(confianza("rara").etiqueta, "Confianza baja");
  assert.equal(mostrar({ disponible: true, solicitudes: [{ id: 1 }] }), true);
  assert.equal(mostrar({ disponible: true, solicitudes: [] }), false);
  assert.equal(mostrar({ disponible: false, solicitudes: [{ id: 1 }] }), false, "sin número de notificaciones no se muestra");
  assert.equal(mostrar(undefined), false);
});

test("confirmación con la acción normal del panel", () => {
  const item = { empleado: "Beto Paz", tipo: "Permiso con goce", fecha_inicio: "2026-12-08", fecha_fin: "2026-12-09" };
  const c = confirmacion(item, "Aprobado");
  assert.equal(c.titulo, "¿Aplicar la aprobación?");
  assert.match(c.texto, /^Vas a aprobar el permiso «Permiso con goce» de Beto Paz \(8 – 9 dic\)/);
  assert.equal(c.boton, "Sí, aprobar");
  assert.match(confirmacion({ ...item, es_vacaciones: true }, "Rechazado").texto, /^Vas a rechazar las vacaciones de Beto Paz/);
});

test("consulta: unidad elegida o todas", () => {
  assert.equal(consulta("all"), "/checador/solicitudes-permiso/whatsapp/sin-aplicar?dias=30");
  assert.equal(consulta("10", 15), "/checador/solicitudes-permiso/whatsapp/sin-aplicar?dias=15&empresa=10");
});
