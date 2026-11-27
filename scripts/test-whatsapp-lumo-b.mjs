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

import {
  MAX_CAMPOS, MAX_PREGUNTAS, cambiarTipo, cambiarUso, etiquetaOrigenCampo, preguntaDesdeApi, preguntaNueva, validarPreguntas, valorCampo, vistaPreviaPregunta,
} from "../src/lib/whatsapp/entrevista.mjs";
import { espacioSugerencias, sugerenciaAPregunta } from "../src/lib/whatsapp/conocimiento.mjs";
import {
  camposAPreguntas, camposArchivo, mensajeFormulario, revisarEnvio, rutaArchivoCampo, textoEstadoFormulario, valoresIniciales,
} from "../src/lib/whatsapp/formularioEntrevista.mjs";

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

// ---------- B2 · campos de la entrevista y formulario por enlace ----------

test("B2 editor: filtra / solo informa, obligatoria, fecha y archivo solo como dato y cuerpo del PUT", () => {
  const fecha = preguntaNueva("fecha");
  assert.equal(fecha.uso, "dato", "fecha nace como dato");
  assert.equal(cambiarUso(fecha, "filtro"), fecha, "una fecha no puede filtrar");
  const sn = { ...preguntaNueva("si_no"), texto: "¿Licencia?" };
  sn.opciones = sn.opciones.map((o) => (o.texto === "No" ? { ...o, efecto: "descarta" } : o));
  const dato = cambiarUso(sn, "dato");
  assert.deepEqual(dato.opciones.map((o) => o.efecto), ["ok", "ok"], "un dato no descarta ni alerta");
  assert.equal(cambiarUso({ ...dato, obligatoria: false }, "filtro").obligatoria, true);
  assert.equal(cambiarTipo({ ...dato, obligatoria: false }, "numero").uso, "dato", "cambiar el tipo conserva el uso");
  const r = validarPreguntas([sn, { ...dato, texto: "¿Turno?", obligatoria: false }, { ...fecha, texto: "¿Desde cuándo?" }]);
  assert.equal(r.valido, true, JSON.stringify(r.errores));
  assert.deepEqual(r.cuerpo.preguntas.map((p) => [p.tipo, p.uso, p.obligatoria, p.descartan]), [["si_no", undefined, undefined, ["No"]], ["si_no", "dato", false, null], ["fecha", "dato", true, null]]);
  // Una fecha que llegara como filtro se marca; límites 8 que filtran / 20 en total.
  assert.match(validarPreguntas([{ ...fecha, texto: "x", uso: "filtro" }]).errores[0].tipo, /solo informan/);
  const filtro = (n) => Array.from({ length: n }, (_, i) => ({ ...preguntaNueva("texto"), texto: `F${i}` }));
  const datos = (n) => Array.from({ length: n }, (_, i) => ({ ...preguntaNueva("texto", "dato"), texto: `D${i}` }));
  assert.equal(validarPreguntas([...filtro(MAX_PREGUNTAS), ...datos(MAX_CAMPOS - MAX_PREGUNTAS)]).valido, true);
  assert.equal(validarPreguntas([...filtro(MAX_PREGUNTAS + 1), ...datos(1)]).general, "Máximo 8 preguntas que filtran por vacante.");
  assert.equal(validarPreguntas([...filtro(1), ...datos(MAX_CAMPOS)]).general, "Máximo 20 preguntas por vacante.");
  // Del API.
  const api = preguntaDesdeApi({ id: 7, texto: "Sube tu CV", tipo: "archivo", uso: "dato", obligatoria: false });
  assert.deepEqual([api.uso, api.obligatoria], ["dato", false]);
  assert.match(vistaPreviaPregunta(api), /se sube en el formulario · opcional · no califica/);
});

test("B2 «Generar entrevista con IA»: espacio y sugerencias como datos", () => {
  assert.equal(espacioSugerencias({ total: 3, filtros: 3 }), 5);
  assert.equal(espacioSugerencias({ total: 10, filtros: 2 }), 6);
  assert.equal(espacioSugerencias({ total: 19, filtros: 2 }), 1);
  assert.equal(espacioSugerencias({ total: 10, filtros: 8, modo: "entrevista" }), 10);
  assert.equal(espacioSugerencias({ total: 20, filtros: 8, modo: "entrevista" }), 0);
  const p = sugerenciaAPregunta({ texto: "¿Desde cuándo?", tipo: "fecha", uso: "dato", obligatoria: true, opciones: null, descartan: null, alertan: null });
  assert.deepEqual([p.tipo, p.uso, p.obligatoria, p.id], ["fecha", "dato", true, null]);
});

test("B2 ficha: valor, origen y descarga solo por la ruta con sesión", () => {
  assert.equal(valorCampo({ tipo: "fecha", valor: "2027-01-15" }), "15/01/2027");
  assert.equal(valorCampo({ tipo: "texto", valor: null }), "");
  assert.equal(etiquetaOrigenCampo("formulario"), "Lo llenó en el formulario");
  assert.equal(etiquetaOrigenCampo("boton"), "Tocó un botón");
  assert.equal(rutaArchivoCampo("/reclutamiento/whatsapp/conversaciones/12/archivos/34"), "/reclutamiento/whatsapp/conversaciones/12/archivos/34");
  for (const malo of ["https://s3.amazonaws.com/x.pdf", "/reclutamiento/whatsapp/conversaciones/12/archivos/../1", "//evil"]) assert.equal(rutaArchivoCampo(malo), null);
  assert.equal(textoEstadoFormulario({ vigente: true, expira_en: "2026-12-02 10:00:00", envios: 0 }), "Enlace vigente hasta el 02/12/2026 · aún no lo llena");
  assert.equal(textoEstadoFormulario({ vigente: false, expira_en: "2026-12-02 10:00:00", envios: 2 }), "El enlace venció el 02/12/2026 · lo llenó 2 veces");
});

test("B2 formulario público: mismos campos (sin archivo en preguntas), prellenado y revisión antes de mandar", () => {
  const campos = [
    { id: 1, texto: "¿Experiencia en almacén?", tipo: "si_no", obligatoria: true, valor: "Sí", opciones: ["Sí", "No"] },
    { id: 2, texto: "¿Desde qué fecha?", tipo: "fecha", obligatoria: true, valor: null },
    { id: 3, texto: "Turno", tipo: "opciones", opciones: ["Matutino", "Vespertino"], obligatoria: false, valor: "Vespertino" },
    { id: 4, texto: "Sube tu CV", tipo: "archivo", obligatoria: true, valor: null, archivo: null },
  ];
  assert.deepEqual(camposAPreguntas(campos).map((p) => [p.id, p.type, p.required]), [[1, "select", true], [2, "date", true], [3, "select", false]]);
  assert.deepEqual(camposArchivo(campos).map((c) => c.id), [4]);
  assert.deepEqual(valoresIniciales(campos), { 1: "Sí", 3: "Vespertino" });
  assert.deepEqual(revisarEnvio(campos, { 1: "Sí" }, {}), { faltan: [2, 4], errores: {} });
  const pdf = { type: "application/pdf", size: 1000, name: "cv.pdf" };
  assert.deepEqual(revisarEnvio(campos, { 1: "Sí", 2: "2027-01-10" }, { 4: pdf }), { faltan: [], errores: {} });
  assert.match(revisarEnvio(campos, { 2: "2027-01-10" }, { 4: { ...pdf, type: "text/html" } }).errores[4], /PDF/);
  assert.match(revisarEnvio(campos, { 2: "2027-01-10" }, { 4: { ...pdf, size: 11 * 1024 * 1024 } }).errores[4], /10 MB/);
  assert.deepEqual(revisarEnvio([{ ...campos[3], archivo: { nombre: "cv.pdf" } }], {}, {}).faltan, [], "ya lo había subido");
  assert.match(mensajeFormulario("FORMULARIO_VENCIDO").titulo, /venció/);
  assert.match(mensajeFormulario("FORMULARIO_INVALIDO").titulo, /no es válido/);
});

test("B2 el formulario reutiliza las preguntas de la página de la vacante y no se indexa", async () => {
  const pagina = await readFile(`${raiz}src/app/(public)/postular/[token]/page.jsx`, "utf8");
  assert.match(pagina, /robots: \{ index: false/);
  const form = await readFile(`${raiz}src/app/(public)/postular/[token]/FormularioEntrevista.jsx`, "utf8");
  // (27/11/2026) Mismas preguntas en grande que la solicitud corta de la bolsa v2.
  assert.match(form, /import PreguntasGrandes from "\.\.\/\.\.\/vacante\/\[slug\]\/PreguntasGrandes"/);
  assert.match(form, /credentials: "omit"/, "el formulario público no manda la sesión");
});
