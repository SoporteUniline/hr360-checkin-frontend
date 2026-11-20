import axios from "axios";
import Cookies from "js-cookie";

// (20/11/2026) El backend ya pide sesión en catálogos (festivos, departamentos, unidades de negocio…)
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
  axios.interceptors.request.use(agregarTokenAlBackend);
}

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_RUTA_BACKEND,
  headers: {
    "Content-Type": "application/json",
  },
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

export default instance;
