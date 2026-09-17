import axios from "axios";

const firmaDigitalPublicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_RUTA_BACKEND,
});

export const firmaDigitalApi = {
  async obtenerSolicitudPublica(token) {
    const res = await firmaDigitalPublicApi.get(
      `/checador/firma-digital/publica/${encodeURIComponent(token)}`,
    );

    return res.data;
  },

  async firmarSolicitud(token, { firma, evidencia }) {
    const formData = new FormData();

    formData.append("consentimiento", "true");
    formData.append("firma", firma, "firma.png");
    formData.append("evidencia", evidencia, "evidencia.jpg");

    const res = await firmaDigitalPublicApi.post(
      `/checador/firma-digital/publica/${encodeURIComponent(token)}/firmar`,
      formData,
    );

    return res.data;
  },
};
