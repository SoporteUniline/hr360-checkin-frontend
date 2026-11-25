// Franja «requiere atención» de la bandeja de WhatsApp (wa2). Uso: node --test scripts/test-whatsapp-atencion.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { accionFranja, detalleAtencion, franjaAtencion, textoAccionFranja } from "../src/lib/whatsapp/atencion.mjs";

const ana = { id: 7, contacto: { id: 1, nombre: "Ana Ruiz", telefono: "5218111000001" }, motivo: "pidió hablar con una persona" };

test("sin nadie pendiente no hay franja", () => {
  assert.equal(franjaAtencion(null), null);
  assert.equal(franjaAtencion({ total: 0, primeros: [] }), null);
  assert.equal(accionFranja(null, "todos"), null);
});

test("uno o varios: título, detalle del más reciente y cuántos más", () => {
  assert.deepEqual(franjaAtencion({ total: 1, primeros: [ana] }), { total: 1, titulo: "1 candidato necesita atención", detalle: "Ana Ruiz pidió hablar con una persona", otros: 0, idPrimero: 7 });
  const dos = franjaAtencion({ total: 2, primeros: [ana, { id: 8, contacto: { nombre: "Luis" }, motivo: "aprobar agenda" }] });
  assert.equal(dos.titulo, "2 candidatos necesitan atención");
  assert.equal(dos.otros, 1);
});

test("motivos del agente en palabras cortas; desconocidos se recortan; sin nombre, el teléfono", () => {
  const d = (motivo, contacto = { nombre: "Ana Ruiz" }) => detalleAtencion({ contacto, motivo });
  assert.equal(d("aprobar agenda"), "Ana Ruiz espera que apruebes su entrevista");
  assert.equal(d("respuesta de filtro contradictoria"), "Ana Ruiz: revisa una respuesta de filtro");
  assert.equal(d("vacante alterna: Almacenista (vive cerca)"), "Ana Ruiz podría interesarle «Almacenista»");
  assert.equal(d("límite de respuestas del agente por hora"), "Ana Ruiz: el agente llegó a su límite");
  assert.equal(d("El agente de IA falló; requiere respuesta manual."), "Ana Ruiz: el agente no pudo contestar");
  assert.equal(d("pidió cancelar la cita"), "Ana Ruiz pidió cancelar su cita");
  assert.equal(d(null), "Ana Ruiz necesita que lo atiendas");
  const largo = d("x".repeat(120));
  assert.ok(largo.endsWith("…") && largo.length <= "Ana Ruiz: ".length + 70, largo);
  assert.match(d("pidió hablar con una persona", { telefono: "5218111000001" }), /^\+?52 ?1?.*pidió hablar con una persona$|pidió hablar con una persona$/);
});

test("«Ver»: uno → abre su chat; varios → filtra «Atención»; con el filtro ya puesto → abre el primero", () => {
  const uno = franjaAtencion({ total: 1, primeros: [ana] });
  const varios = franjaAtencion({ total: 3, primeros: [ana] });
  assert.deepEqual(accionFranja(uno, "todos"), { tipo: "abrir", id: 7 });
  assert.deepEqual(accionFranja(varios, "todos"), { tipo: "filtrar" });
  assert.deepEqual(accionFranja(varios, "atencion"), { tipo: "abrir", id: 7 });
  assert.equal(textoAccionFranja(uno, "todos"), "Abrir chat");
  assert.equal(textoAccionFranja(varios, "todos"), "Ver");
});
