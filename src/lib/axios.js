import axios from "axios";
import Cookies from "js-cookie";
import { fetchSeguro } from "./fetchSeguro.mjs";

let offlineReady;
export function ensureOfflineCache() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!offlineReady) offlineReady = import(/* webpackIgnore: true */ '/offline-clock/app-cache.mjs?v=5')
    .then(module => { module.installOfflineFetch(process.env.NEXT_PUBLIC_RUTA_BACKEND); return module; })
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

if (typeof window !== 'undefined') {
  axios.defaults.adapter = 'fetch';
  // fetch que no deja pasar DOMException a axios (ver./fetchSeguro.mjs).
  axios.defaults.env = { ...(axios.defaults.env || {}), fetch: fetchSeguro };
  axios.interceptors.request.use(async config => { await ensureOfflineCache(); return agregarTokenAlBackend(config); });
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

instance.interceptors.request.use(async (config) => {
  await ensureOfflineCache();
  const token = Cookies.get("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default instance;
