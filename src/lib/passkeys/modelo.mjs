// Passkeys (Face ID / huella) y sesiones revocables · lógica sin React (25/11/2026). Ver docs/passkeys-sesiones.md.
// Pruebas: scripts/test-passkeys.mjs.

/** Plataforma por User-Agent: 'ios' | 'android' | 'escritorio'. */
export function plataformaDe(userAgent = "", puntosTactiles = 0) {
  const ua = String(userAgent);
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS 13+ se presenta como Mac; con pantalla táctil es un iPad.
  if (/Macintosh/i.test(ua) && Number(puntosTactiles) > 1) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "escritorio";
}

/** Payload del JWT (solo para leer correo y tipo en este dispositivo; la validez la decide el servidor). */
export function payloadDeToken(token) {
  try {
    const parte = String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const binario = atob(parte + "===".slice((parte.length + 3) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}

/** Cómo se llama el método en cada plataforma. */
export function nombreMetodo(plataforma) {
  if (plataforma === "ios") return "Face ID";
  if (plataforma === "android") return "huella";
  return "passkey";
}

/** Texto del botón de la pantalla de inicio. */
export function textoBotonEntrar(plataforma) {
  if (plataforma === "ios") return "Entrar con Face ID";
  if (plataforma === "android") return "Entrar con huella";
  return "Entrar con tu passkey";
}

/** Título de la hoja que ofrece activarlo después de entrar con contraseña. */
export function tituloOferta(plataforma) {
  if (plataforma === "ios") return "¿Activar Face ID para entrar más rápido?";
  if (plataforma === "android") return "¿Activar tu huella para entrar más rápido?";
  return "¿Activar una passkey para entrar más rápido?";
}

const CANCELADO = "Se canceló o se agotó el tiempo. Puedes intentarlo otra vez o entrar con tu contraseña.";

/**
 * Mensaje claro para cualquier falla (del navegador o del servidor). Nunca deja al usuario sin salida: siempre
 * menciona la contraseña.
 */
export function mensajeFalla(error, { plataforma = "escritorio", accion = "entrar" } = {}) {
  const metodo = nombreMetodo(plataforma);
  const delServidor = error?.response?.data?.error;
  const codigo = error?.response?.data?.code;
  if (codigo === "PASSKEYS_NO_DISPONIBLE") return delServidor;
  if (delServidor) return delServidor;
  if (error?.response?.status === 429) return "Demasiados intentos. Espera unos minutos o entra con tu contraseña.";
  const nombre = error?.name || error?.cause?.name || "";
  const codigoNavegador = error?.code || "";
  if (nombre === "NotAllowedError" || nombre === "AbortError" || codigoNavegador === "ERROR_CEREMONY_ABORTED") return CANCELADO;
  if (nombre === "InvalidStateError" || codigoNavegador === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
    return accion === "activar" ? `Este dispositivo ya tiene ${metodo} activado para tu cuenta.` : CANCELADO;
  }
  if (nombre === "NotSupportedError" || nombre === "SecurityError" || codigoNavegador === "ERROR_INVALID_DOMAIN" || /WebAuthn is not supported/i.test(error?.message || "")) {
    return `Este dispositivo o navegador no permite usar ${metodo} con ADAMIA. Entra con tu contraseña.`;
  }
  if (!error?.response && /network|fetch|Failed to fetch/i.test(error?.message || "")) {
    return "Sin conexión con ADAMIA. Revisa tu internet o entra con tu contraseña.";
  }
  return accion === "activar"
    ? `No pudimos activar ${metodo}. Intenta de nuevo más tarde.`
    : `No pudimos entrar con ${metodo}. Entra con tu contraseña.`;
}

// --- Sesión cerrada desde el servidor ---
export const CODIGOS_SESION_CERRADA = ["SESION_REVOCADA", "SESION_EXPIRADA"];
export function esSesionCerrada(status, datos) {
  return Number(status) === 401 && CODIGOS_SESION_CERRADA.includes(datos?.code);
}
export const RUTA_LOGIN_SESION_CERRADA = "/login?aviso=sesion-cerrada";
export function avisoLogin(aviso) {
  return aviso === "sesion-cerrada" ? "Tu sesión se cerró. Vuelve a iniciar sesión." : null;
}

// --- Oferta «¿Activar Face ID?» después de entrar con contraseña (solo en este dispositivo) ---
export const CLAVE_OFRECER = "adamia_ofrecer_passkey"; // sessionStorage: recién entró con contraseña
export const CLAVE_NO_PREGUNTAR = "adamia_passkey_no_preguntar"; // localStorage: «No volver a preguntar»
export const CLAVE_ACTIVADA = "adamia_passkey_activada"; // localStorage: cuentas que ya lo activaron aquí
export const CLAVE_POSPUESTA = "adamia_passkey_ahora_no"; // localStorage: «Ahora no» (vuelve a preguntar en 7 días)
const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

export const cuentaLocal = (usuario) =>
  usuario?.correo ? `${usuario.esEmpleado ? "e" : usuario.esAcceso ? "a" : "u"}:${String(usuario.correo).toLowerCase()}` : null;

const leerLista = (storage, clave) => {
  try {
    const v = JSON.parse(storage?.getItem(clave) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const leerMapa = (storage, clave) => {
  try {
    const v = JSON.parse(storage?.getItem(clave) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};

/** ¿Se muestra la hoja? Solo justo después de entrar con contraseña, con soporte y si no la descartó. */
export function debeOfrecer({ local, sesion, usuario, soporta, ahora = Date.now() }) {
  const cuenta = cuentaLocal(usuario);
  if (!cuenta || !soporta) return false;
  if (sesion?.getItem(CLAVE_OFRECER) !== "1") return false;
  if (local?.getItem(CLAVE_NO_PREGUNTAR) === "1") return false;
  if (leerLista(local, CLAVE_ACTIVADA).includes(cuenta)) return false;
  const pospuesta = Number(leerMapa(local, CLAVE_POSPUESTA)[cuenta] || 0);
  return !(pospuesta && ahora - pospuesta < SIETE_DIAS);
}

export function marcarActivada(local, usuario) {
  const cuenta = cuentaLocal(usuario);
  if (!cuenta) return;
  const lista = leerLista(local, CLAVE_ACTIVADA).filter((c) => c !== cuenta);
  local?.setItem(CLAVE_ACTIVADA, JSON.stringify([...lista, cuenta].slice(-10)));
}
export function marcarQuitada(local, usuario) {
  const cuenta = cuentaLocal(usuario);
  if (!cuenta) return;
  local?.setItem(CLAVE_ACTIVADA, JSON.stringify(leerLista(local, CLAVE_ACTIVADA).filter((c) => c !== cuenta)));
}
export function posponer(local, usuario, ahora = Date.now()) {
  const cuenta = cuentaLocal(usuario);
  if (!cuenta) return;
  local?.setItem(CLAVE_POSPUESTA, JSON.stringify({ ...leerMapa(local, CLAVE_POSPUESTA), [cuenta]: ahora }));
}

// --- Pantalla de seguridad ---
export function fechaCorta(valor, ahora = new Date()) {
  if (!valor) return "Nunca";
  // El backend manda «YYYY-MM-DD HH:mm:ss» en hora del servidor (México).
  const texto = String(valor).replace(" ", "T");
  const fecha = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(texto) ? texto : `${texto}-06:00`);
  if (Number.isNaN(fecha.getTime())) return "—";
  const minutos = Math.round((ahora - fecha) / 60000);
  if (minutos < 1) return "Ahora";
  if (minutos < 60) return `Hace ${minutos} min`;
  const opciones = { timeZone: "America/Mexico_City" };
  const dia = (d) => d.toLocaleDateString("es-MX", { ...opciones, day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = fecha.toLocaleTimeString("es-MX", { ...opciones, hour: "2-digit", minute: "2-digit", hour12: true });
  if (dia(fecha) === dia(ahora)) return `Hoy, ${hora}`;
  return `${fecha.toLocaleDateString("es-MX", { ...opciones, day: "numeric", month: "short", year: "numeric" })}`;
}

export function rutaSeguridad(usuario) {
  if (usuario?.tipo_usuario === "Empleado") return "/empleado/panel/seguridad";
  if (usuario?.tipo_usuario === "Admin") return "/dashboard/seguridad";
  return "/panel/seguridad";
}
