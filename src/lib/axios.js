import axios from "axios";
import Cookies from "js-cookie";
import { fetchSeguro } from "./fetchSeguro.mjs";
import { demoBasePath, rutaDeInstancia } from "./demo-base-path.mjs";
import { esSesionCerrada, RUTA_LOGIN_SESION_CERRADA } from "./passkeys/modelo.mjs";
import { alResponderAxios } from "./asistencia/refrescoAsistencias";
import { debeAvisarSinCreditos, EVENTO_SIN_CREDITOS, MENSAJE_SIN_CREDITOS } from "./ia/creditos.mjs";

let offlineReady;
export function ensureOfflineCache() {
  if (typeof window === 'undefined' || demoBasePath) return Promise.resolve();
  if (!offlineReady) offlineReady = import(/* webpackIgnore: true */ '/offline-clock/app-cache.mjs?v=5')
    .catch(() => { offlineReady = null; });
  return offlineReady;
}
// El backend ya pide sesión en catálogos (festivos, departamentos, unidades de negocio…)
// y en la ficha del empleado. Las pantallas que usan `axios` directo (no la instancia de abajo) también
// mandan el token, pero solo cuando la petición va a nuestro backend y no trae ya su Authorization.
function agregarTokenAlBackend(config) {
  const backend = process.env.NEXT_PUBLIC_RUTA_BACKEND;
  const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
  const token = Cookies.get("token");
  if (token && backend && url.startsWith(backend) && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

// (25/11/2026) Sesión cerrada desde el servidor (otro dispositivo cerró «en todos», se quitó la passkey, baja, cambio de
// contraseña): 401 SESION_REVOCADA / SESION_EXPIRADA → se borra el token y se va al login con aviso. Los demás 401 y los
// 503 (servidor caído) siguen como antes. Ver docs/passkeys-sesiones.md.
let saliendo = false;
// (24/12/2026) Sin créditos de Adamia AI (402 IA_SIN_CREDITOS) en cualquier pantalla con IA: se avisa una vez con
// «Recargar créditos» (components/ia/AvisoSinCreditos). El error sigue su camino: cada pantalla muestra además su mensaje.
function avisarSinCreditos(error) {
  try {
    if (typeof window !== "undefined" && debeAvisarSinCreditos(error, window.location.pathname)) {
      window.dispatchEvent(new CustomEvent(EVENTO_SIN_CREDITOS, { detail: { mensaje: error.response.data?.error || MENSAJE_SIN_CREDITOS } }));
    }
  } catch { /* el aviso nunca rompe la respuesta */ }
}
function alCerrarseLaSesion(error) {
  avisarSinCreditos(error);
  const r = error?.response;
  if (typeof window !== "undefined" && !saliendo && esSesionCerrada(r?.status, r?.data)) {
    Cookies.remove("token");
    delete instance.defaults.headers.common.Authorization;
    if (!window.location.pathname.startsWith("/login")) {
      saliendo = true;
      window.location.assign(rutaDeInstancia(RUTA_LOGIN_SESION_CERRADA));
    }
  }
  return Promise.reject(error);
}

// (25/11/2026) Un guardado que cambia asistencias (de cualquier pantalla: Asistencias, Monitor, Incidencias, Permisos,
// Turnos extra, registro masivo…) recarga TODO lo que depende de ellas, no solo la tabla (lib/asistencia/refrescoAsistencias.js).
function alResponder(r) {
  try { alResponderAxios(r?.config); } catch { /* el aviso nunca rompe la respuesta */ }
  return r;
}

if (typeof window !== 'undefined') {
  axios.interceptors.response.use(alResponder, alCerrarseLaSesion);
  axios.defaults.adapter = 'fetch';
  // fetch que no deja pasar DOMException a axios (ver./fetchSeguro.mjs).
  axios.defaults.env = { ...(axios.defaults.env || {}), fetch: fetchSeguro };
  axios.interceptors.request.use(agregarTokenAlBackend);
}

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_RUTA_BACKEND,
  headers: {
    "Content-Type": "application/json",
  },
  ...(typeof window !== 'undefined' ? { adapter: 'fetch', env: { ...(axios.defaults.env || {}), fetch: fetchSeguro } } : {}),
});

export const setAuthToken = (token) => {
  if (token) {
    instance.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.common.Authorization;
  }
};

instance.interceptors.request.use((config) => {
  const token = Cookies.get("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
instance.interceptors.response.use(typeof window !== "undefined" ? alResponder : (r) => r, alCerrarseLaSesion);

export default instance;
