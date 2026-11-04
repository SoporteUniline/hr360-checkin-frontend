import axios from "axios";
import Cookies from "js-cookie";

let offlineReady;
export function ensureOfflineCache() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!offlineReady) offlineReady = import(/* webpackIgnore: true */ '/offline-clock/app-cache.mjs?v=4')
    .then(module => { module.installOfflineFetch(process.env.NEXT_PUBLIC_RUTA_BACKEND); return module; })
    .catch(() => { offlineReady = null; });
  return offlineReady;
}
if (typeof window !== 'undefined') {
  axios.defaults.adapter = 'fetch';
  axios.interceptors.request.use(async config => { await ensureOfflineCache(); return config; });
}

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_RUTA_BACKEND,
  headers: {
    "Content-Type": "application/json",
  },
  ...(typeof window !== 'undefined' ? { adapter: 'fetch' } : {}),
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
