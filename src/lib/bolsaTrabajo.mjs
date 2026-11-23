// Bolsa de trabajo pública de ADAMIA (rediseño 23/11/2026). Lógica pura, sin React ni navegador, para la lista
// (/bolsa-de-trabajo) y la página de cada vacante (/vacante/[slug]). Pruebas: scripts/test-bolsa-trabajo.mjs.
//
// Contrato del API que NO cambia (backend: modules/recruitment/models/vacanteModel.js → filter):
//   GET /vacantes/filter?giro=&ciudad=&entidad=&pais=&titulo=&id_empresa=&tipo_contratacion=&page=&limit=
//   (cada filtro es LIKE %valor%; vacío = sin filtro). Responde { total, page, limit, data: [vacante + nombre_empresa,
//   giro, url_imagen] }. El API no filtra por modalidad.

export const LIMITE_VACANTES = 10;

export const FILTROS_INICIALES = Object.freeze({
  giro: "",
  ciudad: "",
  entidad: "",
  pais: "",
  titulo: "",
  tipo_contratacion: "",
  id_empresa: "",
  page: 1,
});

// Valores que acepta el backend en tipo_contratacion (los mismos botones que tenía la página).
export const TIPOS_CONTRATACION = ["Empleado", "Becario", "Practicante"];

const texto = (v) => (v === null || v === undefined ? "" : String(v).trim());
const pagina = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

// Consulta para /vacantes/filter: mismo orden y nombres que la versión anterior (los mocks y el backend la esperan así).
export function consultaVacantes(filtros = {}, limit = LIMITE_VACANTES) {
  const f = { ...FILTROS_INICIALES, ...filtros };
  const p = (k) => encodeURIComponent(texto(f[k]));
  return `giro=${p("giro")}&ciudad=${p("ciudad")}&entidad=${p("entidad")}&pais=${p("pais")}&titulo=${p("titulo")}&id_empresa=${p("id_empresa")}&tipo_contratacion=${p("tipo_contratacion")}&page=${pagina(f.page)}&limit=${limit}`;
}

// Filtros ↔ dirección de la página (para compartir la búsqueda y volver de una vacante sin perderla).
const EN_URL = [
  ["titulo", "q"],
  ["entidad", "estado"],
  ["ciudad", "ciudad"],
  ["pais", "pais"],
  ["tipo_contratacion", "tipo"],
  ["giro", "giro"],
  ["id_empresa", "empresa"],
];

export function filtrosDesdeUrl(search = "") {
  const sp = new URLSearchParams(search);
  const f = { ...FILTROS_INICIALES };
  for (const [clave, param] of EN_URL) f[clave] = texto(sp.get(param)).slice(0, 120);
  if (f.tipo_contratacion && !TIPOS_CONTRATACION.includes(f.tipo_contratacion)) f.tipo_contratacion = "";
  if (f.id_empresa && !/^\d+$/.test(f.id_empresa)) f.id_empresa = "";
  f.page = pagina(sp.get("pagina"));
  return f;
}

export function urlDeFiltros(filtros = {}) {
  const sp = new URLSearchParams();
  for (const [clave, param] of EN_URL) if (texto(filtros[clave])) sp.set(param, texto(filtros[clave]));
  if (pagina(filtros.page) > 1) sp.set("pagina", String(pagina(filtros.page)));
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
  return lista;
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

// «Publicada hoy», «Hace 3 días», «Hace 2 semanas»… Vacío si no hay fecha válida o es futura.
export function haceCuanto(fecha, ahora = new Date()) {
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

export const esNueva = (fecha, ahora = new Date()) => {
  const d = diasDesde(fecha, ahora);
  return d !== null && d >= 0 && d <= 2;
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
  for (const campo of [v.tipo_contratacion, v.tipo_contrato]) {
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
  const sueldo = sueldoEstructurado(v.salario);
  if (sueldo) ld.baseSalary = sueldo;
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
