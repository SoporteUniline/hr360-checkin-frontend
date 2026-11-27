// Bolsa de trabajo pública de ADAMIA. Lógica pura, sin React ni navegador, para la lista
// (/bolsa-de-trabajo) y la página de cada vacante (/vacante/[slug]). Pruebas: scripts/test-bolsa-trabajo.mjs.
//
// Contrato del API que NO cambia (backend: modules/recruitment/models/vacanteModel.js → filter):
//   GET /vacantes/filter?giro=&ciudad=&entidad=&pais=&titulo=&id_empresa=&tipo_contratacion=&page=&limit=
//   (cada filtro es LIKE %valor%; vacío = sin filtro). Responde { total, page, limit, data: [vacante + nombre_empresa,
//   giro, url_imagen] }. El API no filtra por modalidad.
//   (25/11/2026) Cada vacante de la lista y GET /vacantes/slug/:slug traen `whatsapp: { enlace, asistente } | null`: el
//   enlace wa.me de la vacante (el mismo que copia RH) para «Pedir información por WhatsApp». null = no se muestra.
//   (27/11/2026, bolsa v2) Parámetros ADICIONALES (el backend viejo los ignora): orden=recientes|sueldo|cerca (+ lat/lng
//   redondeados a 2 decimales, nunca en la dirección de la página), sueldo_min, modalidad, jornada, publicada, whatsapp=1,
//   sin_experiencia=1. Cada fila trae además sueldo_desde/sueldo_hasta (solo si la empresa publica el sueldo),
//   tipo_jornada, cierra_el y distancia_km (solo con ubicación).

export const LIMITE_VACANTES = 10;

export const FILTROS_INICIALES = Object.freeze({
  giro: "",
  ciudad: "",
  entidad: "",
  pais: "",
  titulo: "",
  tipo_contratacion: "",
  id_empresa: "",
  // Bolsa v2: "" = sin filtro. orden "" = más recientes.
  orden: "",
  sueldo_min: "",
  modalidad: "",
  jornada: "",
  publicada: "",
  whatsapp: "",
  sin_experiencia: "",
  page: 1,
});

// Opciones de los filtros nuevos (mismos valores que acepta el backend: modules/recruitment/services/bolsaFiltros.js).
export const ORDENES = [
  { valor: "", texto: "Más recientes" },
  { valor: "cerca", texto: "Más cerca de mí" },
  { valor: "sueldo", texto: "Mejor sueldo" },
];
export const PUBLICADAS = [
  { valor: "", texto: "Cualquier fecha" },
  { valor: "hoy", texto: "Hoy" },
  { valor: "3d", texto: "Últimos 3 días" },
  { valor: "7d", texto: "Esta semana" },
  { valor: "30d", texto: "Este mes" },
];
export const SUELDOS = [6000, 8000, 10000, 12000, 15000, 20000];
export const MODALIDADES = [
  { valor: "presencial", texto: "Presencial" },
  { valor: "remoto", texto: "Desde casa" },
  { valor: "hibrido", texto: "Mixta (casa y oficina)" },
];
export const JORNADAS = [
  { valor: "tiempo-completo", texto: "Tiempo completo" },
  { valor: "medio-tiempo", texto: "Medio tiempo" },
  { valor: "por-proyecto", texto: "Por proyecto" },
  { valor: "practicas", texto: "Prácticas o becario" },
];
const VALORES = {
  orden: ["cerca", "sueldo"],
  modalidad: MODALIDADES.map((o) => o.valor),
  jornada: JORNADAS.map((o) => o.valor),
  publicada: PUBLICADAS.map((o) => o.valor).filter(Boolean),
};
export const textoDe = (lista, valor) => lista.find((o) => o.valor === valor)?.texto ?? "";
export const textoSueldoMin = (n) => (Number(n) > 0 ? `Desde $${Number(n).toLocaleString("en-US")} al mes` : "");

// Valores que acepta el backend en tipo_contratacion (los mismos botones que tenía la página).
export const TIPOS_CONTRATACION = ["Empleado", "Becario", "Practicante"];

const texto = (v) => (v === null || v === undefined ? "" : String(v).trim());
const pagina = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

// Consulta para /vacantes/filter: mismo orden y nombres que la versión anterior (los mocks y el backend la esperan así).
// Bolsa v2: después van orden (siempre; "" = recientes) y solo los filtros nuevos que tengan valor. ubicacion: { lat, lng }
// del navegador, solo para «Más cerca de mí» (se redondea a 2 decimales, ~1 km).
export function consultaVacantes(filtros = {}, limit = LIMITE_VACANTES, ubicacion = null) {
  const f = { ...FILTROS_INICIALES, ...filtros };
  const p = (k) => encodeURIComponent(texto(f[k]));
  let q = `giro=${p("giro")}&ciudad=${p("ciudad")}&entidad=${p("entidad")}&pais=${p("pais")}&titulo=${p("titulo")}&id_empresa=${p("id_empresa")}&tipo_contratacion=${p("tipo_contratacion")}&page=${pagina(f.page)}&limit=${limit}`;
  const cerca = f.orden === "cerca" && ubicacionValida(ubicacion);
  q += `&orden=${cerca ? "cerca" : f.orden === "sueldo" ? "sueldo" : "recientes"}`;
  if (cerca) q += `&lat=${redondear(ubicacion.lat)}&lng=${redondear(ubicacion.lng)}`;
  for (const k of ["sueldo_min", "modalidad", "jornada", "publicada"]) if (texto(f[k])) q += `&${k}=${p(k)}`;
  if (f.whatsapp === "1") q += "&whatsapp=1";
  if (f.sin_experiencia === "1") q += "&sin_experiencia=1";
  return q;
}

const redondear = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2);
export const ubicacionValida = (u) => Boolean(u) && Number.isFinite(Number(u.lat)) && Number.isFinite(Number(u.lng))
  && Math.abs(Number(u.lat)) <= 90 && Math.abs(Number(u.lng)) <= 180 && !(Number(u.lat) === 0 && Number(u.lng) === 0);

// Filtros ↔ dirección de la página (para compartir la búsqueda y volver de una vacante sin perderla).
const EN_URL = [
  ["titulo", "q"],
  ["entidad", "estado"],
  ["ciudad", "ciudad"],
  ["pais", "pais"],
  ["tipo_contratacion", "tipo"],
  ["giro", "giro"],
  ["id_empresa", "empresa"],
  ["orden", "orden"],
  ["sueldo_min", "sueldo"],
  ["modalidad", "modalidad"],
  ["jornada", "jornada"],
  ["publicada", "publicada"],
  ["whatsapp", "whatsapp"],
  ["sin_experiencia", "sinexp"],
];

export function filtrosDesdeUrl(search = "") {
  const sp = new URLSearchParams(search);
  const f = { ...FILTROS_INICIALES };
  for (const [clave, param] of EN_URL) f[clave] = texto(sp.get(param)).slice(0, 120);
  if (f.tipo_contratacion && !TIPOS_CONTRATACION.includes(f.tipo_contratacion)) f.tipo_contratacion = "";
  if (f.id_empresa && !/^\d+$/.test(f.id_empresa)) f.id_empresa = "";
  for (const [k, validos] of Object.entries(VALORES)) if (f[k] && !validos.includes(f[k])) f[k] = "";
  // «Más cerca» necesita la ubicación del navegador, que nunca va en la dirección: al abrir un enlace se ordena por recientes.
  if (f.orden === "cerca") f.orden = "";
  if (f.sueldo_min && !/^\d{3,7}$/.test(f.sueldo_min)) f.sueldo_min = "";
  for (const k of ["whatsapp", "sin_experiencia"]) if (f[k] !== "1") f[k] = "";
  f.page = pagina(sp.get("pagina"));
  return f;
}

// Vacante elegida en la lista (?v=slug, escritorio). Solo letras, números y guiones, como los slugs del backend.
export function vacanteDeUrl(search = "") {
  const v = texto(new URLSearchParams(search).get("v")).slice(0, 200);
  return /^[\w-]+$/.test(v) ? v : "";
}

export function urlDeFiltros(filtros = {}, slug = "") {
  const sp = new URLSearchParams();
  for (const [clave, param] of EN_URL) if (texto(filtros[clave]) && !(clave === "orden" && filtros[clave] === "cerca")) sp.set(param, texto(filtros[clave]));
  if (pagina(filtros.page) > 1) sp.set("pagina", String(pagina(filtros.page)));
  if (texto(slug)) sp.set("v", texto(slug));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// Filtros aplicados (sin contar la página), en el orden en que se muestran como chips.
export function filtrosActivos(filtros = {}, nombresEmpresa = {}) {
  const f = { ...FILTROS_INICIALES, ...filtros };
  const lista = [];
  if (texto(f.titulo)) lista.push({ clave: "titulo", etiqueta: `«${texto(f.titulo)}»` });
  if (texto(f.ciudad)) lista.push({ clave: "ciudad", etiqueta: texto(f.ciudad) });
  if (texto(f.entidad)) lista.push({ clave: "entidad", etiqueta: texto(f.entidad) });
  if (texto(f.pais)) lista.push({ clave: "pais", etiqueta: texto(f.pais) });
  if (texto(f.tipo_contratacion)) lista.push({ clave: "tipo_contratacion", etiqueta: texto(f.tipo_contratacion) });
  if (texto(f.giro)) lista.push({ clave: "giro", etiqueta: texto(f.giro) });
  if (texto(f.id_empresa)) lista.push({ clave: "id_empresa", etiqueta: nombresEmpresa[f.id_empresa] || "Empresa elegida" });
  if (texto(f.sueldo_min)) lista.push({ clave: "sueldo_min", etiqueta: textoSueldoMin(f.sueldo_min) });
  if (texto(f.publicada)) lista.push({ clave: "publicada", etiqueta: `Publicada: ${textoDe(PUBLICADAS, f.publicada).toLowerCase()}` });
  if (texto(f.modalidad)) lista.push({ clave: "modalidad", etiqueta: textoDe(MODALIDADES, f.modalidad) });
  if (texto(f.jornada)) lista.push({ clave: "jornada", etiqueta: textoDe(JORNADAS, f.jornada) });
  if (f.whatsapp === "1") lista.push({ clave: "whatsapp", etiqueta: "Postúlate por WhatsApp" });
  if (f.sin_experiencia === "1") lista.push({ clave: "sin_experiencia", etiqueta: "Sin experiencia" });
  return lista;
}

// Cuántos filtros cuenta el botón «Filtros» (todo menos la búsqueda por puesto y lugar, que se ven arriba).
export function cuantosFiltros(filtros = {}) {
  return filtrosActivos(filtros).filter((a) => !["titulo", "ciudad", "entidad"].includes(a.clave)).length + (filtros.orden ? 1 : 0);
}

export const hayFiltros = (filtros) => filtrosActivos(filtros).length > 0;

// Cambiar cualquier filtro vuelve a la página 1.
export function cambiarFiltro(filtros, clave, valor) {
  return { ...FILTROS_INICIALES, ...filtros, [clave]: texto(valor), page: 1 };
}

export const quitarFiltro = (filtros, clave) => cambiarFiltro(filtros, clave, "");

// Un solo selector «Estado o ciudad»: el valor lleva el tipo («estado:Jalisco», «ciudad:Zapopan»).
export function opcionesUbicacion(entidades = [], ciudades = []) {
  const unicos = (l) => [...new Set((l || []).map(texto).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  return {
    estados: unicos(entidades).map((e) => ({ valor: `estado:${e}`, texto: e })),
    ciudades: unicos(ciudades).map((c) => ({ valor: `ciudad:${c}`, texto: c })),
  };
}

export function valorUbicacion(filtros = {}) {
  if (texto(filtros.ciudad)) return `ciudad:${texto(filtros.ciudad)}`;
  if (texto(filtros.entidad)) return `estado:${texto(filtros.entidad)}`;
  return "";
}

export function aplicarUbicacion(filtros, valor = "") {
  const v = texto(valor);
  const base = { ...FILTROS_INICIALES, ...filtros, entidad: "", ciudad: "", page: 1 };
  if (v.startsWith("estado:")) return { ...base, entidad: v.slice(7) };
  if (v.startsWith("ciudad:")) return { ...base, ciudad: v.slice(7) };
  return base;
}

// ——— Presentación de una vacante ———

const SIN_SUELDO = /^(|0|0\.0+|-+|n\/?a|no establecido|no especificado|sin especificar|ninguno|null|undefined)$/i;
const NUMERO = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;
const moneda = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

// Sueldo para mostrar, o null si no se publica. Un número o un rango solo de números se formatea en pesos; un texto
// escrito por la empresa («$9,000 mensuales + bonos», «A convenir») se respeta.
export function formatoSueldo(salario) {
  const s = texto(salario).replace(/\s+/g, " ");
  if (SIN_SUELDO.test(s)) return null;
  const solo = s.replace(/\s*(mxn|pesos)\s*$/i, "");
  const rango = solo.match(/^\$?\s*([\d.,]+)\s*(?:-|–|a|al)\s*\$?\s*([\d.,]+)$/i);
  const uno = solo.match(/^\$?\s*([\d.,]+)$/);
  const num = (t) => Number(t.replace(/,/g, ""));
  if (rango && Number.isFinite(num(rango[1])) && Number.isFinite(num(rango[2])) && num(rango[1]) > 0) {
    return `${moneda(num(rango[1]))} a ${moneda(num(rango[2]))}`;
  }
  if (uno && Number.isFinite(num(uno[1]))) return num(uno[1]) > 0 ? moneda(num(uno[1])) : null;
  return s.length > 80 ? `${s.slice(0, 79).trimEnd()}…` : s;
}

// Día calendario en la Ciudad de México («2026-11-20»). Una fecha sola (DATE) se toma tal cual.
function diaMx(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const s = texto(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = valor instanceof Date ? valor : new Date(s.includes("T") || s.endsWith("Z") ? s : s.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function diasDesde(fecha, ahora = new Date()) {
  const a = diaMx(fecha);
  const b = diaMx(ahora);
  if (!a || !b) return null;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

// Momento (ms) de una fecha del API. «YYYY-MM-DD HH:mm:ss» es hora de la Ciudad de México (UTC−6 todo el año desde
// 2022); una fecha sola o la medianoche exacta en CDMX (un DATE de MySQL serializado) cuenta como «solo día» → null.
function momento(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.getTime();
  const s = texto(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const local = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/);
  const ms = local ? Date.parse(`${local[1]}T${local[2]}-06:00`) : Date.parse(s);
  if (Number.isNaN(ms)) return null;
  const hora = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  return hora === "00:00:00" ? null : ms;
}

// Horas completas desde la publicación (null si solo hay día o la fecha no sirve).
export function horasDesde(fecha, ahora = new Date()) {
  const ms = momento(fecha);
  if (ms === null) return null;
  return Math.floor((ahora.getTime() - ms) / 3600000);
}

// «Hace 2 horas», «Publicada hoy», «Publicada ayer», «Hace 3 días», «Hace 2 semanas»… Vacío si no hay fecha válida o es futura.
export function haceCuanto(fecha, ahora = new Date()) {
  const h = horasDesde(fecha, ahora);
  if (h !== null && h >= 0 && h < 24 && diasDesde(fecha, ahora) <= 1) {
    if (h === 0) return "Hace menos de una hora";
    return h === 1 ? "Hace 1 hora" : `Hace ${h} horas`;
  }
  const d = diasDesde(fecha, ahora);
  if (d === null || d < 0) return "";
  if (d === 0) return "Publicada hoy";
  if (d === 1) return "Publicada ayer";
  if (d < 7) return `Hace ${d} días`;
  if (d < 30) {
    const s = Math.floor(d / 7);
    return s === 1 ? "Hace 1 semana" : `Hace ${s} semanas`;
  }
  if (d < 365) {
    const m = Math.floor(d / 30);
    return m <= 1 ? "Hace 1 mes" : `Hace ${m} meses`;
  }
  return "Hace más de un año";
}

// «Nueva»: publicada hace 48 horas o menos. Con solo el día: hoy o ayer.
export const esNueva = (fecha, ahora = new Date()) => {
  const ms = momento(fecha);
  if (ms !== null) return ahora.getTime() >= ms && ahora.getTime() - ms <= 48 * 3600000;
  const d = diasDesde(fecha, ahora);
  return d !== null && d >= 0 && d <= 1;
};

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü", iquest: "¿", iexcl: "¡", bull: "•", middot: "·", hellip: "…", ndash: "–", mdash: "—", laquo: "«", raquo: "»" };

// Texto plano de un HTML de vacante (para el extracto de la tarjeta y la descripción de buscadores).
// Sin DOM: la versión anterior metía el HTML en un <div> del documento, y un <img onerror> se ejecutaba.
export function textoPlano(html, max = 0) {
  let s = texto(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|li|h\d|div|br)>|<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n] ?? m)
    .replace(/\s+/g, " ")
    .trim();
  if (max > 0 && s.length > max) {
    const corte = s.slice(0, max - 1);
    const espacio = corte.lastIndexOf(" ");
    s = `${(espacio > max * 0.6 ? corte.slice(0, espacio) : corte).replace(/[\s,.;:]+$/, "")}…`;
  }
  return s;
}

export function ubicacionVacante(v = {}) {
  const partes = [texto(v.ciudad), texto(v.entidad)].filter(Boolean);
  const unicas = partes.filter((p, i) => partes.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  return unicas.join(", ") || texto(v.pais);
}

// ——— Bolsa v2: datos de la tarjeta y de la ficha ———

const pesos = (n) => `$${Math.round(Number(n)).toLocaleString("en-US")}`;
const numero = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

// Sueldo para la tarjeta y la ficha: el publicado en el panel («$9,500 a $11,000 al mes»), si no el texto de la
// vacante, y si no hay nada «Sueldo a convenir» (conocido: false para mostrarlo en gris).
export function sueldoVacante(v = {}) {
  const desde = numero(v.sueldo_desde);
  const hasta = numero(v.sueldo_hasta);
  if (Number.isFinite(desde) && desde > 0) {
    const rango = Number.isFinite(hasta) && hasta > desde ? `${pesos(desde)} a ${pesos(hasta)}` : pesos(desde);
    return { texto: `${rango} al mes`, conocido: true };
  }
  const t = formatoSueldo(v.salario);
  if (t) return { texto: t.replace(/\s*MXN mensuales$/i, " al mes"), conocido: true };
  return { texto: "Sueldo a convenir", conocido: false };
}

// «a 4 km» / «a menos de 1 km»; vacío sin distancia.
export function distanciaTexto(km) {
  const n = numero(km);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1) return "a menos de 1 km";
  return `a ${n < 10 ? Math.round(n * 10) / 10 : Math.round(n)} km`;
}

const MENORES = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "sa", "s.a.", "cv", "c.v.", "sa de cv", "s.a. de c.v."]);

// Iniciales de la empresa para el logo que falta («Farmacias Lupita» → «FL»).
export function iniciales(nombre) {
  const palabras = texto(nombre).replace(/[^\p{L}\p{N}\s.]/gu, " ").split(/\s+/).filter((p) => p && !MENORES.has(p.toLowerCase()));
  const letras = palabras.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
  return letras || "?";
}

// Color fijo por empresa (todos con letra blanca ≥ 4.5:1).
const COLORES_LOGO = ["#2C56E8", "#5A3CF4", "#0B1033", "#0F766E", "#9A3412", "#1E40AF", "#7E22CE"];
export function colorLogo(nombre) {
  let h = 0;
  for (const c of texto(nombre)) h = (h * 31 + c.codePointAt(0)) % 997;
  return COLORES_LOGO[h % COLORES_LOGO.length];
}

// «Postúlate por WhatsApp» solo cuando la empresa tiene encendido el asistente (el agente entrevista por chat).
export function postulaPorWhatsApp(v) {
  const wa = whatsappDeVacante(v);
  return wa?.asistente ? wa : null;
}

const NO_NECESARIA = /sin experiencia|no (es )?necesaria|no requerida|no se requiere|no indispensable/i;

// Experiencia en una línea: «No necesaria» si así lo dice la vacante; si no, el texto (corto) o vacío.
export function experienciaTexto(v = {}) {
  const t = textoPlano(v.experiencia);
  if (!t) return "";
  return NO_NECESARIA.test(t) ? "No necesaria" : textoPlano(v.experiencia, 90);
}

export const jornadaVacante = (v = {}) => texto(v.tipo_jornada) || texto(v.tipo_contratacion);

// «Dónde»: dirección y ciudad sin repetir.
export function dondeVacante(v = {}) {
  const dir = texto(v.direccion);
  const lugar = ubicacionVacante(v);
  if (!dir) return lugar;
  return lugar && !dir.toLowerCase().includes(texto(v.ciudad).toLowerCase() || "\u0000") ? `${dir}, ${lugar}` : dir;
}

// ——— Paginación ———

export const totalPaginas = (total, limit = LIMITE_VACANTES) => Math.max(1, Math.ceil((Number(total) || 0) / (limit || 1)));

// Botones de página: siempre la primera, la última y las vecinas de la actual; «…» en los huecos.
export function paginas(actual, total) {
  const n = Math.max(1, Number(total) || 1);
  const a = Math.min(Math.max(1, Number(actual) || 1), n);
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
  const set = new Set([1, n, a - 1, a, a + 1]);
  if (a <= 3) [2, 3, 4].forEach((x) => set.add(x));
  if (a >= n - 2) [n - 3, n - 2, n - 1].forEach((x) => set.add(x));
  const orden = [...set].filter((x) => x >= 1 && x <= n).sort((x, y) => x - y);
  const out = [];
  orden.forEach((x, i) => {
    if (i > 0 && x - orden[i - 1] > 1) out.push("…");
    out.push(x);
  });
  return out;
}

export function textoConteo(total, conFiltros) {
  const n = Number(total) || 0;
  const cifra = n.toLocaleString("es-MX");
  if (conFiltros) return n === 1 ? "1 vacante con tu búsqueda" : `${cifra} vacantes con tu búsqueda`;
  return n === 1 ? "1 vacante abierta" : `${cifra} vacantes abiertas`;
}

// ——— Datos estructurados (schema.org JobPosting) ———

const TIPO_EMPLEO = [
  [/becari|practicant|pr[aá]ctica|servicio social/i, "INTERN"],
  [/medio tiempo|tiempo parcial|part[- ]?time/i, "PART_TIME"],
  [/temporal|eventual|por obra|proyecto/i, "TEMPORARY"],
  [/honorarios|freelance|independiente/i, "CONTRACTOR"],
  [/tiempo completo|indeterminado|\bde planta\b|\bde base\b|full[- ]?time/i, "FULL_TIME"],
];
const UNIDAD = [
  [/hora/i, "HOUR"],
  [/d[ií]a|diari/i, "DAY"],
  [/semana/i, "WEEK"],
  [/\bmes|mensual/i, "MONTH"],
  [/\baño|anual/i, "YEAR"],
];

function tipoEmpleo(v) {
  const tipos = new Set();
  for (const campo of [v.tipo_jornada, v.tipo_contratacion, v.tipo_contrato]) {
    const t = texto(campo);
    if (!t) continue;
    const hallado = TIPO_EMPLEO.find(([re]) => re.test(t));
    if (hallado) tipos.add(hallado[1]);
  }
  return [...tipos];
}

// Sueldo solo si es inequívoco: una cifra o un rango, con su periodo escrito («mensual», «por semana»…).
export function sueldoEstructurado(salario) {
  const s = texto(salario);
  if (SIN_SUELDO.test(s)) return null;
  const unidad = UNIDAD.find(([re]) => re.test(s))?.[1];
  const nums = (s.match(NUMERO) || []).map((n) => Number(n.replace(/,/g, ""))).filter((n) => Number.isFinite(n) && n >= 50);
  if (!unidad || !nums.length || nums.length > 2) return null;
  const valor = nums.length === 2
    ? { "@type": "QuantitativeValue", minValue: Math.min(...nums), maxValue: Math.max(...nums), unitText: unidad }
    : { "@type": "QuantitativeValue", value: nums[0], unitText: unidad };
  return { "@type": "MonetaryAmount", currency: "MXN", value: valor };
}

const PAISES = { "méxico": "MX", mexico: "MX", "estados unidos": "US", usa: "US" };

export function jobPostingLd(v, url) {
  if (!v || !texto(v.titulo)) return null;
  const descripcion = [v.descripcion, v.responsabilidades].map((h) => textoPlano(h)).filter(Boolean).join(" ");
  const fecha = diaMx(v.fecha_publicacion);
  if (!descripcion || !fecha) return null;
  const pais = PAISES[texto(v.pais).toLowerCase()] || texto(v.pais) || "MX";
  const ld = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: texto(v.titulo),
    description: descripcion,
    datePosted: fecha,
    directApply: true,
    hiringOrganization: { "@type": "Organization", name: texto(v.nombre_empresa) || "Empresa confidencial" },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(texto(v.direccion) ? { streetAddress: texto(v.direccion) } : {}),
        ...(texto(v.ciudad) ? { addressLocality: texto(v.ciudad) } : {}),
        ...(texto(v.entidad) ? { addressRegion: texto(v.entidad) } : {}),
        addressCountry: pais,
      },
    },
  };
  if (/^https:\/\//.test(texto(v.url_imagen))) ld.hiringOrganization.logo = texto(v.url_imagen);
  if (url) ld.url = url;
  const tipos = tipoEmpleo(v);
  if (tipos.length) ld.employmentType = tipos.length === 1 ? tipos[0] : tipos;
  if (/remot|home office|desde casa/i.test(texto(v.modalidad))) {
    ld.jobLocationType = "TELECOMMUTE";
    ld.applicantLocationRequirements = { "@type": "Country", name: pais };
  }
  // Sueldo publicado en el panel (mensual, en pesos); si no, el texto de la vacante cuando es inequívoco.
  const desde = numero(v.sueldo_desde);
  const hasta = numero(v.sueldo_hasta);
  if (Number.isFinite(desde) && desde > 0) {
    ld.baseSalary = {
      "@type": "MonetaryAmount", currency: "MXN",
      value: Number.isFinite(hasta) && hasta > desde
        ? { "@type": "QuantitativeValue", minValue: desde, maxValue: hasta, unitText: "MONTH" }
        : { "@type": "QuantitativeValue", value: desde, unitText: "MONTH" },
    };
  } else {
    const sueldo = sueldoEstructurado(v.salario);
    if (sueldo) ld.baseSalary = sueldo;
  }
  // Fecha de cierre del panel: válida hasta el final de ese día en la Ciudad de México.
  const cierre = texto(v.cierra_el).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(cierre)) ld.validThrough = `${cierre}T23:59:59-06:00`;
  return ld;
}

// JSON para <script type="application/ld+json">: sin «<», «>» ni «&» literales (no puede cerrar la etiqueta).
export function jsonLdSeguro(objeto) {
  return JSON.stringify(objeto)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// ——— WhatsApp de la vacante (25/11/2026) ———
// { enlace, asistente } solo si el API mandó un enlace https://wa.me/<dígitos>; cualquier otra cosa → null (no se muestra
// el botón). Así un dato raro nunca termina en el href de la página pública.
export function whatsappDeVacante(v) {
  const w = v?.whatsapp;
  const enlace = typeof w?.enlace === "string" ? w.enlace.trim() : "";
  if (!enlace) return null;
  let url;
  try {
    url = new URL(enlace);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "wa.me" || url.port || url.username || url.password || !/^\/\d{8,15}$/.test(url.pathname)) return null;
  return { enlace, asistente: w.asistente === true };
}

export const TEXTO_WHATSAPP = "Pedir información por WhatsApp";

// Nombre accesible del botón (lectores de pantalla): incluye la vacante y que se abre en otra pestaña.
export function etiquetaWhatsApp(titulo) {
  const t = texto(titulo);
  return `${TEXTO_WHATSAPP}${t ? ` sobre la vacante ${t}` : ""} (se abre en otra pestaña)`;
}

// Texto de apoyo bajo el botón: con el agente encendido responde el asistente; si no, una persona del equipo.
export const apoyoWhatsApp = (wa) => (wa?.asistente ? "Te responde nuestro asistente en minutos." : "Te responde el equipo de reclutamiento.");
