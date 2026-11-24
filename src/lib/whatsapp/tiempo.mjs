// Fechas de WhatsApp (R1). El backend manda "YYYY-MM-DD HH:mm:ss" en hora de Ciudad de México (-06:00, sin
// horario de verano desde 2022). Todo se muestra en esa hora, sin importar la zona del navegador.
const OFFSET_MX_MS = -6 * 60 * 60 * 1000;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Convierte el texto del backend a Date (instante real). Acepta también ISO con zona. null si no se entiende.
export function parsearFechaMx(valor) {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  if (!valor) return null;
  const texto = String(valor).trim();
  const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/);
  if (m) {
    const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}-06:00`);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }
  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Partes de calendario en hora de Ciudad de México.
function partesMx(fecha) {
  const d = new Date(fecha.getTime() + OFFSET_MX_MS);
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth(), dia: d.getUTCDate(), semana: d.getUTCDay(), hora: d.getUTCHours(), minuto: d.getUTCMinutes() };
}
const diaJuliano = (p) => Math.floor(Date.UTC(p.anio, p.mes, p.dia) / 86400000);

// «4:05 p.m.»
export function horaCorta(valor) {
  const fecha = parsearFechaMx(valor);
  if (!fecha) return "";
  const { hora, minuto } = partesMx(fecha);
  const h12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${h12}:${String(minuto).padStart(2, "0")} ${hora < 12 ? "a.m." : "p.m."}`;
}

// Para la lista: «Ahora», «hace 5 min», hora si es de hoy, «Ayer», día de la semana, «12 nov» o «12 nov 2025».
export function tiempoRelativo(valor, ahora = new Date()) {
  const fecha = parsearFechaMx(valor);
  if (!fecha) return "";
  const diffMs = ahora.getTime() - fecha.getTime();
  if (diffMs < 60 * 1000) return "Ahora";
  if (diffMs < 60 * 60 * 1000) return `hace ${Math.floor(diffMs / 60000)} min`;
  const p = partesMx(fecha);
  const hoy = partesMx(ahora);
  const dias = diaJuliano(hoy) - diaJuliano(p);
  if (dias <= 0) return horaCorta(fecha);
  if (dias === 1) return "Ayer";
  if (dias < 7) return DIAS[p.semana];
  return p.anio === hoy.anio ? `${p.dia} ${MESES[p.mes]}` : `${p.dia} ${MESES[p.mes]} ${p.anio}`;
}

// Separador de días del chat: «Hoy», «Ayer», «12 de noviembre» o «12 de noviembre de 2025».
export function etiquetaDia(valor, ahora = new Date()) {
  const fecha = parsearFechaMx(valor);
  if (!fecha) return "";
  const p = partesMx(fecha);
  const hoy = partesMx(ahora);
  const dias = diaJuliano(hoy) - diaJuliano(p);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  const base = `${p.dia} de ${MESES_LARGOS[p.mes]}`;
  return p.anio === hoy.anio ? base : `${base} de ${p.anio}`;
}

// Clave de día (para agrupar mensajes) en hora de México: "2026-11-23".
export function claveDia(valor) {
  const fecha = parsearFechaMx(valor);
  if (!fecha) return "";
  const p = partesMx(fecha);
  return `${p.anio}-${String(p.mes + 1).padStart(2, "0")}-${String(p.dia).padStart(2, "0")}`;
}
