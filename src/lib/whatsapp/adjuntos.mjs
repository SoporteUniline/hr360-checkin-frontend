// Reglas puras de los adjuntos del chat de WhatsApp («Chat todo-en-uno»): tipos permitidos, tamaños, validación con los
// mismos textos que el API (413 WA_ARCHIVO_GRANDE, 415 WA_TIPO_NO_PERMITIDO), duraciones, grabación de notas de voz,
// ubicación y las líneas de sistema de la cita. Sin navegador: se prueban con node --test (scripts/test-whatsapp-adjuntos.mjs).
import { fechaHoraCorta } from "./agenda.mjs";

// Adjuntos, notas de voz y «Ofrecer horarios» en la bandeja. Encendido; NEXT_PUBLIC_WA_ADJUNTOS=false los esconde
// (por ejemplo, si un ambiente aún no tiene la migración 20261130_whatsapp_adjuntos).
export const CHAT_ADJUNTOS_ACTIVO = process.env.NEXT_PUBLIC_WA_ADJUNTOS !== "false";

export const LIMITE_ADJUNTO = 16 * 1024 * 1024; // 16 MB, igual que el API
export const LIMITE_PIE = 1024; // comentario (caption) de un archivo en WhatsApp
export const MAX_GRABACION_SEG = 5 * 60;

export const MENSAJE_ARCHIVO_GRANDE = "El archivo pesa más de 16 MB. WhatsApp no permite enviar archivos tan grandes.";
export const MENSAJE_TIPO_NO_PERMITIDO =
  "Ese tipo de archivo no se puede enviar por WhatsApp. Usa una imagen (JPG, PNG o WEBP), audio, video MP4, PDF, Word, Excel o PowerPoint.";
export const MENSAJE_ARCHIVO_VACIO = "El archivo está vacío.";
export const MENSAJE_DESCARGA_FALLIDA = "No se pudo descargar el archivo";
export const MENSAJE_MICRO_DENEGADO = "No se pudo usar el micrófono. Permite el acceso al micrófono en tu navegador para grabar notas de voz.";
export const MENSAJE_MICRO_NO_ENCONTRADO = "No encontramos un micrófono en este dispositivo.";
export const MENSAJE_SIN_GRABADORA = "Tu navegador no permite grabar notas de voz.";
export const MENSAJE_GRABACION_MAXIMA = "La grabación llegó al máximo de 5 min. Revísala y envíala.";

// mime → tipo de adjunto. Las extensiones cubren archivos que el sistema entrega sin `type` (pasa en Windows con Office).
const PERMITIDOS = {
  "image/jpeg": "imagen", "image/png": "imagen", "image/webp": "imagen",
  "audio/ogg": "audio", "audio/mpeg": "audio", "audio/mp4": "audio", "audio/aac": "audio", "audio/webm": "audio",
  "video/mp4": "video",
  "application/pdf": "documento",
  "application/msword": "documento",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "documento",
  "application/vnd.ms-excel": "documento",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "documento",
  "application/vnd.ms-powerpoint": "documento",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "documento",
};
const POR_EXTENSION = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  ogg: "audio/ogg", opus: "audio/ogg", mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", weba: "audio/webm",
  mp4: "video/mp4", pdf: "application/pdf",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
export const TIPOS_PERMITIDOS = Object.keys(PERMITIDOS);
// Lista para <input accept>: mimes y extensiones (algunos selectores de archivos solo filtran por extensión).
export const ACEPTAR_ARCHIVOS = [...TIPOS_PERMITIDOS, ...Object.keys(POR_EXTENSION).map((e) => `.${e}`)].join(",");

// «audio/webm;codecs=opus» → «audio/webm».
export const mimeBase = (mime) => String(mime ?? "").split(";")[0].trim().toLowerCase();
export const extension = (nombre) => {
  const m = /\.([a-z0-9]{1,8})$/i.exec(String(nombre ?? ""));
  return m ? m[1].toLowerCase() : "";
};
// Mime efectivo de un File/Blob: su `type` o, si viene vacío, el de la extensión.
export function mimeDeArchivo(archivo) {
  const propio = mimeBase(archivo?.type);
  if (propio && propio !== "application/octet-stream") return propio;
  return POR_EXTENSION[extension(archivo?.name)] ?? propio;
}

// Tipo genérico de un mime (para pintar adjuntos que llegan del API aunque no estén en la lista de envío).
export function tipoDeMime(mime) {
  const m = mimeBase(mime);
  if (PERMITIDOS[m]) return PERMITIDOS[m];
  if (m.startsWith("image/")) return "imagen";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  return m ? "documento" : null;
}

// { ok, error, mime, tipo }. Mismos textos que muestra el API; el servidor vuelve a validar.
export function validarArchivo(archivo) {
  if (!archivo) return { ok: false, error: MENSAJE_TIPO_NO_PERMITIDO };
  const mime = mimeDeArchivo(archivo);
  const tipo = PERMITIDOS[mime];
  if (!tipo) return { ok: false, error: MENSAJE_TIPO_NO_PERMITIDO, mime };
  const tamano = Number(archivo.size);
  if (!Number.isFinite(tamano) || tamano <= 0) return { ok: false, error: MENSAJE_ARCHIVO_VACIO, mime, tipo };
  if (tamano > LIMITE_ADJUNTO) return { ok: false, error: MENSAJE_ARCHIVO_GRANDE, mime, tipo };
  return { ok: true, error: "", mime, tipo };
}

// 2_411_724 → «2.3 MB»; 870_000 → «850 KB»; 512 → «512 B». Base 1024 como el límite.
export function formatearTamano(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  const mb = n / (1024 * 1024);
  const texto = mb >= 100 ? String(Math.round(mb)) : mb.toFixed(1).replace(/\.0$/, "");
  return `${texto} MB`;
}

// 7 → «0:07»; 65 → «1:05»; 3723 → «1:02:03». Valores no válidos (Infinity de algunos webm) → «0:00».
export function formatearDuracion(segundos) {
  const n = Number(segundos);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  const total = Math.floor(n);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// Nota de voz: ogg/opus (lo que WhatsApp reproduce como nota de voz) si el navegador lo graba; si no, webm/opus.
export const MIMES_GRABACION = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus"];
export function elegirMimeGrabacion(soporta) {
  if (typeof soporta !== "function") return "";
  for (const m of MIMES_GRABACION) {
    try { if (soporta(m)) return m; } catch { /* navegador sin isTypeSupported */ }
  }
  return "";
}
export function nombreGrabacion(mime, ahora = new Date()) {
  const base = mimeBase(mime);
  const ext = base === "audio/ogg" ? "ogg" : base === "audio/mp4" ? "m4a" : "webm";
  const sello = ahora.toISOString().slice(0, 19).replace(/[-:T]/g, "");
  return `nota-de-voz-${sello}.${ext}`;
}
export const llegoAlMaximo = (segundos) => Number(segundos) >= MAX_GRABACION_SEG;
// Error de getUserMedia → texto para la persona.
export function mensajeMicrofono(error) {
  const nombre = error?.name ?? "";
  if (nombre === "NotFoundError" || nombre === "OverconstrainedError") return MENSAJE_MICRO_NO_ENCONTRADO;
  if (nombre === "NotSupportedError") return MENSAJE_SIN_GRABADORA;
  return MENSAJE_MICRO_DENEGADO;
}

// Velocidades del reproductor de audio.
export const VELOCIDADES = [1, 1.5, 2];
export const siguienteVelocidad = (v) => VELOCIDADES[(VELOCIDADES.indexOf(Number(v)) + 1) % VELOCIDADES.length];
export const textoVelocidad = (v) => `${Number(v)}x`;

// Documento → etiqueta e ícono (clave que la vista traduce a un ícono de lucide).
export function infoDocumento(mime, nombre) {
  const m = mimeBase(mime) || POR_EXTENSION[extension(nombre)] || "";
  const ext = extension(nombre);
  if (m === "application/pdf" || ext === "pdf") return { etiqueta: "PDF", icono: "pdf" };
  if (/word/.test(m) || ["doc", "docx"].includes(ext)) return { etiqueta: "Word", icono: "word" };
  if (/excel|spreadsheet/.test(m) || ["xls", "xlsx", "csv"].includes(ext)) return { etiqueta: "Excel", icono: "excel" };
  if (/powerpoint|presentation/.test(m) || ["ppt", "pptx"].includes(ext)) return { etiqueta: "PowerPoint", icono: "ppt" };
  return { etiqueta: ext ? ext.toUpperCase() : "Documento", icono: "archivo" };
}

const ETIQUETAS = { imagen: "Foto", audio: "Audio", video: "Video", documento: "Documento", ubicacion: "Ubicación", sticker: "Sticker" };
export function etiquetaAdjunto(adjunto) {
  if (!adjunto) return "";
  if (adjunto.tipo === "audio" && adjunto.nota_voz) return "Nota de voz";
  if (adjunto.tipo === "documento" && adjunto.nombre) return `Documento: ${adjunto.nombre}`;
  return ETIQUETAS[adjunto.tipo] ?? "Archivo";
}

// Coordenadas válidas → enlace de Google Maps (sin mapa incrustado ni scripts de terceros).
export function coordenadas(lat, lng) {
  const a = Number(lat);
  const o = Number(lng);
  if (lat === null || lat === undefined || lat === "" || lng === null || lng === undefined || lng === "") return null;
  if (!Number.isFinite(a) || !Number.isFinite(o) || Math.abs(a) > 90 || Math.abs(o) > 180) return null;
  return { lat: a, lng: o, texto: `${a.toFixed(5)}, ${o.toFixed(5)}`, enlace: `https://www.google.com/maps?q=${a},${o}` };
}

// La URL del adjunto la manda el API como ruta relativa. Solo se piden rutas de este módulo: el token viaja en el
// encabezado y no debe ir a otro origen (una URL absoluta o «//host» haría que axios ignore el backend).
const RUTA_ADJUNTO = /^\/reclutamiento\/whatsapp\/[A-Za-z0-9_\-./%]+$/;
export function rutaAdjuntoSegura(url) {
  const t = String(url ?? "");
  if (!RUTA_ADJUNTO.test(t) || t.includes("..") || t.includes("//")) return null;
  return t;
}
export const rutaDescarga = (url) => {
  const r = rutaAdjuntoSegura(url);
  return r ? `${r}?descargar=1` : null;
};

// Nombre al descargar: el del API o uno por tipo, sin separadores de ruta.
export function nombreDescarga(adjunto) {
  const limpio = String(adjunto?.nombre ?? "").replace(/[\\/:*?"<>|]+/g, "_").trim();
  if (limpio) return limpio;
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "application/pdf": "pdf", "audio/ogg": "ogg", "audio/mpeg": "mp3" }[mimeBase(adjunto?.mime)];
  return `${(ETIQUETAS[adjunto?.tipo] ?? "archivo").toLowerCase()}${ext ? `.${ext}` : ""}`;
}

// Líneas de sistema del hilo tras una acción de la cita («Cita movida al mar 25 nov 10:30 a.m.»).
const fechaLinea = (inicio) => fechaHoraCorta(inicio).replace(" · ", " ");
export function lineaCita(accion, cita) {
  const cuando = cita?.inicio ? fechaLinea(cita.inicio) : "";
  switch (accion) {
    case "agendar": return cuando ? `Cita agendada para el ${cuando}` : "Cita agendada";
    case "mover": return cuando ? `Cita movida al ${cuando}` : "Cita movida";
    case "cancelar": return cuando ? `Cita del ${cuando} cancelada` : "Cita cancelada";
    case "asistio": return "Asistencia registrada: asistió a la entrevista";
    case "no_asistio": return "Asistencia registrada: no asistió a la entrevista";
    case "confirmar": return cuando ? `Cita del ${cuando} confirmada` : "Cita confirmada";
    case "ofrecer": return "Se le enviaron al candidato los horarios disponibles";
    default: return "";
  }
}

// Cita del chat: la próxima activa (agendada o confirmada; reagendar crea otra y deja la anterior «reagendada») y,
// si no hay, la última que tuvo (para decir cómo terminó).
export function citasDelChat(hilo) {
  if (hilo?.cita) return { activa: ["agendada", "confirmada"].includes(hilo.cita.estado) ? hilo.cita : null, ultima: hilo.cita };
  const todas = (hilo?.citas ?? []).filter(Boolean);
  const activas = todas.filter((c) => c.estado === "agendada" || c.estado === "confirmada")
    .sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
  const ultima = [...todas].filter((c) => c.estado !== "reagendada").sort((a, b) => String(b.inicio).localeCompare(String(a.inicio)))[0] ?? null;
  return { activa: activas[0] ?? null, ultima };
}
