// Llamadas al API de passkeys y sesiones (25/11/2026). Ver docs/passkeys-sesiones.md.
// SimpleWebAuthn (navegador) se carga solo al usarse: no pesa en las demás pantallas.
import axios from "@/lib/axios";
import { conLlaveRecordada, llaveRecordada, olvidarLlave, recordarLlave } from "./modelo.mjs";

const almacen = () => (typeof window !== "undefined" ? window.localStorage : null);

const cargar = () => import("@simplewebauthn/browser");

/** Entrar con passkey (sin correo: el teléfono ofrece las cuentas guardadas). → { token, tipo_usuario, esEmpleado } */
export async function entrarConPasskey() {
  const { startAuthentication } = await cargar();
  const { data } = await axios.post("/auth/passkeys/login/opciones", {});
  // Con llave recordada en este dispositivo: directo a Face ID / huella (como las apps de banco).
  const llave = llaveRecordada(almacen());
  let respuesta;
  try {
    respuesta = await startAuthentication({ optionsJSON: conLlaveRecordada(data.opciones, llave) });
  } catch (e) {
    // La llave recordada ya no está en este dispositivo (se borró del teléfono): olvidarla; el siguiente intento ofrece la lista.
    if (llave && e?.name === "NotAllowedError") olvidarLlave(almacen());
    throw e;
  }
  let sesion;
  try {
    ({ data: sesion } = await axios.post("/auth/passkeys/login/verificar", { respuesta }));
  } catch (e) {
    // El servidor no la reconoce (la quitaron en «Seguridad»): olvidarla.
    if (e?.response?.status === 401 || e?.response?.status === 404) olvidarLlave(almacen());
    throw e;
  }
  recordarLlave(almacen(), respuesta?.id);
  return sesion;
}

/** Activar Face ID / huella en este dispositivo (con sesión). → { ok, passkey } */
export async function activarPasskey(nombre) {
  const { startRegistration } = await cargar();
  const { data } = await axios.post("/auth/passkeys/registro/opciones", {});
  const respuesta = await startRegistration({ optionsJSON: data.opciones });
  const { data: creada } = await axios.post("/auth/passkeys/registro/verificar", { respuesta, ...(nombre ? { nombre } : {}) });
  recordarLlave(almacen(), respuesta?.id);
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
