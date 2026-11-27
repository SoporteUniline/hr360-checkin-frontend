// Mosaico de módulos de la portada (src/components/landing/home/mosaico.mjs): cada tarjeta es un módulo real de la lista
// del sitio (src/lib/sitio/modulos.js) y del catálogo (src/lib/modulos/catalogo.mjs), su flecha lleva a una guía o página
// que existe, el ritmo «bento» llena filas completas y lo que no está en producción (Inducción digital) no aparece.
// Uso: node --test scripts/test-mosaico.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { GRUPOS, TARJETAS, TOTAL_TARJETAS, tarjetasDeGrupo } from "../src/components/landing/home/mosaico.mjs";
import { CATEGORIAS } from "../src/lib/sitio/modulos.js";
import { MODULOS } from "../src/lib/modulos/catalogo.mjs";

const raiz = new URL("../", import.meta.url);
const existe = (ruta) => existsSync(new URL(ruta, raiz));
const ANCHO = { g2: 2, g3: 3, g4: 4, g6: 6 };
const nombresSitio = new Set(CATEGORIAS.flatMap((c) => c.modulos.map((m) => m.nombre)));

// Una ruta pública existe si hay guía (src/content/ayuda/<carpeta>[/<guia>.md]) o página en src/app/(public).
function rutaExiste(href) {
  if (href === "/ayuda") return existe("src/app/(public)/ayuda/page.jsx");
  const guia = href.match(/^\/ayuda\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/);
  if (guia) return guia[2] ? existe(`src/content/ayuda/${guia[1]}/${guia[2]}.md`) : existe(`src/content/ayuda/${guia[1]}/`);
  return existe(`src/app/(public)${href}/page.jsx`);
}

test("24 tarjetas con id único, grupo conocido, ancho válido y su mini pantalla", () => {
  assert.equal(TOTAL_TARJETAS, 24);
  assert.equal(new Set(TARJETAS.map((c) => c.id)).size, TARJETAS.length, "ids únicos");
  const grupos = new Set(GRUPOS.map((g) => g.id));
  const minis = readFileSync(new URL("src/components/landing/home/MinisMosaico.jsx", raiz), "utf8");
  for (const c of TARJETAS) {
    assert.ok(grupos.has(c.grupo), `${c.id}: grupo ${c.grupo}`);
    assert.ok(ANCHO[c.ancho], `${c.id}: ancho ${c.ancho}`);
    if (c.estilo !== "ia") assert.match(minis, new RegExp(`(^|[\\s{,])"?${c.id}"?: `, "m"), `${c.id}: tiene mini pantalla en MINIS`);
  }
});

test("textos de cada tarjeta: submarca en minúsculas sin punto, beneficio corto y sin promesas fuera de producción", () => {
  for (const c of TARJETAS) {
    assert.match(c.sub, /^[a-záéíóúñ]+$/, `${c.id}: submarca «adamia ${c.sub}.»`);
    assert.ok(c.nombre.length <= 24, `${c.id}: título corto`);
    // Dos líneas: en las tarjetas angostas (g2) el beneficio cabe en ~90 caracteres a 16 px.
    const tope = c.ancho === "g2" ? 90 : 150;
    assert.ok(c.texto.length <= tope, `${c.id}: beneficio de ${c.texto.length} caracteres (máx. ${tope})`);
    assert.match(c.texto, /\.$/, `${c.id}: el beneficio termina en punto`);
    const todo = `${c.nombre} ${c.texto} ${c.etiqueta ?? ""}`.toLowerCase();
    for (const prohibido of ["inducción", "sin internet", "sin conexión", "diego", "luis"]) assert.ok(!todo.includes(prohibido), `${c.id}: no dice «${prohibido}»`);
  }
  // Vacaciones: la aprobación por WhatsApp aún va por el flujo externo anterior; la tarjeta solo promete «desde su celular».
  assert.ok(!/whatsapp/i.test(TARJETAS.find((c) => c.id === "vacaciones").texto));
});

test("cada tarjeta es un módulo de la lista del sitio (modulos.js) y la flecha lleva a algo que existe", () => {
  for (const c of TARJETAS) {
    assert.ok(c.modulos.length > 0, `${c.id}: nombra sus módulos`);
    for (const m of c.modulos) assert.ok(nombresSitio.has(m), `${c.id}: «${m}» está en src/lib/sitio/modulos.js`);
    assert.ok(rutaExiste(c.href), `${c.id}: ${c.href} existe`);
    assert.ok(c.aria && c.aria.length > 2, `${c.id}: nombre para «Conocer …» de la flecha`);
  }
});

test("todos los módulos del catálogo en producción tienen tarjeta; Inducción digital no", () => {
  const cubiertos = new Set(TARJETAS.flatMap((c) => c.catalogo));
  for (const m of MODULOS) {
    if (m.clave === "induccion") assert.ok(!cubiertos.has("induccion"), "Inducción digital no está en producción");
    else assert.ok(cubiertos.has(m.clave), `el módulo «${m.nombre}» (${m.clave}) tiene tarjeta`);
  }
  for (const clave of cubiertos) assert.ok(MODULOS.some((m) => m.clave === clave), `clave ${clave} del catálogo`);
});

test("ritmo bento: en cada grupo las filas de 6 columnas quedan completas y los anchos varían", () => {
  for (const g of GRUPOS) {
    const tarjetas = tarjetasDeGrupo(g.id);
    assert.ok(tarjetas.length > 0, `${g.id}: tiene tarjetas`);
    let fila = 0;
    for (const c of tarjetas) {
      fila += ANCHO[c.ancho];
      assert.ok(fila <= 6, `${g.id}: ${c.id} se sale de la fila`);
      if (fila === 6) fila = 0;
    }
    assert.equal(fila, 0, `${g.id}: la última fila queda completa`);
    assert.ok(new Set(tarjetas.map((c) => c.ancho)).size > 1, `${g.id}: no es una rejilla monótona`);
  }
  assert.equal(TARJETAS.filter((c) => c.estilo === "principal").length, 1, "una sola tarjeta con degradado");
});

test("celular: 8 tarjetas antes de «Ver todos» y al menos una por grupo", () => {
  const movil = TARJETAS.filter((c) => c.movil);
  assert.equal(movil.length, 8);
  for (const g of GRUPOS) assert.ok(movil.some((c) => c.grupo === g.id), `${g.id}: se ve algo en el celular`);
});

test("la lista del sitio incluye lo nuevo del mosaico y el total sale de ella", async () => {
  const { TOTAL_MODULOS } = await import("../src/lib/sitio/modulos.js");
  assert.equal(TOTAL_MODULOS, CATEGORIAS.reduce((t, c) => t + c.modulos.length, 0));
  for (const n of ["Préstamos y bonos", "API e integraciones", "Monitor en vivo", "Vacantes y bolsa de trabajo"]) assert.ok(nombresSitio.has(n), n);
  assert.ok(![...nombresSitio].some((n) => /inducci/i.test(n)), "sin Inducción digital");
});
