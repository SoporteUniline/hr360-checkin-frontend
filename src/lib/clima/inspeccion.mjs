// Lógica pura de las pantallas nuevas de Clima (26/11/2026): NOM-035 lista para inspección, buzón confidencial,
// analítica (cortes, mapa de calor, impulsores), riesgo de rotación por grupo y encuestas de ciclo de vida.
// Las reglas viven en el servidor; aquí solo textos, colores y validaciones de formulario. node --test scripts/test-clima-inspeccion.mjs

export const ESTADO_LISTA = Object.freeze({
  cumple: { texto: "Cumple", clase: "bg-green-100 text-green-800", punto: "bg-green-600" },
  parcial: { texto: "En proceso", clase: "bg-amber-100 text-amber-900", punto: "bg-amber-500" },
  falta: { texto: "Falta", clase: "bg-red-100 text-red-800", punto: "bg-red-600" },
  no_aplica: { texto: "No aplica", clase: "bg-slate-100 text-slate-600", punto: "bg-slate-400" },
});

export const TIPOS_EVIDENCIA = Object.freeze({
  politica: "Política firmada o publicada",
  difusion_politica: "Difusión de la política",
  difusion_resultados: "Difusión de resultados",
  canalizacion: "Constancia de canalización (Guía I)",
  capacitacion: "Capacitación o sensibilización",
  programa: "Avance del programa de intervención",
  buzon: "Atención de quejas del buzón",
  otro: "Otra evidencia",
});

export const MEDIOS = Object.freeze({ reunion: "Reunión", correo: "Correo", app: "App ADAMIA", tablero: "Tablero o periódico mural", whatsapp: "WhatsApp", otro: "Otro" });

export const ESTADOS_QUEJA = Object.freeze({
  recibida: { texto: "Recibida", clase: "bg-blue-100 text-blue-800" },
  en_revision: { texto: "En revisión", clase: "bg-amber-100 text-amber-900" },
  atendida: { texto: "Atendida", clase: "bg-green-100 text-green-800" },
  cerrada: { texto: "Cerrada", clase: "bg-slate-100 text-slate-700" },
});

export const TIPOS_QUEJA = Object.freeze({
  violencia: "Violencia laboral",
  acoso: "Acoso u hostigamiento sexual",
  hostigamiento: "Hostigamiento o malos tratos",
  riesgo: "Condición que pone en riesgo (cargas, jornadas, entorno)",
  sugerencia: "Sugerencia para mejorar el entorno",
  otro: "Otro",
});

export const ACCION_BITACORA = Object.freeze({
  recibida: "Se recibió",
  vista: "La abrió",
  estado: "Cambió el estado",
  nota: "Nota interna",
  respuesta: "Respondió a quien denunció",
  consulta_folio: "Consultaron el folio",
});

export const MAX_EVIDENCIA = 10 * 1024 * 1024;
export const ACEPTA_EVIDENCIA = "application/pdf,image/jpeg,image/png,image/webp";

export const tamano = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

// Formulario de evidencia antes de subir (el servidor vuelve a validar, por los bytes reales del archivo).
export function erroresEvidencia({ archivo, tipo, descripcion, fecha }) {
  const e = {};
  if (!archivo) e.archivo = "Elige el archivo.";
  else if (archivo.size > MAX_EVIDENCIA) e.archivo = "El archivo no debe pasar de 10 MB.";
  else if (archivo.type && !ACEPTA_EVIDENCIA.split(",").includes(archivo.type)) e.archivo = "Sube un PDF o una imagen (JPG, PNG o WEBP).";
  if (!TIPOS_EVIDENCIA[tipo]) e.tipo = "Elige a qué obligación corresponde.";
  if (String(descripcion ?? "").trim().length < 3) e.descripcion = "Describe la evidencia.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha ?? ""))) e.fecha = "Elige la fecha.";
  return e;
}

export function erroresDifusion({ tipo, medio, fecha, id_campania }) {
  const e = {};
  if (!["politica", "resultados"].includes(tipo)) e.tipo = "Elige qué se difundió.";
  if (!MEDIOS[medio]) e.medio = "Elige el medio.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha ?? ""))) e.fecha = "Elige la fecha.";
  if (tipo === "resultados" && !id_campania) e.id_campania = "Elige la aplicación.";
  return e;
}

export const RELATO_MINIMO = 20;
export function erroresQueja({ tipo, relato }) {
  const e = {};
  if (!TIPOS_QUEJA[tipo]) e.tipo = "Elige de qué se trata.";
  if (String(relato ?? "").trim().length < RELATO_MINIMO) e.relato = `Cuéntanos qué pasó (al menos ${RELATO_MINIMO} caracteres).`;
  return e;
}

// Liga del buzón para compartir. origen: window.location.origin.
export const urlBuzon = (origen, ruta) => `${String(origen ?? "").replace(/\/$/, "")}${ruta}`;
export function textoCompartirBuzon(empresa, url) {
  return `Buzón confidencial de ${empresa || "la empresa"}: si viviste o viste violencia, acoso o malos tratos en el trabajo, puedes contarlo aquí sin dar tu nombre. ${url}`;
}
export const ligaWhatsapp = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

// ───────── analítica ─────────
// Celda del mapa de calor: tono por % favorable (mismos cortes que el dashboard: 75 alto, 60 bajo) y texto alterno.
export function tonoCelda(favorable) {
  if (favorable === null || favorable === undefined) return { fondo: "#F1F5F9", tinta: "#64748B" };
  if (favorable >= 75) return { fondo: "#DCFCE7", tinta: "#166534" };
  if (favorable >= 60) return { fondo: "#FEF9C3", tinta: "#854D0E" };
  return { fondo: "#FEE2E2", tinta: "#991B1B" };
}

export function textoCelda(grupo, dimension, celda) {
  if (celda?.favorable === null || celda?.favorable === undefined) return `${grupo}, ${dimension}: sin dato`;
  const dif = celda.diferencia;
  const vs = dif === null || dif === undefined ? "" : dif === 0 ? ", igual que la empresa" : `, ${Math.abs(dif)} puntos ${dif > 0 ? "arriba" : "abajo"} de la empresa`;
  return `${grupo}, ${dimension}: ${celda.favorable} % favorable${vs}`;
}

export function textoImpulsor(d) {
  if (d.correlacion === null || d.correlacion === undefined) return "Sin datos suficientes";
  const r = Math.abs(d.correlacion);
  const fuerza = r >= 0.6 ? "mucho" : r >= 0.4 ? "bastante" : r >= 0.2 ? "algo" : "poco";
  return d.correlacion >= 0 ? `Mueve ${fuerza} el compromiso` : `Va en contra del compromiso (${fuerza})`;
}

// ───────── riesgo de rotación ─────────
export const NIVEL_RIESGO = Object.freeze({
  alto: { texto: "Alto", clase: "bg-red-100 text-red-800", barra: "#DC2626" },
  medio: { texto: "Medio", clase: "bg-amber-100 text-amber-900", barra: "#D97706" },
  bajo: { texto: "Bajo", clase: "bg-green-100 text-green-800", barra: "#16A34A" },
});

// ───────── ciclo de vida ─────────
export const CICLOS = Object.freeze({
  ingreso30: { titulo: "Ingreso · 30 días", cuando: "Se manda sola 30 días después de la fecha de alta." },
  ingreso90: { titulo: "Ingreso · 90 días", cuando: "Se manda sola 90 días después de la fecha de alta." },
  salida: { titulo: "Encuesta de salida", cuando: "Se manda sola al registrar la baja. No detiene ni cambia la baja." },
});

// Fecha civil de hoy en la Ciudad de México (YYYY-MM-DD).
export const hoyMx = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
