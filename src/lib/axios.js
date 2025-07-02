import axios from "axios";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_RUTA_BACKEND,
  headers: {
    "Content-Type": "application/json",
  },
});

export default instance;
