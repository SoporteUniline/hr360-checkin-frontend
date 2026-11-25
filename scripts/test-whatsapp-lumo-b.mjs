// Lumo fase B (25/11/2026): reglas puras de la pantalla.
//   B1 · ubicación de sucursales (lat/lng a mano, mensajes de Mapbox, sucursales de la vacante) y el aviso de privacidad
//        preparado (sin publicar).
//   B2 · campos de la entrevista y formulario por enlace (segunda parte del archivo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  enlaceMapa, idsParaGuardar, mensajeGeocodificar, resumenSucursalesVacante, textoOrigen, validarCoordenadas,
} from "../src/lib/whatsapp/sucursales.mjs";

const raiz = new URL("../", import.meta.url).pathname;

test("B1 lat/lng escritas a mano: válidas, coma decimal, vacías = quitar, fuera de rango y 0,0", () => {
  assert.deepEqual(validarCoordenadas(" 25.6866 ", "-100,3161"), { valido: true, cuerpo: { lat: 25.6866, lng: -100.3161 }, error: "" });
  assert.deepEqual(validarCoordenadas("25.12345678", "-100.1").cuerpo, { lat: 25.123457, lng: -100.1 });
  assert.deepEqual(validarCoordenadas("", " "), { valido: true, cuerpo: { lat: null, lng: null }, error: "" });
  assert.match(validarCoordenadas("25.6", "").error, /las dos/);
  assert.match(validarCoordenadas("91", "10").error, /-90 a 90/);
  assert.match(validarCoordenadas("10", "-181").error, /-180 a 180/);
  assert.match(validarCoordenadas("0", "0").error, /0, 0/);
  assert.equal(validarCoordenadas("abc", "1").valido, false);
});

test("B1 textos: mapa sin token, origen y errores de Mapbox", () => {
  assert.equal(enlaceMapa(25.6866, -100.3161), "https://www.google.com/maps/search/?api=1&query=25.6866,-100.3161");
  assert.equal(textoOrigen("mapbox"), "Ubicada con Mapbox");
  assert.equal(textoOrigen("manual"), "Escrita a mano");
  assert.equal(textoOrigen(null), "Sin ubicar");
  assert.match(mensajeGeocodificar("MAPBOX_NO_CONFIGURADO"), /Falta configurar Mapbox/);
  assert.match(mensajeGeocodificar("SIN_RESULTADO"), /No encontré/);
  assert.match(mensajeGeocodificar("MAPBOX_TOKEN_INVALIDO"), /no pudo ubicar/);
});

test("B1 sucursales de la vacante: resumen y qué se guarda ([] = todas)", () => {
  const sucursales = [{ id_unidad: 1, ubicada: true }, { id_unidad: 2, ubicada: false }, { id_unidad: 3, ubicada: true }];
  assert.deepEqual(resumenSucursalesVacante({ todas: true, sucursales }), { texto: "Todas las sucursales (3)", sinUbicar: 1, aviso: "1 sin ubicar: el agente no las puede proponer." });
  assert.equal(resumenSucursalesVacante({ todas: false, ids: [1], sucursales }).texto, "1 sucursal");
  assert.equal(resumenSucursalesVacante({ todas: false, ids: [1, 3], sucursales }).aviso, "");
  assert.deepEqual(idsParaGuardar({ todas: true, marcadas: [1, 2], total: 3 }), []);
  assert.deepEqual(idsParaGuardar({ todas: false, marcadas: [3, "1", 3], total: 3 }), [1, 3]);
  assert.deepEqual(idsParaGuardar({ todas: false, marcadas: [1, 2, 3], total: 3 }), []);
});

test("B1 el token de Mapbox nunca está en el navegador y el catálogo trae «Ubicar en mapa»", async () => {
  const componente = await readFile(`${raiz}src/components/whatsapp/UbicacionSucursal.jsx`, "utf8");
  const api = await readFile(`${raiz}src/components/whatsapp/api.js`, "utf8");
  for (const texto of [componente, api]) {
    assert.doesNotMatch(texto, /MAPBOX_TOKEN|api\.mapbox\.com|access_token/);
  }
  assert.match(componente, /Ubicar en mapa/);
  assert.match(componente, /Falta configurar Mapbox/);
  const dialogo = await readFile(`${raiz}src/app/panel/catalogos/unidades-de-negocio/SucursalFormDialog.jsx`, "utf8");
  assert.match(dialogo, /<UbicacionSucursal idUnidad=\{editSuc\.id_unidad\}/);
});

test("B1 aviso de privacidad: la propuesta con Mapbox existe con versión nueva y NO está publicada", async () => {
  const docs = await readFile(`${raiz}src/lib/legal/documentos.js`, "utf8");
  assert.match(docs, /export const AVISO_PRIVACIDAD_PROPUESTA = \{/);
  assert.match(docs, /version: "2026-12-18"/);
  assert.match(docs, /Mapbox\): recibe solo el texto de la colonia/);
  const pagina = await readFile(`${raiz}src/app/(public)/aviso-privacidad/page.jsx`, "utf8");
  assert.match(pagina, /doc=\{AVISO_PRIVACIDAD\}/);
  assert.doesNotMatch(pagina, /PROPUESTA/);
});
