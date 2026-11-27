// «Respuestas de WhatsApp sin aplicar» (panel de Permisos, 29/12/2026). Reglas de presentación puras (sin React).
// Backend: GET /checador/solicitudes-permiso/whatsapp/sin-aplicar (hr360-checkin-backend, docs/aprobacion-whatsapp.md).
// Solo muestra lo que el servidor encontró; aplicar es la acción normal del panel (PATCH /:id/estado) y la confirma RH.

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «2026-12-08» → «8 dic»; con otro año, «8 dic 2025». */
export function fechaCorta(iso, hoy = new Date()) {
  const m = String(iso ?? "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const texto = `${Number(m[3])} ${MESES[Number(m[2]) - 1]}`;
  return Number(m[1]) === hoy.getFullYear() ? texto : `${texto} ${m[1]}`;
}

/** Rango del permiso: «8 dic», «8 – 9 dic» o «30 nov – 2 dic». */
export function rangoFechas(inicio, fin, hoy = new Date()) {
  const a = fechaCorta(inicio, hoy);
  const b = fechaCorta(fin || inicio, hoy);
  if (a === b) return a;
  const [diaA, ...restoA] = a.split(" ");
  const [, ...restoB] = b.split(" ");
  return restoA.join(" ") === restoB.join(" ") ? `${diaA} – ${b}` : `${a} – ${b}`;
}

/** Momento de la respuesta (ISO UTC) en hora local de la empresa: «8 dic, 10:15 a. m.». */
export function momento(iso, zona = "America/Mexico_City") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dia = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: zona }).format(d).replace(".", "");
  const hora = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: zona }).format(d);
  return `${dia}, ${hora}`;
}

export const CONFIANZA = Object.freeze({
  alta: { etiqueta: "Confianza alta", detalle: "Respondió con el botón de esa solicitud o citando su mensaje.", tono: "alta" },
  media: { etiqueta: "Confianza media", detalle: "Respondió con un botón o «sí/no»; era su única solicitud pendiente.", tono: "media" },
  baja: { etiqueta: "Confianza baja", detalle: "Texto libre o tenía varias solicitudes pendientes: revisa antes de aplicar.", tono: "baja" },
});
export const confianza = (c) => CONFIANZA[c] ?? CONFIANZA.baja;

/** Título de la tarjeta. */
export const titulo = (n) => `Respuestas de WhatsApp sin aplicar (${Number(n) || 0})`;

/** Qué sugiere la respuesta, en palabras. */
export const sugerencia = (s) => (s === "Rechazado" ? "Parece que la rechazó" : "Parece que la aprobó");

/** Texto del diálogo de confirmación antes de aplicar con la acción normal del panel. */
export function confirmacion(item, estado) {
  const accion = estado === "Rechazado" ? "rechazar" : "aprobar";
  const que = item?.es_vacaciones ? "las vacaciones" : `el permiso${item?.tipo ? ` «${item.tipo}»` : ""}`;
  return {
    titulo: estado === "Rechazado" ? "¿Aplicar el rechazo?" : "¿Aplicar la aprobación?",
    texto: `Vas a ${accion} ${que} de ${item?.empleado || "esta persona"} (${rangoFechas(item?.fecha_inicio, item?.fecha_fin)}). Se hace igual que desde la tabla: mismos efectos en asistencias, saldo y avisos.`,
    boton: estado === "Rechazado" ? "Sí, rechazar" : "Sí, aprobar",
  };
}

/** ¿Mostrar la tarjeta? Solo cuando el servidor pudo revisar y encontró algo. */
export const mostrar = (datos) => Boolean(datos?.disponible && Array.isArray(datos.solicitudes) && datos.solicitudes.length > 0);

/** Parámetros de la consulta: la unidad elegida (o todas) y los días. */
export function consulta(idEmpresa, dias = 30) {
  const p = new URLSearchParams({ dias: String(dias) });
  if (idEmpresa && idEmpresa !== "all") p.set("empresa", String(idEmpresa));
  return `/checador/solicitudes-permiso/whatsapp/sin-aplicar?${p.toString()}`;
}
