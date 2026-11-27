// Centro de ayuda · lee las guías de src/content/ayuda en el BUILD (páginas estáticas, /ayuda/indice.json, sitemap) y en
// la prueba de vigencia. Solo servidor (usa el disco). Formato de los archivos: docs/centro-de-ayuda.md.
//   src/content/ayuda/<carpeta>/<guia>.md   una guía (la carpeta es el módulo de la ayuda; index.md = portada opcional)
//   src/content/ayuda/_rutas/<slug>.md      una ruta de capacitación
// Un archivo que empieza con «_» (p. ej. _borrador.md) no se publica.
import fs from "node:fs";
import path from "node:path";
import { separarFrontmatter, validarDatos } from "./frontmatter.mjs";
import { parsearMarkdown, preguntasFrecuentes, recorrer, tablaDeContenido, tareas, textoPlano } from "./markdown.mjs";
import { RESERVADAS, datosCarpeta } from "./modulos.mjs";

export const CONTENIDO = "src/content/ayuda";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ───────── tamaño de las capturas (ancho y alto reales: la página no brinca al cargar) ─────────
/** Ancho y alto de un PNG, JPEG o WebP leyendo su cabecera, o null. */
export function medidasImagen(buf) {
  if (!buf || buf.length < 24) return null;
  if (buf.readUInt32BE(0) === 0x89504e47) return { ancho: buf.readUInt32BE(16), alto: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marca = buf[i + 1];
      const largo = buf.readUInt16BE(i + 2);
      if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) return { alto: buf.readUInt16BE(i + 5), ancho: buf.readUInt16BE(i + 7) };
      i += 2 + largo;
    }
    return null;
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const tipo = buf.toString("ascii", 12, 16);
    if (tipo === "VP8 ") return { ancho: buf.readUInt16LE(26) & 0x3fff, alto: buf.readUInt16LE(28) & 0x3fff };
    if (tipo === "VP8L") { const b = buf.readUInt32LE(21); return { ancho: (b & 0x3fff) + 1, alto: ((b >> 14) & 0x3fff) + 1 }; }
    if (tipo === "VP8X") return { ancho: 1 + buf.readUIntLE(24, 3), alto: 1 + buf.readUIntLE(27, 3) };
  }
  return null;
}

function completarImagenes(bloques, raiz, problema) {
  const visitar = (lista) => {
    for (const b of lista) {
      if (b.t === "aviso") visitar(b.bloques);
      if (b.t !== "imagen" || !b.src.startsWith("/")) continue;
      const archivo = path.join(raiz, "public", decodeURI(b.src.split(/[?#]/)[0]));
      if (!archivo.startsWith(path.join(raiz, "public") + path.sep) || !fs.existsSync(archivo)) { problema(`No existe la imagen ${b.src} (va en public${b.src}).`); continue; }
      const buf = fs.readFileSync(archivo);
      const m = medidasImagen(buf);
      if (m) Object.assign(b, m);
      b.bytes = buf.length;
    }
  };
  visitar(bloques);
}

const listar = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []);

function leerArchivo(raiz, relativo, tipo) {
  const texto = fs.readFileSync(path.join(raiz, relativo), "utf8");
  const problemas = [];
  const p = (nivel) => (mensaje, linea = null) => problemas.push({ archivo: relativo, linea, mensaje, nivel });
  const error = p("error");
  const aviso = p("aviso");
  const { datos, cuerpo, lineaCuerpo, errores } = separarFrontmatter(texto);
  errores.forEach((m) => error(m));
  const { meta, errores: e2, advertencias } = validarDatos(datos, tipo);
  e2.forEach((m) => error(m));
  advertencias.forEach((m) => aviso(m));
  const md = parsearMarkdown(cuerpo, { desplazamiento: lineaCuerpo });
  md.problemas.forEach((x) => error(x.mensaje, x.linea));
  completarImagenes(md.bloques, raiz, (m) => error(m));
  return { meta, bloques: md.bloques, problemas };
}

const porOrden = (a, b) => (a.orden ?? 100) - (b.orden ?? 100) || String(a.titulo).localeCompare(String(b.titulo), "es");

/** Todo el contenido de la ayuda. raiz = carpeta del repositorio (por omisión, donde corre el build). */
export function leerAyuda({ raiz = process.cwd() } = {}) {
  const base = path.join(raiz, CONTENIDO);
  const problemas = [];
  const guias = [];
  const modulos = [];
  const rutas = [];
  for (const d of listar(base)) {
    const rel = `${CONTENIDO}/${d.name}`;
    if (!d.isDirectory()) { if (!d.name.startsWith(".")) problemas.push({ archivo: rel, mensaje: "Archivo suelto: las guías van dentro de una carpeta de módulo.", nivel: "error" }); continue; }
    if (d.name === "_rutas") continue;
    if (d.name.startsWith("_")) continue;
    if (!SLUG.test(d.name) || RESERVADAS.includes(d.name)) { problemas.push({ archivo: rel, mensaje: `Nombre de carpeta no permitido: «${d.name}» (minúsculas y guiones; reservadas: ${RESERVADAS.join(", ")}).`, nivel: "error" }); continue; }
    let portada = null;
    const propias = [];
    for (const f of listar(path.join(base, d.name))) {
      const relF = `${rel}/${f.name}`;
      if (f.isDirectory() || !f.name.endsWith(".md")) { if (!f.name.startsWith(".")) problemas.push({ archivo: relF, mensaje: "Solo van archivos .md (las capturas van en public/ayuda/capturas/).", nivel: "error" }); continue; }
      if (f.name.startsWith("_")) continue;
      const nombre = f.name.slice(0, -3);
      if (nombre === "index") {
        const x = leerArchivo(raiz, relF, "portada");
        problemas.push(...x.problemas);
        portada = { ...x.meta, bloques: x.bloques };
        continue;
      }
      if (!SLUG.test(nombre)) { problemas.push({ archivo: relF, mensaje: `Nombre de archivo no permitido: «${f.name}» (minúsculas, números y guiones).`, nivel: "error" }); continue; }
      const x = leerArchivo(raiz, relF, "guia");
      problemas.push(...x.problemas);
      const slug = `${d.name}/${nombre}`;
      propias.push({
        ...x.meta, slug, carpeta: d.name, archivo: relF, url: `/ayuda/${slug}`, bloques: x.bloques,
        toc: tablaDeContenido(x.bloques), faq: preguntasFrecuentes(x.bloques), tareas: tareas(x.bloques), texto: textoPlano(x.bloques),
      });
    }
    propias.sort(porOrden);
    const datos = datosCarpeta(d.name, portada);
    if (!propias.length) continue;
    modulos.push({ ...datos, url: `/ayuda/${d.name}`, portada, guias: propias.map((g) => g.slug), audiencia: [...new Set(propias.flatMap((g) => g.audiencia ?? []))] });
    guias.push(...propias.map((g) => ({ ...g, ordenCarpeta: datos.orden, nombreCarpeta: datos.titulo })));
  }
  modulos.sort(porOrden);
  guias.sort((a, b) => a.ordenCarpeta - b.ordenCarpeta || porOrden(a, b));

  for (const f of listar(path.join(base, "_rutas"))) {
    const rel = `${CONTENIDO}/_rutas/${f.name}`;
    if (!f.name.endsWith(".md") || f.name.startsWith("_")) continue;
    const slug = f.name.slice(0, -3);
    if (!SLUG.test(slug)) { problemas.push({ archivo: rel, mensaje: `Nombre de ruta no permitido: «${f.name}».`, nivel: "error" }); continue; }
    const x = leerArchivo(raiz, rel, "ruta");
    problemas.push(...x.problemas);
    rutas.push({ ...x.meta, slug, archivo: rel, url: `/ayuda/rutas/${slug}`, bloques: x.bloques });
  }
  rutas.sort(porOrden);
  return { guias, modulos, rutas, problemas };
}

// El build pide el contenido en cada página: se lee una sola vez por proceso.
let cache = null;
export function cargarAyuda() {
  if (!cache || process.env.NODE_ENV === "development") cache = leerAyuda();
  return cache;
}

export const guiaPorSlug = (ayuda, slug) => ayuda.guias.find((g) => g.slug === slug) ?? null;
export const moduloPorSlug = (ayuda, slug) => ayuda.modulos.find((m) => m.slug === slug) ?? null;

/** Anterior y siguiente dentro del mismo módulo de la ayuda. */
export function vecinas(ayuda, slug) {
  const g = guiaPorSlug(ayuda, slug);
  if (!g) return { anterior: null, siguiente: null };
  const del = ayuda.guias.filter((x) => x.carpeta === g.carpeta);
  const i = del.findIndex((x) => x.slug === slug);
  return { anterior: del[i - 1] ?? null, siguiente: del[i + 1] ?? null };
}

/** Fecha más reciente del contenido (para «generado» del índice, sin depender de la hora del build). */
export const ultimaFecha = (ayuda) => ayuda.guias.map((g) => g.actualizado).filter(Boolean).sort().at(-1) ?? null;

/** /ayuda/indice.json: lo que necesitan el buscador, «Ayuda» dentro del sistema, el botón «?» y Adamia AI. */
export function indicePublico(ayuda) {
  return {
    version: 1,
    generado: ultimaFecha(ayuda),
    modulos: ayuda.modulos.map((m) => ({ slug: m.slug, titulo: m.titulo, resumen: m.resumen, url: m.url, orden: m.orden, icono: m.icono, audiencia: m.audiencia })),
    rutas: ayuda.rutas.map((r) => ({ slug: r.slug, titulo: r.titulo, resumen: r.resumen, audiencia: r.audiencia, guias: r.guias, url: r.url, orden: r.orden })),
    guias: ayuda.guias.map((g) => ({
      slug: g.slug, url: g.url, titulo: g.titulo, resumen: g.resumen, modulo: g.modulo, carpeta: g.carpeta, nombreCarpeta: g.nombreCarpeta,
      audiencia: g.audiencia, pantallas: g.pantallas, palabras: g.palabras, orden: g.orden, actualizado: g.actualizado,
      secciones: g.toc.flatMap((s) => [{ id: s.id, texto: s.texto }, ...s.sub]), texto: g.texto,
    })),
  };
}

/** /ayuda/<modulo>/<guia>/contenido.json: la guía lista para pintarse dentro del sistema (panel lateral). */
export const contenidoGuia = (g) => ({ slug: g.slug, url: g.url, titulo: g.titulo, resumen: g.resumen, audiencia: g.audiencia, actualizado: g.actualizado, nombreCarpeta: g.nombreCarpeta, bloques: g.bloques });

export { recorrer };
