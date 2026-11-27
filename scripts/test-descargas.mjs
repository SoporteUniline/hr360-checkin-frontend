// Brochure y tríptico para descargar (src/components/landing/descargas.mjs): cada PDF existe en public/, es un PDF, sus
// páginas y su peso son los que anuncia la tarjeta («PDF · 4 páginas · 2.5 MB»), la miniatura existe con las medidas
// declaradas, el nombre de descarga es legible y robots.js no bloquea /descargas/. Si alguien reemplaza un PDF sin
// actualizar descargas.mjs, esta prueba falla (regla de docs/pagina-inicio.md: mantener los PDF al día).
// Uso: node --test scripts/test-descargas.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { DESCARGAS, detalleDescarga, pesoLegible } from "../src/components/landing/descargas.mjs";

const raiz = new URL("../", import.meta.url);
const enPublic = (ruta) => new URL(`public${ruta}`, raiz);

// Páginas de un PDF sin dependencias: objetos «/Type /Page» (no «/Pages»). Los PDF de Chromium no comprimen el árbol.
const paginasPdf = (buf) => (buf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length;

// Medidas de un WebP (VP8 con pérdida, VP8L sin pérdida o VP8X extendido).
function medidasWebp(buf) {
  assert.equal(buf.toString("ascii", 0, 4), "RIFF");
  assert.equal(buf.toString("ascii", 8, 12), "WEBP");
  const tipo = buf.toString("ascii", 12, 16);
  if (tipo === "VP8 ") return { ancho: buf.readUInt16LE(26) & 0x3fff, alto: buf.readUInt16LE(28) & 0x3fff };
  if (tipo === "VP8L") { const b = buf.readUInt32LE(21); return { ancho: (b & 0x3fff) + 1, alto: ((b >> 14) & 0x3fff) + 1 }; }
  if (tipo === "VP8X") return { ancho: buf.readUIntLE(24, 3) + 1, alto: buf.readUIntLE(27, 3) + 1 };
  throw new Error(`WebP desconocido: ${tipo}`);
}

test("dos descargas: brochure comercial y tríptico, con id, ruta y nombre únicos", () => {
  assert.deepEqual(DESCARGAS.map((d) => d.id), ["brochure", "triptico"]);
  for (const campo of ["id", "archivo", "nombreDescarga", "portada"]) {
    const valores = DESCARGAS.map((d) => (campo === "portada" ? d.portada.src : d[campo]));
    assert.equal(new Set(valores).size, DESCARGAS.length, `${campo} único`);
  }
});

test("cada PDF existe, es PDF y tiene las páginas y el peso que anuncia la tarjeta", () => {
  for (const d of DESCARGAS) {
    assert.match(d.archivo, /^\/descargas\/adamia-[a-z-]+\.pdf$/, `${d.id}: ruta clara bajo /descargas`);
    const ruta = enPublic(d.archivo);
    assert.ok(existsSync(ruta), `${d.id}: falta public${d.archivo}`);
    const buf = readFileSync(ruta);
    assert.equal(buf.toString("ascii", 0, 5), "%PDF-", `${d.id}: no es un PDF`);
    assert.equal(statSync(ruta).size, d.bytes, `${d.id}: el peso cambió; actualiza bytes en descargas.mjs`);
    assert.equal(paginasPdf(buf), d.paginas, `${d.id}: el número de páginas cambió; actualiza descargas.mjs`);
    assert.ok(d.bytes < 5 * 1024 * 1024, `${d.id}: más de 5 MB es pesado para descargar con datos del celular`);
  }
  assert.equal(detalleDescarga(DESCARGAS[0]), "PDF · 4 páginas · 2.5 MB");
  assert.equal(detalleDescarga(DESCARGAS[1]), "PDF · 2 páginas · 2.1 MB");
  assert.equal(pesoLegible(1024 * 1024), "1.0 MB");
});

test("nombre de descarga legible y enlace que dice qué se descarga", () => {
  for (const d of DESCARGAS) {
    assert.match(d.nombreDescarga, /^ADAMIA - [\p{L} ]+\.pdf$/u, d.id);
    assert.match(`Descargar ${d.enlace} en PDF`, /^Descargar (el|la) [\p{L} ]+ en PDF$/u, d.id);
  }
});

test("miniatura de portada: existe, es WebP con las medidas declaradas y lleva alt descriptivo", () => {
  for (const d of DESCARGAS) {
    const ruta = enPublic(d.portada.src);
    assert.ok(existsSync(ruta), `${d.id}: falta public${d.portada.src}`);
    assert.deepEqual(medidasWebp(readFileSync(ruta)), { ancho: d.portada.ancho, alto: d.portada.alto }, `${d.id}: medidas`);
    assert.ok(statSync(ruta).size < 80 * 1024, `${d.id}: miniatura de más de 80 KB`);
    assert.ok(d.portada.alt.length >= 40 && /ADAMIA/.test(d.portada.alt), `${d.id}: alt descriptivo`);
  }
});

test("robots.js no bloquea /descargas/ en producción", () => {
  const robots = readFileSync(new URL("src/app/robots.js", raiz), "utf8");
  const disallow = robots.match(/disallow:\s*\[([^\]]*)\]/);
  assert.ok(disallow, "robots.js de producción con lista disallow");
  const rutas = [...disallow[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(rutas.length > 0);
  for (const r of rutas) assert.ok(!"/descargas/adamia-brochure-comercial.pdf".startsWith(r), `robots bloquea ${r}`);
});
