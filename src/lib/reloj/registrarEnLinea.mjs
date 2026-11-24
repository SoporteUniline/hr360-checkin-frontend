import { preguntaRepetida } from "./motivoPendiente.mjs";

export async function registrarEnLinea(api, payload) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("Necesitas conexión a internet para checar.");
  }
  const endpoint = payload.descriptor_facial ? "/checador/reloj/registrar-facial" : "/checador/reloj/registrar";
  const response = await api.post(endpoint, payload);
  if (!response.data?.ignorada || !response.data.rebote) return response;
  const { captured_at, ...datos } = payload;
  const { rebote, message } = response.data;
  return {
    ...response,
    data: {
      ...response.data,
      repetida: true,
      pregunta: preguntaRepetida(rebote, message),
      reintentar: { ...datos, repetir: true },
    },
  };
}
