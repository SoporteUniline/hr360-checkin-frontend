// Estatus de las actas administrativas. «borrador» lo crea el sistema cuando se registra una falta injustificada;
// RH lo revisa, oye a la persona (art. 423 LFT) y lo pasa a «elaborada» con el control de estatus de siempre.
// «cancelada»: la falta se corrigió o el acta no procede. Probado en scripts/test-tipos-goce.mjs.
export const ESTATUS_ACTA = [
  { value: "borrador", label: "Borrador", clase: "bg-slate-100 text-slate-700" },
  { value: "elaborada", label: "Elaborada", clase: "bg-blue-100 text-blue-800" },
  { value: "notificada", label: "Notificada", clase: "bg-emerald-100 text-emerald-800" },
  { value: "cerrada", label: "Cerrada", clase: "bg-red-100 text-red-800" },
  { value: "cancelada", label: "Cancelada", clase: "bg-zinc-100 text-zinc-500 line-through" },
];
const POR_VALOR = Object.fromEntries(ESTATUS_ACTA.map((e) => [e.value, e]));
const norm = (v) => String(v ?? "").trim().toLowerCase();
export const etiquetaEstatus = (v) => POR_VALOR[norm(v)]?.label ?? (String(v ?? "").trim() || "—");
export const claseEstatus = (v) => POR_VALOR[norm(v)]?.clase ?? "bg-purple-100 text-purple-800";
export const AVISO_AUDIENCIA = "Antes de aplicar una sanción, la persona debe ser oída (art. 423 de la Ley Federal del Trabajo). "
  + "Revisa el borrador, escucha su versión y entonces pásalo a «Elaborada».";
export const rutaActa = (id) => `/panel/actas-administrativas?acta=${encodeURIComponent(id)}`;
// Lo que se ve en Asistencias debajo de una falta injustificada: «📄 Acta en borrador» con enlace.
export function actaFila(fila) {
  const a = fila?.acta;
  if (!a || a.id == null) return null;
  const e = norm(a.estatus) || "borrador";
  return { texto: `📄 Acta ${e === "borrador" ? "en borrador" : etiquetaEstatus(e).toLowerCase()}`, href: rutaActa(a.id), estatus: e };
}
// Avisos del servidor sobre actas en una respuesta: `aviso` (texto) o `avisos` (lista, en masivos). Sin repetidos.
export function avisosRespuesta(data) {
  const lista = [data?.aviso, ...(Array.isArray(data?.avisos) ? data.avisos : [])]
    .map((a) => (typeof a === "string" ? a : a?.texto ?? a?.mensaje ?? "")).map((a) => String(a).trim()).filter(Boolean);
  return [...new Set(lista)];
}
