/**
 * Nombre de archivo homologado para todo documento que descarga ADAMIA.
 *
 * Regla del dueño (23/11/2026): el nombre dice QUÉ documento es, la FECHA y el
 * NÚMERO DE EMPLEADO, nunca su nombre. Solo letras ASCII, números y guiones:
 * algunos celulares renombran a «download» los archivos con acentos o espacios.
 *
 *   nombreArchivoPdf({ documento: "Consentimiento rostro", empleado: { id_empleado: 1234 }, fecha: "2026-11-22" })
 *   → "Consentimiento-rostro-Emp-1234-2026-11-22.pdf"
 *
 * Copia idéntica en el backend: utils/nombreArchivo.js (mismas pruebas).
 */

const MAX_PARTE = 60;

/** Quita acentos y todo lo que no sea [A-Za-z0-9]; separa con guiones. */
export function limpiarParte(valor, max = MAX_PARTE) {
  const texto = String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return texto.slice(0, max).replace(/-+$/g, "");
}

const dos = (n) => String(n).padStart(2, "0");

/** Fecha local AAAA-MM-DD. Acepta Date, timestamp o texto que empiece con AAAA-MM-DD. */
export function fechaArchivo(fecha = new Date()) {
  if (typeof fecha === "string") {
    const m = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return fechaArchivo(new Date());
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/**
 * Número que identifica al empleado en el archivo: su número/código de
 * empleado si la ficha lo trae; si no, su id_empleado. Nunca el nombre.
 * (No usa `id` a secas: en un permiso o contrato `id` es el del documento.)
 */
export function numeroEmpleadoArchivo(empleado) {
  if (empleado == null) return "";
  if (typeof empleado !== "object") return limpiarParte(empleado, 20);
  const candidato = [
    empleado.no_empleado,
    empleado.numero_empleado,
    empleado.codigo_empleado,
    empleado.id_empleado,
  ].find((v) => v !== undefined && v !== null && String(v).trim() !== "");
  return limpiarParte(candidato, 20);
}

/**
 * @param {object} p
 * @param {string} p.documento  Qué documento es («Recibo nomina», «Acta administrativa»…).
 * @param {object|string|number} [p.empleado]  Fila con no_empleado/numero_empleado/codigo_empleado/id_empleado, o el número directo.
 * @param {string|number} [p.folio]  Folio del documento, si lo tiene.
 * @param {Date|string} [p.fecha]  Fecha del documento (por omisión, hoy).
 * @param {{inicio: string, fin: string}} [p.periodo]  En lugar de fecha, un rango («2026-11-01-al-2026-11-15»).
 * @param {string} [p.extension="pdf"]
 */
export function nombreArchivoPdf({ documento, empleado, folio, fecha, periodo, extension = "pdf" } = {}) {
  const partes = [limpiarParte(documento) || "Documento"];
  const f = limpiarParte(folio, 30);
  if (f) partes.push("Folio", f);
  const emp = numeroEmpleadoArchivo(empleado);
  if (emp) partes.push("Emp", emp);
  if (periodo && (periodo.inicio || periodo.fin)) {
    const ini = fechaArchivo(periodo.inicio || periodo.fin);
    const fin = fechaArchivo(periodo.fin || periodo.inicio);
    partes.push(ini === fin ? ini : `${ini}-al-${fin}`);
  } else {
    partes.push(fechaArchivo(fecha ?? new Date()));
  }
  const ext = limpiarParte(extension, 8).toLowerCase() || "pdf";
  return `${partes.join("-")}.${ext}`;
}
