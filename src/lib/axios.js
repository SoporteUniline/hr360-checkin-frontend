import axios from "axios";
import Cookies from "js-cookie";

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
