// Datos y reglas de la credencial del empleado y del encabezado compacto de su ficha (sin DOM: se prueban en Node).
// El dibujo vive en credencialCanvas.js; aquí solo hay textos, medidas y colores.
import { fechaParaInput } from "../fechaInput.mjs";

// Tarjeta CR80 (ISO/IEC 7810 ID-1), vertical: la medida de las credenciales de PVC y de las impresoras de tarjetas
// (≈ 54 × 86 mm). El diseño se traza en una base de 324 px de ancho y se escala a los dpi de cada salida.
export const TARJETA = Object.freeze({
  anchoMm: 53.98,
  altoMm: 85.6,
  radioMm: 3.18, // esquina estándar de la tarjeta
  baseAncho: 324,
});
export const BASE_ALTO = (TARJETA.baseAncho * TARJETA.altoMm) / TARJETA.anchoMm;

/** Píxeles de la tarjeta a cierta resolución (dpi) y la escala contra la base de diseño. */
export function pixelesTarjeta(dpi) {
  const ancho = Math.round((TARJETA.anchoMm / 25.4) * dpi);
  const alto = Math.round((TARJETA.altoMm / 25.4) * dpi);
  return { ancho, alto, escala: ancho / TARJETA.baseAncho };
}
// Descargas: 600 dpi (el doble del mínimo de imprenta) — nítido en impresoras de tarjetas de 300 dpi.
export const DPI_DESCARGA = 600;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «desde» de la ficha y la credencial: «mar 2021» (o «Mar 2021» con mayuscula). Toma el día tal como viene, sin zona. */
export function fechaDesde(valor, { mayuscula = false } = {}) {
  const dia = fechaParaInput(valor);
  if (!dia) return "";
  const [anio, mes] = dia.split("-").map(Number);
  if (!(mes >= 1 && mes <= 12)) return "";
  const m = MESES[mes - 1];
  return `${mayuscula ? m[0].toUpperCase() + m.slice(1) : m} ${anio}`;
}

const texto = (v) => (v == null ? "" : String(v).trim());

/**
 * Número de empleado que se muestra: el número/código propio si la ficha lo trae; si no, el «Código de empleado»
 * (nip, el mismo que lee el checador). Nunca el PIN de firma: RH no lo ve.
 */
export function numeroEmpleado(emp) {
  if (!emp) return "";
  for (const v of [emp.no_empleado, emp.numero_empleado, emp.codigo_empleado, emp.nip]) {
    if (texto(v)) return texto(v);
  }
  return "";
}

/** Línea bajo el nombre: «Puesto · Área · No. 0042 · desde mar 2021»; omite lo que falte. */
export function lineaSubtitulo({ puesto, area, numero, fechaIngreso } = {}) {
  const desde = fechaDesde(fechaIngreso);
  return [texto(puesto), texto(area), texto(numero) && `No. ${texto(numero)}`, desde && `desde ${desde}`]
    .filter(Boolean)
    .join(" · ");
}

/** Nombre en dos renglones para la credencial: nombre(s) arriba, apellidos abajo. */
export function lineasNombre(emp = {}) {
  const nombre = texto(emp.nombre);
  const apellidos = [texto(emp.apellido_paterno), texto(emp.apellido_materno)].filter(Boolean).join(" ");
  return [nombre, apellidos].filter(Boolean);
}

export function iniciales(emp = {}) {
  const a = texto(emp.nombre)[0] || "";
  const b = texto(emp.apellido_paterno)[0] || "";
  return (a + b).toUpperCase() || "?";
}

/** Código del QR en texto, en grupos de 3 si es numérico («211355498» → «211 355 498»). */
export function formatoCodigo(codigo) {
  const c = texto(codigo);
  if (!/^\d{4,}$/.test(c)) return c;
  return c.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function leyendaVuelta(empresa) {
  return `Credencial personal e intransferible. Si la encuentras, comunícate a ${texto(empresa) || "la empresa"}.`;
}

// ── Color (WCAG 2.x) ──
function canal(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
export function luminancia(hex) {
  const h = String(hex).replace("#", "");
  const n = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}
export function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
/** Primer color de texto que cumple AA (4.5:1) sobre el fondo; blanco primero, si no, el azul marino de ADAMIA. */
export function textoLegibleSobre(fondo, candidatos = ["#FFFFFF", "#080D36"]) {
  return candidatos.find((c) => contraste(c, fondo) >= 4.5) || candidatos[candidatos.length - 1];
}

// Franja: «color ADAMIA claro» = el azul ADAMIA aclarado del sistema de diseño (globals.css, --primary del tema
// oscuro: #3b82f6). El blanco sobre él da 3.7:1 (no cumple AA), por eso el texto de la franja es el azul marino de
// ADAMIA (--adamia-navy, #080d36).
export const COLORES_CREDENCIAL = Object.freeze({
  franja: "#3B82F6",
  textoFranja: textoLegibleSobre("#3B82F6"),
  fondoFrente: "#FFFFFF",
  texto: "#0F172A",
  textoSecundario: "#475569",
  etiqueta: "#64748B",
  linea: "#E2E8F0",
  pildora: "#EFF6FF",
  textoPildora: "#1D4ED8",
  fotoVacia: "#CBD5E1",
  textoFotoVacia: "#334155",
  fondoVuelta: "#0B1530",
  tituloVuelta: "#93C5FD",
  textoVuelta: "#CBD5E1",
  leyendaVuelta: "#94A3B8",
  codigoVuelta: "#FFFFFF",
  qr: "#0B1530",
  marca: "#1D5CF5",
});

/** Todo lo que pinta la credencial, a partir de los valores de la ficha. Sin PIN. */
export function datosCredencial({ empleado = {}, empresa = "" } = {}) {
  const codigo = texto(empleado.nip);
  return {
    empresa: texto(empresa),
    nombre: lineasNombre(empleado),
    iniciales: iniciales(empleado),
    puesto: texto(empleado.puesto),
    area: texto(empleado.departamento),
    numero: numeroEmpleado(empleado),
    desde: fechaDesde(empleado.fecha_ingreso, { mayuscula: true }),
    codigo,
    codigoTexto: formatoCodigo(codigo),
    leyenda: leyendaVuelta(empresa),
  };
}
