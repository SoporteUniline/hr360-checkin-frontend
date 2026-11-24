// Saneador de HTML con lista blanca estricta (INC-REC-003): el HTML de la vacante viene del editor de RH y la página
// pública lo pinta, así que sin sanear se podía inyectar script en el navegador de cada candidato.
// Se vuelve a ESCRIBIR desde cero: solo etiquetas permitidas, sin atributos salvo href (http, https, mailto) en <a>,
// texto escapado; de script, style, iframe, svg… se tira también el contenido. Misma regla que el backend
// (utils/htmlSeguro.js, sanea al guardar): si cambias una, cambia la otra. Aquí cubre también lo guardado antes.

export const PERMITIDAS = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h3", "h4", "a"]);
const VACIAS = new Set(["br"]);
// Se descarta la etiqueta Y todo lo que tenga dentro.
const SIN_CONTENIDO = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "noembed", "noframes", "template",
  "textarea", "title", "xmp", "plaintext", "svg", "math", "select", "frameset", "head",
]);
const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", colon: ":", tab: "\t", newline: "\n", sol: "/", lpar: "(", rpar: ")" };
const ESQUEMAS = /^(https?:\/\/|mailto:)/i;

const escaparTexto = (s) => s.replace(/&(?!(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escaparAtributo = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function decodificar(valor) {
  return valor.replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});?/gi, (todo, ent) => {
    if (ent[0] === "#") {
      const n = ent[1] === "x" || ent[1] === "X" ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    }
    const v = ENTIDADES[ent.toLowerCase()];
    return v ?? todo;
  });
}

// href permitido ya limpio (como lo interpretaría el navegador) o null.
function hrefSeguro(valor) {
  // El navegador ignora tabs/saltos dentro de la URL y espacios/controles al inicio y al final.
  const limpio = decodificar(valor).replace(/[\t\n\r]/g, "").replace(/^[\u0000- ]+|[\u0000- ]+$/g, "");
  if (!ESQUEMAS.test(limpio) || /[\u0000-\u001f\u007f]/.test(limpio)) return null;
  return limpio;
}

// Lee una etiqueta que empieza en html[i] === "<". Devuelve { fin, cierre, nombre, attrs } o null si no es etiqueta.
function leerEtiqueta(html, i) {
  let j = i + 1;
  const cierre = html[j] === "/";
  if (cierre) j++;
  if (!/[a-z]/i.test(html[j] || "")) return null;
  const inicioNombre = j;
  while (j < html.length && !/[\s/>]/.test(html[j])) j++;
  const nombre = html.slice(inicioNombre, j).toLowerCase();
  const attrs = {};
  while (j < html.length) {
    while (j < html.length && /[\s/]/.test(html[j])) j++;
    if (html[j] === ">") return { fin: j + 1, cierre, nombre, attrs };
    if (j >= html.length) break;
    const inicioAttr = j;
    j++; // el primer carácter siempre es parte del nombre (aunque sea "=")
    while (j < html.length && !/[\s/>=]/.test(html[j])) j++;
    const attr = html.slice(inicioAttr, j).toLowerCase();
    while (j < html.length && /\s/.test(html[j])) j++;
    let valor = "";
    if (html[j] === "=") {
      j++;
      while (j < html.length && /\s/.test(html[j])) j++;
      const comilla = html[j];
      if (comilla === '"' || comilla === "'") {
        const cierraEn = html.indexOf(comilla, j + 1);
        if (cierraEn === -1) return { fin: html.length, cierre, nombre: "", attrs: {} };
        valor = html.slice(j + 1, cierraEn);
        j = cierraEn + 1;
      } else {
        const inicioValor = j;
        while (j < html.length && !/[\s>]/.test(html[j])) j++;
        valor = html.slice(inicioValor, j);
      }
    }
    if (!(attr in attrs)) attrs[attr] = valor;
  }
  // Etiqueta sin ">" final: el navegador la descarta junto con el resto.
  return { fin: html.length, cierre, nombre: "", attrs: {} };
}

export function sanearHtml(entrada) {
  if (entrada == null) return "";
  const html = String(entrada).replace(/\u0000/g, "");
  let salida = "";
  const abiertas = [];
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) { salida += escaparTexto(html.slice(i)); break; }
    salida += escaparTexto(html.slice(i, lt));
    i = lt;
    if (html.startsWith("<!--", i)) {
      const fin = html.indexOf("-->", i + 4);
      i = fin === -1 ? html.length : fin + 3;
      continue;
    }
    if (html[i + 1] === "!" || html[i + 1] === "?") {
      const fin = html.indexOf(">", i);
      i = fin === -1 ? html.length : fin + 1;
      continue;
    }
    const etiqueta = leerEtiqueta(html, i);
    if (!etiqueta) { salida += "&lt;"; i++; continue; }
    i = etiqueta.fin;
    const { nombre, cierre, attrs } = etiqueta;
    if (!nombre) continue;
    if (!cierre && SIN_CONTENIDO.has(nombre)) {
      const resto = html.slice(i).toLowerCase();
      const cierraEn = resto.search(new RegExp(`</${nombre}[\\s/>]`));
      if (cierraEn === -1) { i = html.length; continue; }
      const finCierre = html.indexOf(">", i + cierraEn);
      i = finCierre === -1 ? html.length : finCierre + 1;
      continue;
    }
    if (!PERMITIDAS.has(nombre)) continue;
    if (cierre) {
      if (VACIAS.has(nombre)) continue;
      const pos = abiertas.lastIndexOf(nombre);
      if (pos === -1) continue;
      while (abiertas.length > pos) salida += `</${abiertas.pop()}>`;
      continue;
    }
    if (VACIAS.has(nombre)) { salida += `<${nombre}>`; continue; }
    if (nombre === "a") {
      const href = attrs.href == null ? null : hrefSeguro(attrs.href);
      if (!href) continue; // sin enlace válido queda solo el texto
      salida += `<a href="${escaparAtributo(href)}" rel="noopener noreferrer nofollow" target="_blank">`;
    } else {
      salida += `<${nombre}>`;
    }
    abiertas.push(nombre);
  }
  while (abiertas.length) salida += `</${abiertas.pop()}>`;
  return salida;
}
