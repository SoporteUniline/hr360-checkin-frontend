// Llamadas al API de passkeys y sesiones (25/11/2026). Ver docs/passkeys-sesiones.md.
// SimpleWebAuthn (navegador) se carga solo al usarse: no pesa en las demás pantallas.
import axios from "@/lib/axios";

const cargar = () => import("@simplewebauthn/browser");

/** Entrar con passkey (sin correo: el teléfono ofrece las cuentas guardadas). → { token, tipo_usuario, esEmpleado } */
export async function entrarConPasskey() {
  const { startAuthentication } = await cargar();
  const { data } = await axios.post("/auth/passkeys/login/opciones", {});
  const respuesta = await startAuthentication({ optionsJSON: data.opciones });
  const { data: sesion } = await axios.post("/auth/passkeys/login/verificar", { respuesta });
  return sesion;
}

/** Activar Face ID / huella en este dispositivo (con sesión). → { ok, passkey } */
export async function activarPasskey(nombre) {
  const { startRegistration } = await cargar();
  const { data } = await axios.post("/auth/passkeys/registro/opciones", {});
  const respuesta = await startRegistration({ optionsJSON: data.opciones });
  const { data: creada } = await axios.post("/auth/passkeys/registro/verificar", { respuesta, ...(nombre ? { nombre } : {}) });
  return creada;
}

export const listarPasskeys = () => axios.get("/auth/passkeys").then((r) => r.data);
export const renombrarPasskey = (id, nombre) => axios.patch(`/auth/passkeys/${id}`, { nombre }).then((r) => r.data);
export const quitarPasskey = (id) => axios.delete(`/auth/passkeys/${id}`).then((r) => r.data);
export const listarSesiones = () => axios.get("/auth/sesiones").then((r) => r.data);
export const cerrarSesionPorId = (id) => axios.delete(`/auth/sesiones/${id}`).then((r) => r.data);
export const cerrarTodasLasSesiones = () => axios.post("/auth/sesiones/cerrar-todas", {}).then((r) => r.data);

/**
 * «Cerrar sesión»: avisa al servidor para que cierre ESTA sesión (no espera la respuesta ni falla si no hay red).
 * keepalive: la petición sale aunque la página navegue al login enseguida.
 */
export function avisarCierreDeSesion(token) {
  const backend = process.env.NEXT_PUBLIC_RUTA_BACKEND;
  if (!token || !backend || typeof fetch !== "function") return Promise.resolve();
  return fetch(`${backend}/auth/sesiones/cerrar`, {
    method: "POST",
    keepalive: true,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  }).catch(() => {});
}
