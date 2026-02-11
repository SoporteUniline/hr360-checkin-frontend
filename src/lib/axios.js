import axios from "axios";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_RUTA_BACKEND,
  headers: { "Content-Type": "application/json" },
});

export const setAuthToken = (token) => {
  if (token) {
    instance.defaults.headers.Authorization = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.Authorization;
  }
};

export default instance;
