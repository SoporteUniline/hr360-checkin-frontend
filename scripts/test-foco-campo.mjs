// Pruebas de src/lib/formulario/focoCampo.mjs (INC-012, 28/11/2026): el foco al campo con error no se le quita a quien
// ya está escribiendo en otro campo. La regresión en navegador está en scripts/verify-permiso-acta-pagina.mjs (acta) y
// scripts/verify-contratos.mjs (contrato).
// Uso: node --test scripts/test-foco-campo.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { prepararFocoCampo } from "../src/lib/formulario/focoCampo.mjs";

// Documento mínimo: elementos con focus() que cambian activeElement.
function documentoDePrueba(ids) {
  const doc = { body: { id: "body" }, activeElement: null, elementos: {} };
  doc.activeElement = doc.body;
  for (const id of ids) doc.elementos[id] = { id, focus() { doc.activeElement = this; } };
  doc.getElementById = (id) => doc.elementos[id] ?? null;
  return doc;
}
// «esperar» que guarda la función para correrla cuando la prueba diga (como el reloj del navegador).
function esperaManual() {
  const pendientes = [];
  return { esperar: (fn) => pendientes.push(fn), correr: () => pendientes.splice(0).forEach((fn) => fn()) };
}

test("si el foco sigue en el botón oprimido, va al campo con error", () => {
  const doc = documentoDePrueba(["continuar", "acta-fecha"]);
  doc.elementos.continuar.focus();
  const reloj = esperaManual();
  prepararFocoCampo({ documento: doc, esperar: reloj.esperar })("acta-fecha");
  assert.equal(doc.activeElement.id, "continuar", "no se mueve antes de pintar");
  reloj.correr();
  assert.equal(doc.activeElement.id, "acta-fecha");
});

test("RED de INC-012: si la persona ya está en otro campo, NO se le quita el foco", () => {
  const doc = documentoDePrueba(["continuar", "acta-fecha", "acta-testigos"]);
  doc.elementos.continuar.focus();
  const reloj = esperaManual();
  const enfocar = prepararFocoCampo({ documento: doc, esperar: reloj.esperar });
  enfocar("acta-fecha");
  doc.elementos["acta-testigos"].focus(); // empezó a escribir en Testigos antes de que llegara el foco
  reloj.correr();
  assert.equal(doc.activeElement.id, "acta-testigos");
});

test("el origen se toma al PREPARAR (antes del await), no al enfocar", () => {
  const doc = documentoDePrueba(["continuar", "acta-fecha", "acta-lugar"]);
  doc.elementos.continuar.focus();
  const reloj = esperaManual();
  const enfocar = prepararFocoCampo({ documento: doc, esperar: reloj.esperar });
  doc.elementos["acta-lugar"].focus(); // se movió mientras se validaba
  enfocar("acta-fecha");
  reloj.correr();
  assert.equal(doc.activeElement.id, "acta-lugar");
});

test("si el botón desapareció (foco en body) o el celular no enfoca botones, sí lleva al campo", () => {
  const doc = documentoDePrueba(["acta-fecha"]);
  const reloj = esperaManual();
  prepararFocoCampo({ documento: doc, esperar: reloj.esperar })("acta-fecha");
  reloj.correr();
  assert.equal(doc.activeElement.id, "acta-fecha");
});

test("con desplazar: primero baja a la sección y luego enfoca sin brincar; si la persona se movió, nada", () => {
  const doc = documentoDePrueba(["guardar", "ct-id_empleado", "ct-notas"]);
  const opciones = [];
  doc.elementos["ct-id_empleado"].focus = function (o) { opciones.push(o); doc.activeElement = this; };
  doc.elementos.guardar.focus();
  const reloj = esperaManual();
  const desplazados = [];
  prepararFocoCampo({ documento: doc, esperar: reloj.esperar })("ct-id_empleado", { desplazar: (el) => desplazados.push(el.id) });
  reloj.correr();
  assert.deepEqual(desplazados, ["ct-id_empleado"]);
  assert.deepEqual(opciones, [{ preventScroll: true }]);
  assert.equal(doc.activeElement.id, "ct-id_empleado");

  // La persona ya está escribiendo en «Causa u obra»: ni se le mueve la pantalla ni el foco.
  doc.elementos.guardar.focus();
  const enfocar = prepararFocoCampo({ documento: doc, esperar: reloj.esperar });
  enfocar("ct-id_empleado", { desplazar: (el) => desplazados.push(el.id) });
  doc.elementos["ct-notas"].focus();
  reloj.correr();
  assert.deepEqual(desplazados, ["ct-id_empleado"], "no se desplazó otra vez");
  assert.equal(doc.activeElement.id, "ct-notas");
});

test("sin documento, sin id o con un id que no existe no truena", () => {
  assert.doesNotThrow(() => prepararFocoCampo({ documento: null })("x"));
  const doc = documentoDePrueba([]);
  const reloj = esperaManual();
  const enfocar = prepararFocoCampo({ documento: doc, esperar: reloj.esperar });
  enfocar(null);
  enfocar("no-existe");
  assert.doesNotThrow(() => reloj.correr());
  assert.equal(doc.activeElement, doc.body);
});

// INC-012 (segunda causa): cada paso de PasosGuiados se monta como árbol nuevo (key={actual}); sin la llave React reusaba
// los <input> de un paso en el siguiente y, al regresar, se veía el dato de otro campo. La prueba de comportamiento es la
// de «paso 2 igual tras ir al 3 y regresar» en scripts/verify-permiso-acta-pagina.mjs; esta solo cuida que no se quite.
test("PasosGuiados monta el contenido de cada paso con su propia llave", async () => {
  const { readFileSync } = await import("node:fs");
  const fuente = readFileSync(new URL("../src/components/formulario/PasosGuiados.jsx", import.meta.url), "utf8");
  assert.match(fuente, /<div key=\{actual\}[^>]*>\{children\}<\/div>/);
});
