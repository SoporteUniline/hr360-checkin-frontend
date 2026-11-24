// Candidato de WhatsApp en el proceso de selección. Reglas puras de las pantallas del chat y de Reclutamiento:
// etapas rápidas, sugerencia del agente, aviso por WhatsApp (texto prellenado y ventana de 24 h), atajos de teclado y el
// filtro de la bandeja. Sin React ni red: lo prueba scripts/test-proceso-whatsapp.mjs. El servidor decide y valida todo
// (docs/candidato-whatsapp.md del backend); aquí solo se arma lo que ve y confirma RH.

// Etapas del servidor (español) en el orden del proceso.
export const ETAPAS = [
  { id: "nuevo", texto: "Nuevo", tono: "azul" },
  { id: "revision", texto: "En revisión", corto: "Revisión", tono: "violeta" },
  { id: "entrevista", texto: "Entrevista", tono: "ambar" },
  { id: "oferta", texto: "Oferta", tono: "azul" },
  { id: "contratado", texto: "Contratado", tono: "verde" },
  { id: "descartado", texto: "Descartado", tono: "gris" },
];
// Las que RH elige con un clic en el selector rápido (Contratar y Descartar tienen su propio paso).
export const ETAPAS_RAPIDAS = ["nuevo", "revision", "entrevista", "oferta"];

export const etapa = (id) => ETAPAS.find((e) => e.id === id) ?? null;
export const textoEtapa = (id) => etapa(id)?.texto ?? "Sin proceso";
export const cerrada = (id) => id === "contratado" || id === "descartado";

// Siguiente etapa del selector rápido (Nuevo → Revisión → Entrevista → Oferta). Desde Oferta, null (sigue Contratar).
export function siguienteEtapa(id) {
  const i = ETAPAS_RAPIDAS.indexOf(id);
  return i >= 0 && i < ETAPAS_RAPIDAS.length - 1 ? ETAPAS_RAPIDAS[i + 1] : null;
}

// Qué puede hacer RH con la persona en esta etapa.
export function acciones(id) {
  if (id === "contratado") return { mover: false, descartar: false, contratar: false, reabrir: false };
  if (id === "descartado") return { mover: true, descartar: false, contratar: false, reabrir: true };
  return { mover: true, descartar: true, contratar: true, reabrir: false };
}

// Sugerencia del agente (la manda el servidor solo si sigue vigente). → texto corto para el botón de un clic.
export function textoSugerencia(sugerencia) {
  if (!sugerencia?.etapa || !etapa(sugerencia.etapa)) return null;
  return `El agente sugiere pasar a «${textoEtapa(sugerencia.etapa)}»`;
}

// ——— Aviso por WhatsApp ———
export const TIPOS_AVISO = ["contratado", "descartado", "oferta"];
const primerNombre = (n) => String(n ?? "").trim().split(/\s+/)[0] || "";
const fechaLarga = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso ?? ""))) return "";
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
};

// Texto prellenado (RH lo edita antes de enviarlo). datos: { nombre, vacante, empresa, fechaIngreso, sucursal }.
export function textoAviso(tipo, { nombre, vacante, empresa, fechaIngreso, sucursal } = {}) {
  const hola = primerNombre(nombre) ? `¡Hola, ${primerNombre(nombre)}!` : "¡Hola!";
  const puesto = vacante ? `«${vacante}»` : "la vacante";
  const en = empresa ? ` en ${empresa}` : "";
  if (tipo === "contratado") {
    const fecha = fechaLarga(fechaIngreso);
    return [
      `${hola} Nos da mucho gusto confirmarte que quedaste contratado(a) para ${puesto}${en}. 🎉`,
      fecha ? `Tu fecha de ingreso es el ${fecha}${sucursal ? ` en la sucursal ${sucursal}` : ""}.` : null,
      "En breve te compartimos los detalles de tu primer día. ¡Bienvenido(a) al equipo!",
    ].filter(Boolean).join("\n\n");
  }
  if (tipo === "oferta") {
    return `${hola} Tenemos buenas noticias: queremos ofrecerte el puesto de ${puesto}${en}. ¿Te podemos llamar hoy para platicarte los detalles?`;
  }
  if (tipo === "descartado") {
    return `${hola} Gracias por tu interés en ${puesto}${en} y por tu tiempo. En esta ocasión decidimos continuar con otros perfiles. Te deseamos mucho éxito y guardamos tus datos para futuras oportunidades.`;
  }
  return "";
}

// Cómo se le puede avisar. ventanaAbierta: le escribió en las últimas 24 h. plantilla: nombre de la plantilla de
// seguimiento de la empresa o null. → { via: "texto" | "plantilla" | null, nota }
export function modoAviso({ ventanaAbierta, plantilla } = {}) {
  if (ventanaAbierta) return { via: "texto", nota: "Le llega como mensaje tuyo en este chat." };
  if (plantilla) {
    return {
      via: "plantilla",
      nota: `Pasaron más de 24 horas desde su último mensaje: WhatsApp solo permite la plantilla «${plantilla}» (no se puede escribir texto libre).`,
    };
  }
  return { via: null, nota: "Pasaron más de 24 horas desde su último mensaje y tu empresa no tiene plantilla de seguimiento: WhatsApp no permite escribirle." };
}

// Cuerpo de POST /whatsapp/conversaciones/:id/aviso-proceso. Solo se arma cuando RH confirma (botón «Enviar aviso»).
export function cuerpoAviso({ tipo, texto, via }) {
  return via === "plantilla" ? { tipo, via: "plantilla", confirmado: true } : { tipo, texto: String(texto ?? "").trim(), confirmado: true };
}
export const avisoValido = ({ via, texto }) => via === "plantilla" || (via === "texto" && String(texto ?? "").trim().length > 0 && String(texto).trim().length <= 4096);

// ——— Atajos de teclado (escritorio) ———
// Alt+Mayús+…: N nota, E siguiente etapa, A aceptar sugerencia, C contratar, D descartar. Nunca mientras se escribe en un
// campo (el cuadro del chat usa las mismas teclas).
export const ATAJOS = [
  { accion: "nota", tecla: "N", texto: "Agregar nota" },
  { accion: "siguiente", tecla: "E", texto: "Siguiente etapa" },
  { accion: "sugerencia", tecla: "A", texto: "Aceptar sugerencia" },
  { accion: "contratar", tecla: "C", texto: "Contratar" },
  { accion: "descartar", tecla: "D", texto: "Descartar" },
];
export function atajo({ code, altKey, shiftKey, ctrlKey, metaKey, enCampo }) {
  if (enCampo || !altKey || !shiftKey || ctrlKey || metaKey) return null;
  const letra = /^Key([A-Z])$/.exec(String(code ?? ""))?.[1];
  return ATAJOS.find((a) => a.tecla === letra)?.accion ?? null;
}
export const textoAtajo = (accion) => {
  const a = ATAJOS.find((x) => x.accion === accion);
  return a ? `Alt+Mayús+${a.tecla}` : "";
};

// ——— Bandeja: filtro por etapa ———
export const FILTROS_ETAPA = [{ valor: "", texto: "Todas las etapas" }, ...ETAPAS.map((e) => ({ valor: e.id, texto: e.texto }))];
export const paramsEtapa = (valor) => (ETAPAS.some((e) => e.id === valor) ? { etapa: valor } : {});
