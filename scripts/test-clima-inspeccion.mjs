// Pantallas nuevas de Clima (26/11/2026): NOM-035 lista para inspección, buzón, analítica, riesgo y ciclo de vida.
// Lógica pura de src/lib/clima/inspeccion.mjs. node --test scripts/test-clima-inspeccion.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as I from "../src/lib/clima/inspeccion.mjs";

test("evidencia: archivo obligatorio, 10 MB, PDF o imagen, obligación, descripción y fecha", () => {
  assert.deepEqual(Object.keys(I.erroresEvidencia({})).sort(), ["archivo", "descripcion", "fecha", "tipo"]);
  assert.equal(I.erroresEvidencia({ archivo: { size: 11 * 1024 * 1024, type: "application/pdf" }, tipo: "otro", descripcion: "abc", fecha: "2026-11-26" }).archivo, "El archivo no debe pasar de 10 MB.");
  assert.match(I.erroresEvidencia({ archivo: { size: 10, type: "text/html" }, tipo: "otro", descripcion: "abc", fecha: "2026-11-26" }).archivo, /PDF o una imagen/);
  assert.deepEqual(I.erroresEvidencia({ archivo: { size: 10, type: "image/png" }, tipo: "capacitacion", descripcion: "Plática", fecha: "2026-11-26" }), {});
  assert.equal(I.tamano(512), "512 B");
  assert.equal(I.tamano(2048), "2 KB");
  assert.equal(I.tamano(3.5 * 1024 * 1024), "3.5 MB");
});

test("difusión de resultados pide la aplicación; la de política no", () => {
  assert.deepEqual(I.erroresDifusion({ tipo: "resultados", medio: "reunion", fecha: "2026-11-26" }), { id_campania: "Elige la aplicación." });
  assert.deepEqual(I.erroresDifusion({ tipo: "politica", medio: "app", fecha: "2026-11-26" }), {});
  assert.equal(Object.keys(I.erroresDifusion({})).length, 3);
});

test("buzón: relato de 20 caracteres o más, liga para compartir y WhatsApp sin plantilla de Meta", () => {
  assert.deepEqual(Object.keys(I.erroresQueja({ tipo: "x", relato: "corto" })).sort(), ["relato", "tipo"]);
  assert.deepEqual(I.erroresQueja({ tipo: "violencia", relato: "Me gritan frente a los clientes." }), {});
  const url = I.urlBuzon("https://app.adamia.mx/", "/buzon/7.abc");
  assert.equal(url, "https://app.adamia.mx/buzon/7.abc");
  const t = I.textoCompartirBuzon("Tienda", url);
  assert.match(t, /sin dar tu nombre/);
  assert.ok(I.ligaWhatsapp(t).startsWith("https://wa.me/?text=Buz%C3%B3n%20confidencial"));
  assert.equal(I.ESTADOS_QUEJA.en_revision.texto, "En revisión");
});

test("mapa de calor: tono por % favorable (75 / 60) y texto alterno contra la empresa", () => {
  assert.equal(I.tonoCelda(80).tinta, "#166534");
  assert.equal(I.tonoCelda(60).tinta, "#854D0E");
  assert.equal(I.tonoCelda(59).tinta, "#991B1B");
  assert.equal(I.tonoCelda(null).tinta, "#64748B");
  assert.equal(I.textoCelda("Ventas", "Liderazgo", { favorable: 70, diferencia: -5 }), "Ventas, Liderazgo: 70 % favorable, 5 puntos abajo de la empresa");
  assert.equal(I.textoCelda("Ventas", "Liderazgo", { favorable: 70, diferencia: 0 }), "Ventas, Liderazgo: 70 % favorable, igual que la empresa");
  assert.equal(I.textoCelda("Ventas", "Liderazgo", { favorable: null }), "Ventas, Liderazgo: sin dato");
});

test("impulsores en palabras; niveles de riesgo y estados de la lista con su color", () => {
  assert.equal(I.textoImpulsor({ correlacion: 0.72 }), "Mueve mucho el compromiso");
  assert.equal(I.textoImpulsor({ correlacion: 0.45 }), "Mueve bastante el compromiso");
  assert.equal(I.textoImpulsor({ correlacion: -0.3 }), "Va en contra del compromiso (algo)");
  assert.equal(I.textoImpulsor({ correlacion: null }), "Sin datos suficientes");
  assert.deepEqual(Object.keys(I.NIVEL_RIESGO), ["alto", "medio", "bajo"]);
  assert.deepEqual(Object.keys(I.ESTADO_LISTA), ["cumple", "parcial", "falta", "no_aplica"]);
  assert.deepEqual(Object.keys(I.CICLOS), ["ingreso30", "ingreso90", "salida"]);
  assert.match(I.CICLOS.salida.cuando, /No detiene/);
  assert.match(I.hoyMx(), /^\d{4}-\d{2}-\d{2}$/);
});
