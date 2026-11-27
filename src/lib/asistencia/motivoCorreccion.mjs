// «Las checadas tienen que pedir motivo» (decisión del dueño, 27/11/2026): toda corrección manual de checadas y asistencias
// (horas, qué pasó, comida agregada, quitar o agregar checadas, masivos) pide el motivo antes de guardar. Espejo exacto de
// la regla del servidor (services/motivoCorreccion.js del backend): se recorta, de 5 a 500 letras; sin él responde 422.
// El reloj del día sigue con su lista de «Corrección» por renglón (lib/asistencia/relojDia.mjs); aquí se escribe libre con
// las mismas sugerencias rápidas.

export const MOTIVO_MIN = 5;
export const MOTIVO_MAX = 500;

// Las de «Corrección» del reloj del día, sin «Por el permiso del día» ni «Otro» (aquí siempre se puede escribir).
export const SUGERENCIAS = [
  "Olvidó checar", "Falla del reloj", "Error de captura", "Trabajó fuera de la sucursal", "Checada duplicada",
  "Trabajo remoto / home office", "Visita a cliente o comisión", "Capacitación o evento externo",
  "Sin dispositivo o reloj sin conexión",
];

// Pantalla de origen que queda en el historial (el servidor solo acepta las de cada endpoint).
export const PANTALLAS = {
  reloj_dia: "Reloj del día",
  asistencias: "Asistencias",
  incidencias: "Centro de incidencias",
  entradas_salidas: "Entradas y salidas",
  acciones_masivas: "Acciones masivas",
  registro_masivo: "Registro masivo de incidencias",
  comida: "Comida agregada a mano",
  estado_dia: "Qué pasó",
  horas_extra: "Control de horas extra",
};

export const limpiarMotivo = (texto) => String(texto ?? "").replace(/\s+/g, " ").trim();

// "" si sirve; si no, el mismo mensaje que el servidor.
export function errorMotivo(texto) {
  const m = limpiarMotivo(texto);
  if (!m) return "Escribe el motivo de la corrección.";
  if (m.length < MOTIVO_MIN) return `El motivo debe tener al menos ${MOTIVO_MIN} letras.`;
  if (m.length > MOTIVO_MAX) return `El motivo no puede pasar de ${MOTIVO_MAX} letras.`;
  return "";
}

// Campos del cuerpo para el servidor: { motivo_correccion, pantalla? }.
export const camposMotivo = (texto, pantalla) => ({ motivo_correccion: limpiarMotivo(texto), ...(pantalla ? { pantalla } : {}) });

// ¿La respuesta del servidor es «falta el motivo»? (422 con codigo FALTA_MOTIVO). Devuelve el mensaje o "".
export function errorMotivoServidor(error) {
  const r = error?.response;
  if (r?.status !== 422) return "";
  const d = r.data ?? {};
  return d.codigo === "FALTA_MOTIVO" || d.campo === "motivo_correccion" ? String(d.error || d.message || "Escribe el motivo de la corrección.") : "";
}

// Motivo de una fila del historial (asistencias_cambios): la columna `motivo` o, en bases sin la migración 20261230,
// lo que el servidor agregó al final de «después» (« · Motivo: …»). { despues, motivo }.
export function motivoDelCambio(cambio) {
  const despues = cambio?.valor_despues ?? null;
  if (cambio?.motivo) return { despues, motivo: String(cambio.motivo) };
  const m = /^(.*) · Motivo: (.+)$/s.exec(String(despues ?? ""));
  if (!m) return { despues, motivo: null };
  return { despues: m[1] === "—" ? null : m[1], motivo: m[2] };
}
