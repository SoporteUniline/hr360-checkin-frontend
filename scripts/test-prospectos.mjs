// Prospectos (docs/prospectos.md del backend): correo opcional, casilla de noticias aparte, cuerpo del envío,
// teléfono de /contacto, panel (fechas, origen, filtros) y página /baja. Puras, sin navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  NOTICIAS, MENSAJES_CORREO, correoValido, estadoCorreo, celularDeTextoLibre, cuerpoProspecto, fechaCorta, textoOrigen,
  valorOrigen, celularLegible, consultaProspectos, tokenBajaValido, resultadoBaja,
} from "../src/lib/prospectos/reglas.mjs";
import { datosContactoValidos, mensajeContacto } from "../src/lib/popups/reglas.mjs";

test("correo opcional: vacío deja enviar; mal escrito no; con la casilla de noticias es obligatorio", () => {
  assert.deepEqual(estadoCorreo({ correo: "" }), { valido: true, error: null });
  assert.deepEqual(estadoCorreo({ correo: "   ", noticias: true }), { valido: false, error: "falta" });
  assert.deepEqual(estadoCorreo({ correo: "ana@", noticias: false }), { valido: false, error: "formato" });
  assert.deepEqual(estadoCorreo({ correo: " Ana@Empresa.MX ", noticias: true }), { valido: true, error: null });
  for (const malo of ["ana", "ana@empresa", "ana @empresa.mx", "@empresa.mx", "ana@empresa.m"]) assert.equal(correoValido(malo), false, malo);
  for (const bueno of ["ana@empresa.mx", "ana.lopez+rh@sub.empresa.com.mx"]) assert.equal(correoValido(bueno), true, bueno);
  assert.match(MENSAJES_CORREO.falta, /escribe tu correo/);
  assert.match(MENSAJES_CORREO.formato, /déjalo vacío/);
});

test("el botón del pop-up: el correo solo detiene si está mal o si pidió noticias sin él", () => {
  const ok = { nombre: "Ana López", iso: "MX", celular: "5512345678", acepta: true };
  assert.equal(datosContactoValidos(ok), true, "sin correo ni casilla: igual que antes");
  assert.equal(datosContactoValidos({ ...ok, noticias: true }), false, "casilla sin correo");
  assert.equal(datosContactoValidos({ ...ok, noticias: true, correo: "ana@empresa.mx" }), true);
  assert.equal(datosContactoValidos({ ...ok, correo: "ana@empresa" }), false, "correo mal escrito");
  assert.equal(datosContactoValidos({ ...ok, correo: "ana@empresa.mx", acepta: false }), false, "el aviso sigue siendo obligatorio");
});

test("WhatsApp de ventas lleva el correo solo si es válido", () => {
  const base = { nombre: "Ana", iso: "MX", celular: "5512345678", titulo: "X" };
  assert.match(mensajeContacto({ ...base, correo: " ANA@Empresa.mx " }), /Celular: \+52 5512345678 \(México\)\nCorreo: ana@empresa\.mx\nPromoción: X/);
  assert.doesNotMatch(mensajeContacto({ ...base, correo: "ana@" }), /Correo/);
  assert.doesNotMatch(mensajeContacto(base), /Correo/);
});

test("cuerpo del prospecto: correo limpio, noticias solo con correo válido y con la versión del texto", () => {
  const origen = { tipo: "popup", id: 7, titulo: "Buen Fin" };
  assert.deepEqual(cuerpoProspecto({ nombre: " Ana ", celular: "+525512345678", correo: " ANA@b.MX ", origen, noticias: true, avisoVersion: "2026-11-25" }), {
    nombre: "Ana", celular: "+525512345678", correo: "ana@b.mx", origen, aviso_version: "2026-11-25", acepta_noticias: true, noticias_version: NOTICIAS.version,
  });
  const sin = cuerpoProspecto({ nombre: "Ana", celular: "+525512345678", correo: "", origen, noticias: true, avisoVersion: "2026-11-25" });
  assert.deepEqual([sin.correo, sin.acepta_noticias, "noticias_version" in sin], [null, false, false], "sin correo no se manda permiso");
  assert.equal(cuerpoProspecto({ nombre: "Ana", celular: null, correo: "a@b.mx", origen, noticias: false }).acepta_noticias, false);
  assert.match(NOTICIAS.version, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(NOTICIAS.texto, "Quiero recibir noticias sobre reformas laborales, novedades de ADAMIA y consejos de RH", "texto aprobado por el dueño");
});

test("teléfono escrito a mano en /contacto → internacional", () => {
  assert.equal(celularDeTextoLibre("+52 317 128 8029"), "+523171288029");
  assert.equal(celularDeTextoLibre("33 1234 5678"), "+523312345678", "10 dígitos = México");
  assert.equal(celularDeTextoLibre("523312345678"), "+523312345678");
  assert.equal(celularDeTextoLibre("+1 (212) 555-0199"), "+12125550199");
  assert.equal(celularDeTextoLibre("0034 612 345 678"), "+34612345678");
  assert.equal(celularDeTextoLibre("12345"), null);
  assert.equal(celularDeTextoLibre(""), null);
});

test("panel: fecha corta, origen legible, celular legible y la consulta de filtros", () => {
  assert.equal(fechaCorta("2026-11-27 09:05:00"), "27 nov 2026, 09:05");
  assert.equal(fechaCorta(null), "—");
  assert.equal(textoOrigen({ origen_tipo: "contacto" }), "Página de contacto");
  assert.equal(textoOrigen({ origen_tipo: "popup", origen_id: 7, origen_titulo: "Buen Fin" }), "Pop-up: Buen Fin");
  assert.equal(textoOrigen({ origen_tipo: "popup", origen_id: 7 }), "Pop-up: #7");
  assert.equal(valorOrigen({ origen_tipo: "popup", origen_id: 7 }), "popup:7");
  assert.equal(valorOrigen({ origen_tipo: "contacto", origen_id: null }), "contacto");
  assert.equal(celularLegible("+525512345678"), "+52 55 1234 5678");
  assert.equal(celularLegible("+12125550199"), "+12125550199");
  assert.equal(celularLegible(null), "—");
  assert.equal(consultaProspectos({}), "");
  assert.equal(consultaProspectos({ buscar: " ana ", noticias: "1", origen: "popup:7", pagina: 2 }), "?buscar=ana&noticias=1&origen=popup%3A7&pagina=2");
  assert.equal(consultaProspectos({ noticias: "x" }), "");
  // CSV: sin «todos» el servidor manda solo quienes aceptan; con «todos», todos (la página no se manda).
  assert.equal(consultaProspectos({ pagina: 3 }, { csv: true }), "");
  assert.equal(consultaProspectos({ todos: true, pagina: 3 }, { csv: true }), "?todos=1");
});

test("/baja: token de 43 caracteres y mensajes amables para cada respuesta", () => {
  assert.equal(tokenBajaValido("A".repeat(43)), true);
  assert.equal(tokenBajaValido("A".repeat(42)), false);
  assert.equal(tokenBajaValido("<script>".padEnd(43, "a")), false);
  assert.equal(resultadoBaja(200, { ok: true, ya_estaba: false }).tipo, "listo");
  assert.equal(resultadoBaja(200, { ok: true, ya_estaba: true }).tipo, "ya");
  assert.equal(resultadoBaja(404, {}).tipo, "invalido");
  assert.equal(resultadoBaja(400, {}).tipo, "invalido");
  assert.equal(resultadoBaja(503, {}).tipo, "error");
  assert.equal(resultadoBaja(0).tipo, "error");
});

test("el pop-up ya no promete timbrado: tarjeta de vacaciones y frase con contratos", () => {
  const collage = readFileSync(new URL("../src/components/landing/popups/PopupCollage.jsx", import.meta.url), "utf8");
  const tarjeta = readFileSync(new URL("../src/components/landing/popups/PopupTarjeta.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(collage.replace(/\{\/\*[\s\S]*?\*\/\}/g, ""), /Timbrad|CFDI|Recibo de nómina/);
  assert.match(collage, /<b>Vacaciones aprobadas<\/b><i>Desde el celular<\/i>/);
  assert.match(tarjeta, /const FRASE = "Checador, contratos y firma en una sola app";/);
});

test("el guardado del prospecto no detiene WhatsApp: se abre primero y el envío no se espera (keepalive)", () => {
  const tarjeta = readFileSync(new URL("../src/components/landing/popups/PopupTarjeta.jsx", import.meta.url), "utf8");
  const guardar = readFileSync(new URL("../src/lib/prospectos/guardar.js", import.meta.url), "utf8");
  const enviar = tarjeta.slice(tarjeta.indexOf("const enviar = "), tarjeta.indexOf("const cupon = "));
  assert.ok(enviar.indexOf("window.open(") < enviar.indexOf("guardarProspecto("), "WhatsApp antes que el guardado");
  assert.doesNotMatch(enviar, /await /, "nada se espera dentro del clic");
  assert.match(guardar, /keepalive: true/);
  const contacto = readFileSync(new URL("../src/app/(public)/contacto/page.jsx", import.meta.url), "utf8");
  assert.ok(contacto.indexOf("window.open(") < contacto.indexOf("guardarProspecto("), "/contacto: WhatsApp antes que el guardado");
  assert.match(contacto, /origen: \{ tipo: "contacto" \}/);
});
