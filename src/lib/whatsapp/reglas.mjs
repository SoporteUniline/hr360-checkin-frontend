// Reglas de pantalla de WhatsApp (R1): quién puede escribir, textos de estado y errores del API.
// El backend es quien decide; esto solo evita ofrecer acciones que el servidor va a rechazar.
import { leerIncluidas } from "./paquete.mjs";

export const LIMITE_TEXTO = 4096;
export const MENSAJE_VENTANA =
  "Pasaron más de 24 h desde el último mensaje del candidato: WhatsApp no permite escribirle libremente. Usa «Enviar seguimiento» para mandarle una plantilla aprobada; cuando conteste, el chat se reabre.";
export const MENSAJE_APAGADO = "WhatsApp no está activado para tu empresa. Pídele a ADAMIA que lo active.";
export const MENSAJE_SIN_NUMERO = "Tu empresa todavía no tiene un número de WhatsApp listo. Pídele a ADAMIA que lo configure.";
export const MENSAJE_NO_REINTENTABLE = "Este mensaje ya no se puede reintentar. Escribe uno nuevo si hace falta.";
export const MENSAJE_CUENTA_DUPLICADA = "Esa cuenta de Zernio ya la usa otra empresa.";
// R3: agenda y seguimiento.
export const MENSAJE_SIN_CUPO = "Ese horario ya se llenó. Elige otro de la lista.";
export const MENSAJE_VENTANA_ABIERTA = "El chat sigue abierto (el candidato escribió en las últimas 24 h): escríbele directamente, no hace falta plantilla.";
export const MENSAJE_SIN_PLANTILLA =
  "No hay plantilla de seguimiento configurada. Escribe su nombre en «Agente → Agenda y recordatorios»; debe estar aprobada en Zernio/Meta.";
export const MENSAJE_SIN_CONTROL = "Otra persona tiene el control de esta conversación. Pídele que la devuelva o espera a que la IA la retome.";

// Dueño de la cuenta: reclutador principal (no un «usuario con acceso»). Puede escribir aunque otro tenga el control.
export const esDuenoCuenta = (usuario) => usuario?.tipo_usuario === "Recruiter" && !usuario?.esAcceso;

const mismoUsuario = (a, b) => a != null && b != null && String(a) === String(b);
const correoDe = (x) => String(x?.correo ?? x?.email ?? "").trim().toLowerCase();

// ¿El usuario controla la conversación? Los usuarios invitados comparten el id_usuario del dueño, así que cuando el
// control trae correo también debe coincidir. Sin correo se compara solo el id. El servidor decide (403 WA_SIN_CONTROL).
export function controlaConversacion(conversacion, usuario) {
  if (conversacion?.modo !== "humano") return false;
  const control = conversacion?.control;
  if (!mismoUsuario(control?.id_usuario, usuario?.id_usuario)) return false;
  const correoControl = correoDe(control);
  return !correoControl || correoControl === correoDe(usuario);
}

// Estado del cuadro para escribir: { puede, motivo }. El motivo explica por qué está bloqueado.
export function permisoEscribir(conversacion, usuario) {
  if (!conversacion) return { puede: false, motivo: "" };
  if (conversacion.modo !== "humano") {
    return { puede: false, motivo: "La IA está atendiendo esta conversación. Toma el control para escribir tú." };
  }
  if (!controlaConversacion(conversacion, usuario) && !esDuenoCuenta(usuario)) {
    const quien = conversacion.control?.nombre ? `${conversacion.control.nombre} tiene` : "Otra persona tiene";
    return { puede: false, motivo: `${quien} el control de esta conversación.` };
  }
  if (conversacion.ventana_abierta === false) return { puede: false, motivo: MENSAJE_VENTANA, ventanaCerrada: true };
  return { puede: true, motivo: "" };
}

// Botones de control que se ofrecen: «Tomar control» cuando atiende la IA; «Devolver a IA» a quien la controla o al dueño.
export function accionesControl(conversacion, usuario) {
  if (!conversacion) return { tomar: false, devolver: false };
  if (conversacion.modo !== "humano") return { tomar: true, devolver: false };
  return { tomar: false, devolver: controlaConversacion(conversacion, usuario) || esDuenoCuenta(usuario) };
}

// Chip de la lista: quién atiende.
export function etiquetaControl(conversacion, usuario) {
  if (conversacion?.modo !== "humano") return { texto: "IA", tono: "violeta" };
  if (controlaConversacion(conversacion, usuario)) return { texto: "Tú tienes el control", tono: "azul" };
  return { texto: conversacion?.control?.nombre ? `Atiende ${conversacion.control.nombre}` : "Atiende una persona", tono: "gris" };
}

const ESTADOS = {
  recibido: "Recibido",
  enviando: "Enviando…",
  enviado: "Enviado",
  entregado: "Entregado",
  leido: "Leído",
  fallido: "No enviado",
};
export const etiquetaEstado = (estado) => ESTADOS[estado] ?? "";

// Texto de un mensaje que no es de texto (R1 aún no muestra archivos).
export const textoArchivo = (tipo) => `[Archivo: ${tipo || "desconocido"}] (se mostrará en una siguiente etapa)`;

// Etiqueta pequeña sobre las burbujas que no son del candidato. Con R2 el agente firma con su nombre si se conoce.
export function etiquetaActor(mensaje, nombreAsistente = "") {
  if (mensaje?.actor === "ia") return String(nombreAsistente ?? "").trim() || "Asistente IA";
  if (mensaje?.actor === "sistema") return "Sistema";
  if (mensaje?.actor === "reclutador") return mensaje?.usuario?.nombre || "Reclutador";
  return "";
}

// Vista previa del último mensaje en la lista.
export function vistaPrevia(ultimo) {
  if (!ultimo) return "Sin mensajes todavía";
  const texto = String(ultimo.texto ?? "").replace(/\s+/g, " ").trim() || "[Archivo]";
  return ultimo.direccion === "saliente" ? `Enviado: ${texto}` : texto;
}

// Mensaje entendible a partir de un error de axios del API de WhatsApp.
export function mensajeErrorApi(error, porDefecto = "No se pudo completar la acción. Intenta de nuevo.") {
  const respuesta = error?.response;
  if (!respuesta) return error?.code === "ERR_NETWORK" || error?.message === "Network Error"
    ? "Sin conexión con el servidor. Revisa tu internet e intenta de nuevo."
    : porDefecto;
  const datos = respuesta.data ?? {};
  switch (datos.codigo) {
    case "WA_SIN_CONTROL": return MENSAJE_SIN_CONTROL;
    case "WA_VENTANA_CERRADA": return MENSAJE_VENTANA;
    case "WA_APAGADO": return MENSAJE_APAGADO;
    case "WA_SIN_NUMERO": return MENSAJE_SIN_NUMERO;
    case "WA_NO_REINTENTABLE": return MENSAJE_NO_REINTENTABLE;
    case "WA_CUENTA_DUPLICADA": return MENSAJE_CUENTA_DUPLICADA;
    case "WA_SIN_CUPO": return MENSAJE_SIN_CUPO;
    case "WA_VENTANA_ABIERTA": return MENSAJE_VENTANA_ABIERTA;
    case "WA_SIN_PLANTILLA": return MENSAJE_SIN_PLANTILLA;
    default: break;
  }
  return datos.error || datos.mensaje || datos.message || porDefecto;
}

// Validación del formulario de administración (espejo de la del API, que es la que manda).
export const MODOS = [
  { valor: "apagado", texto: "Apagado" },
  { valor: "compartido", texto: "Número compartido de ADAMIA" },
  { valor: "propio", texto: "Número propio de la empresa" },
];
export const textoModo = (modo) => MODOS.find((m) => m.valor === modo)?.texto ?? "Apagado";

const numeroONulo = (v) => {
  const t = String(v ?? "").trim().replace(/[$,\s]/g, "");
  return t === "" ? null : Number(t);
};
const textoONulo = (v) => {
  const t = String(v ?? "").trim();
  return t === "" ? null : t;
};

// Devuelve { errores: {campo: texto}, cuerpo } con el cuerpo listo para PUT /admin/empresas/:id.
// Paquetes (27/11/2026): precio_mensual = precio del paquete; precio_conversacion = precio por entrevista extra;
// entrevistas_incluidas = entrevistas incluidas al mes (vacío = sin paquete).
export function validarConfigEmpresa(form) {
  const incluidas = leerIncluidas(form?.entrevistas_incluidas);
  const cuerpo = {
    modo: form?.modo,
    zernio_account_id: textoONulo(form?.zernio_account_id),
    numero_whatsapp: textoONulo(form?.numero_whatsapp)?.replace(/\D/g, "") || null,
    precio_conversacion: numeroONulo(form?.precio_conversacion),
    precio_mensual: numeroONulo(form?.precio_mensual),
    entrevistas_incluidas: incluidas.error ? null : incluidas.valor,
  };
  const errores = {};
  if (incluidas.error) errores.entrevistas_incluidas = incluidas.error;
  if (!MODOS.some((m) => m.valor === cuerpo.modo)) errores.modo = "Elige cómo funciona WhatsApp para esta empresa.";
  if (cuerpo.modo === "propio") {
    if (!cuerpo.zernio_account_id) errores.zernio_account_id = "Con número propio, escribe el ID de la cuenta de Zernio.";
    if (!cuerpo.numero_whatsapp) errores.numero_whatsapp = "Con número propio, escribe el número de WhatsApp.";
  }
  if (cuerpo.numero_whatsapp && !/^\d{10,15}$/.test(cuerpo.numero_whatsapp)) errores.numero_whatsapp = "Escribe el número con lada, de 10 a 15 dígitos.";
  for (const campo of ["precio_conversacion", "precio_mensual"]) {
    const v = cuerpo[campo];
    if (v !== null && (!Number.isFinite(v) || v < 0)) errores[campo] = "Escribe un precio válido (0 o más).";
  }
  return { errores, cuerpo };
}

export const formatearPrecio = (v) =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v))
    ? "—"
    : Number(v).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
