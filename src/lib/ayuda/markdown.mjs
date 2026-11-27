// Centro de ayuda · intérprete del SUBCONJUNTO de Markdown de las guías (contrato: docs/centro-de-ayuda.md).
// Convierte el texto en una lista de bloques (datos simples, serializables a JSON) que Markdown.jsx pinta como
// elementos de React. Nunca produce HTML: un «<b>» en una guía se muestra como texto y se reporta como problema.
// Lo que no está en el subconjunto no rompe la página: se pinta como texto y queda en `problemas` (test-ayuda.mjs falla).
// Sin red ni React: probado en scripts/test-ayuda.mjs.
//
// Bloques: { t: "h2" | "h3", texto, id, hijos } · { t: "p", hijos } · { t: "lista", ordenada, inicio, items: [{ hijos, sub? }] }
//          { t: "imagen", alt, src, titulo } · { t: "aviso", tipo: "consejo" | "importante" | "ojo", bloques }
//          { t: "tabla", encabezado: [celda] | null, filas: [[celda]] }   (celda = hijos en línea)
// En línea: { t: "texto", v } · { t: "negrita" | "cursiva", hijos } · { t: "codigo", v } · { t: "enlace", href, hijos }
import { slugTexto } from "./texto.mjs";

export const AVISOS = Object.freeze({ consejo: "Consejo", importante: "Importante", ojo: "Ojo" });
const RE_AVISO = /^\*\*(Consejo|Importante|Ojo):\*\*\s*/i;
const RE_IMAGEN = /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)\s*$/;
const RE_LISTA = /^( *)(?:([-*])|(\d{1,3})[.)])\s+(.*)$/;
const RE_TITULO = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_HTML = /<\/?[a-z][\w-]*(\s[^>]*)?>|<!--/i;

/** ¿Enlace permitido? Internos que empiezan con «/» o «#» y externos https. */
export function enlaceValido(href) {
  const h = String(href ?? "").trim();
  if (/^\/(?!\/)/.test(h) || /^#[\w-]+$/.test(h)) return true;
  try { return new URL(h).protocol === "https:"; } catch { return false; }
}

// ───────── en línea ─────────
/** Texto en línea → nodos. problema(mensaje) recibe lo que no está en el subconjunto. */
export function parsearEnLinea(texto, problema = () => {}, { sinEnlaces = false } = {}) {
  const s = String(texto ?? "");
  const nodos = [];
  let buf = "";
  const soltar = () => { if (buf) { nodos.push({ t: "texto", v: buf }); buf = ""; } };
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (c === "\\" && /[\\`*_[\]()#!|>-]/.test(s[i + 1] ?? "")) { buf += s[i + 1]; i += 2; continue; }
    if (c === "`") {
      const fin = s.indexOf("`", i + 1);
      if (fin > i + 1) { soltar(); nodos.push({ t: "codigo", v: s.slice(i + 1, fin) }); i = fin + 1; continue; }
    }
    if (c === "*" && s[i + 1] === "*") {
      const fin = s.indexOf("**", i + 2);
      if (fin > i + 2) { soltar(); nodos.push({ t: "negrita", hijos: parsearEnLinea(s.slice(i + 2, fin), problema, { sinEnlaces }) }); i = fin + 2; continue; }
    }
    if (c === "*" && s[i + 1] !== "*" && s[i + 1] !== " ") {
      let fin = i + 1;
      while ((fin = s.indexOf("*", fin)) !== -1 && s[fin + 1] === "*") fin += 2;
      if (fin > i + 1) { soltar(); nodos.push({ t: "cursiva", hijos: parsearEnLinea(s.slice(i + 1, fin), problema, { sinEnlaces }) }); i = fin + 1; continue; }
    }
    if (c === "!" && s[i + 1] === "[") problema("Imagen dentro de un párrafo: ponla sola en su propia línea.");
    if (c === "[") {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(s.slice(i));
      if (m) {
        if (sinEnlaces) problema("Enlace dentro de otro enlace.");
        else if (!enlaceValido(m[2])) problema(`Enlace no permitido: ${m[2]} (usa una ruta interna «/…» o https://).`);
        else { soltar(); nodos.push({ t: "enlace", href: m[2], hijos: parsearEnLinea(m[1], problema, { sinEnlaces: true }) }); i += m[0].length; continue; }
      }
    }
    buf += c;
    i += 1;
  }
  soltar();
  if (RE_HTML.test(s)) problema("HTML no permitido: se muestra como texto.");
  return nodos;
}

/** Texto plano de nodos en línea (para el índice, la tabla de contenido y JSON-LD). */
export function textoDeNodos(nodos = []) {
  return nodos.map((n) => (n.t === "texto" || n.t === "codigo" ? n.v : textoDeNodos(n.hijos))).join("");
}

// ───────── bloques ─────────
const celdas = (linea) => {
  const t = linea.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  return t.split(/(?<!\\)\|/).map((x) => x.trim().replace(/\\\|/g, "|"));
};
const esSeparadorTabla = (linea) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(linea.trim());

/**
 * cuerpo → { bloques, problemas: [{ linea, mensaje }] }.
 * opciones.dentroDeAviso: dentro de un aviso solo van párrafos y listas.
 * opciones.desplazamiento: número de línea donde empieza el cuerpo en el archivo (para los mensajes).
 */
export function parsearMarkdown(cuerpo, { dentroDeAviso = false, desplazamiento = 0, ids = new Map() } = {}) {
  const lineas = String(cuerpo ?? "").replace(/\r\n?/g, "\n").split("\n");
  const bloques = [];
  const problemas = [];
  let parrafo = null;
  const problema = (n, mensaje) => problemas.push({ linea: n + 1 + desplazamiento, mensaje });
  const cerrarParrafo = () => {
    if (!parrafo) return;
    const n = parrafo.linea;
    bloques.push({ t: "p", hijos: parsearEnLinea(parrafo.texto.join(" "), (m) => problema(n, m)) });
    parrafo = null;
  };
  const idUnico = (texto) => {
    const base = slugTexto(texto);
    const n = (ids.get(base) ?? 0) + 1;
    ids.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea.trim()) { cerrarParrafo(); continue; }

    // Bloques de código: no están en el subconjunto. Se muestran como párrafo para no perder el texto.
    if (/^\s*(```|~~~)/.test(linea)) {
      cerrarParrafo();
      problema(i, "Bloque de código no permitido.");
      const texto = [];
      for (i += 1; i < lineas.length && !/^\s*(```|~~~)/.test(lineas[i]); i++) texto.push(lineas[i]);
      if (texto.length) bloques.push({ t: "p", hijos: [{ t: "texto", v: texto.join(" ") }] });
      continue;
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(linea)) {
      cerrarParrafo();
      problema(i, "Línea horizontal no permitida.");
      continue;
    }

    const titulo = RE_TITULO.exec(linea);
    if (titulo) {
      cerrarParrafo();
      let nivel = titulo[1].length;
      if (dentroDeAviso) { problema(i, "Encabezado dentro de un aviso."); nivel = 0; }
      else if (nivel === 1) { problema(i, "No uses «#»: el título de la guía va en el frontmatter (usa «##»)."); nivel = 2; }
      else if (nivel > 3) { problema(i, "Solo se permiten «##» y «###»."); nivel = 3; }
      const hijos = parsearEnLinea(titulo[2], (m) => problema(i, m));
      if (nivel === 0) { bloques.push({ t: "p", hijos }); continue; }
      const texto = textoDeNodos(hijos).trim();
      bloques.push({ t: `h${nivel}`, texto, id: idUnico(texto), hijos });
      continue;
    }

    const imagen = RE_IMAGEN.exec(linea.trim());
    if (imagen) {
      cerrarParrafo();
      if (dentroDeAviso) problema(i, "Imagen dentro de un aviso: ponla fuera del bloque «>».");
      const src = imagen[2];
      if (!/^\/(?!\/)/.test(src) && !/^https:\/\//.test(src)) problema(i, `Imagen con ruta no permitida: ${src}`);
      if (!imagen[1].trim()) problema(i, "Imagen sin descripción para lector de pantalla.");
      bloques.push({ t: "imagen", alt: imagen[1].trim(), src, titulo: imagen[3]?.trim() || null });
      continue;
    }

    if (/^\s*>/.test(linea)) {
      cerrarParrafo();
      const inicio = i;
      const dentro = [];
      for (; i < lineas.length && /^\s*>/.test(lineas[i]); i++) dentro.push(lineas[i].replace(/^\s*>\s?/, ""));
      i -= 1;
      if (dentroDeAviso) problema(inicio, "Aviso dentro de otro aviso.");
      const m = RE_AVISO.exec(dentro[0] ?? "");
      if (!m) problema(inicio, "Cita sin tipo: empieza el bloque con «> **Consejo:**», «> **Importante:**» u «> **Ojo:**».");
      const tipo = m ? m[1].toLowerCase() : "consejo";
      if (m) dentro[0] = dentro[0].slice(m[0].length);
      const sub = parsearMarkdown(dentro.join("\n"), { dentroDeAviso: true, desplazamiento: desplazamiento + inicio, ids });
      problemas.push(...sub.problemas);
      bloques.push({ t: "aviso", tipo, bloques: sub.bloques });
      continue;
    }

    if (/^\s*\|/.test(linea)) {
      cerrarParrafo();
      const filas = [];
      const inicio = i;
      for (; i < lineas.length && /^\s*\|/.test(lineas[i]); i++) filas.push(lineas[i]);
      i -= 1;
      if (dentroDeAviso) problema(inicio, "Tabla dentro de un aviso.");
      const conEncabezado = filas.length > 1 && esSeparadorTabla(filas[1]);
      const aCeldas = (l, n) => celdas(l).map((c) => parsearEnLinea(c, (msg) => problema(n, msg)));
      const encabezado = conEncabezado ? aCeldas(filas[0], inicio) : null;
      const cuerpoTabla = filas.map((l, k) => ({ l, k })).filter(({ k }) => !conEncabezado || k > 1).map(({ l, k }) => aCeldas(l, inicio + k));
      const ancho = encabezado?.length ?? cuerpoTabla[0]?.length ?? 0;
      if (cuerpoTabla.some((f) => f.length !== ancho)) problema(inicio, "Tabla con filas de distinto número de columnas.");
      bloques.push({ t: "tabla", encabezado, filas: cuerpoTabla });
      continue;
    }

    const item = RE_LISTA.exec(linea);
    if (item && !(parrafo && item[1].length > 0)) {
      cerrarParrafo();
      const ordenada = Boolean(item[3]);
      const lista = { t: "lista", ordenada, inicio: ordenada ? Number(item[3]) : 1, items: [] };
      const sangriaBase = item[1].length;
      let actual = null;
      let sub = null;
      for (; i < lineas.length; i++) {
        const l = lineas[i];
        if (!l.trim()) {
          // Una línea vacía termina la lista salvo que siga otro elemento de la misma lista.
          const sig = RE_LISTA.exec(lineas[i + 1] ?? "");
          if (sig && Boolean(sig[3]) === ordenada && sig[1].length === sangriaBase) continue;
          if (sig && actual && sig[1].length > sangriaBase) continue;
          break;
        }
        const m = RE_LISTA.exec(l);
        if (m && m[1].length <= sangriaBase + 1) {
          if (Boolean(m[3]) !== ordenada) break; // otra lista empieza
          actual = { hijos: parsearEnLinea(m[4], (msg) => problema(i, msg)) };
          sub = null;
          lista.items.push(actual);
          continue;
        }
        if (m && actual) {
          if (m[1].length - sangriaBase >= 6) problema(i, "Solo se permite un nivel de lista anidada.");
          if (!sub) { sub = { ordenada: Boolean(m[3]), inicio: m[3] ? Number(m[3]) : 1, items: [] }; actual.sub = sub; }
          sub.items.push({ hijos: parsearEnLinea(m[4], (msg) => problema(i, msg)) });
          continue;
        }
        if (/^\s{2,}\S/.test(l) && actual && !/^\s*(>|\||!\[|#)/.test(l)) {
          // Continuación del elemento anterior (texto con sangría).
          const destino = sub ? sub.items.at(-1) : actual;
          destino.hijos.push({ t: "texto", v: " " }, ...parsearEnLinea(l.trim(), (msg) => problema(i, msg)));
          continue;
        }
        break;
      }
      i -= 1;
      bloques.push(lista);
      continue;
    }

    if (parrafo) parrafo.texto.push(linea.trim());
    else parrafo = { linea: i, texto: [linea.trim()] };
  }
  cerrarParrafo();
  return { bloques, problemas };
}

// ───────── lecturas sobre los bloques ─────────
/** Texto plano de un bloque. */
export function textoDeBloque(b) {
  if (!b) return "";
  if (b.t === "p" || b.t === "h2" || b.t === "h3") return textoDeNodos(b.hijos);
  if (b.t === "lista") return b.items.map((it) => [textoDeNodos(it.hijos), ...(it.sub?.items ?? []).map((s) => textoDeNodos(s.hijos))].join(" ")).join(" ");
  if (b.t === "imagen") return b.titulo || b.alt;
  if (b.t === "aviso") return `${AVISOS[b.tipo] ?? ""}: ${b.bloques.map(textoDeBloque).join(" ")}`;
  if (b.t === "tabla") return [...(b.encabezado ? [b.encabezado] : []), ...b.filas].map((f) => f.map(textoDeNodos).join(" · ")).join(" ");
  return "";
}
export const textoPlano = (bloques = []) => bloques.map(textoDeBloque).filter(Boolean).join("\n");

/** Tabla de contenido: [{ id, texto, sub: [{ id, texto }] }] con los «##» y sus «###». */
export function tablaDeContenido(bloques = []) {
  const toc = [];
  for (const b of bloques) {
    if (b.t === "h2") toc.push({ id: b.id, texto: b.texto, sub: [] });
    else if (b.t === "h3" && toc.length) toc.at(-1).sub.push({ id: b.id, texto: b.texto });
  }
  return toc;
}

const esFaq = (texto) => /preguntas frecuentes/i.test(texto.normalize("NFD").replace(/[̀-ͯ]/g, ""));
/** Preguntas frecuentes: cada «### ¿…?» de la sección «## Preguntas frecuentes» y su respuesta en texto plano. */
export function preguntasFrecuentes(bloques = []) {
  const salida = [];
  let enFaq = false;
  let actual = null;
  for (const b of bloques) {
    if (b.t === "h2") { enFaq = esFaq(b.texto); actual = null; continue; }
    if (!enFaq) continue;
    if (b.t === "h3") { actual = { pregunta: b.texto, id: b.id, respuesta: [] }; salida.push(actual); continue; }
    if (actual) actual.respuesta.push(textoDeBloque(b));
  }
  return salida.map((f) => ({ ...f, respuesta: f.respuesta.filter(Boolean).join(" ").trim() })).filter((f) => f.respuesta);
}

/** Tareas «## Cómo …» con su lista numerada: [{ titulo, id, pasos: [texto], imagen }] (para JSON-LD HowTo). */
export function tareas(bloques = []) {
  const salida = [];
  let actual = null;
  for (const b of bloques) {
    if (b.t === "h2") {
      actual = /^c[oó]mo\s/i.test(b.texto) ? { titulo: b.texto, id: b.id, pasos: [], imagen: null } : null;
      if (actual) salida.push(actual);
      continue;
    }
    if (!actual) continue;
    if (b.t === "lista" && b.ordenada && !actual.pasos.length) actual.pasos = b.items.map((it) => textoDeNodos(it.hijos).trim()).filter(Boolean);
    if (b.t === "imagen" && !actual.imagen) actual.imagen = b.src;
  }
  return salida.filter((x) => x.pasos.length);
}

/** Todas las imágenes y enlaces (para la prueba de vigencia). */
export function recorrer(bloques = [], { imagen = () => {}, enlace = () => {} } = {}) {
  const nodos = (lista) => {
    for (const n of lista ?? []) {
      if (n.t === "enlace") enlace(n.href);
      if (n.hijos) nodos(n.hijos);
    }
  };
  for (const b of bloques) {
    if (b.t === "imagen") imagen(b.src);
    if (b.hijos) nodos(b.hijos);
    if (b.t === "lista") b.items.forEach((it) => { nodos(it.hijos); it.sub?.items.forEach((s) => nodos(s.hijos)); });
    if (b.t === "aviso") recorrer(b.bloques, { imagen, enlace });
    if (b.t === "tabla") [...(b.encabezado ?? []), ...b.filas.flat()].forEach(nodos);
  }
}
