import axios from "axios";
import Cookies from "js-cookie";

const authHeaders = () => {
  const token = Cookies.get("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

export const firmaDigitalAdminApi = {
  async obtenerEstadoDocumento({
    idEmpresa,
    tipoDocumento,
    referenciaId,
  }) {
    const res = await firmaDigitalPublicApi.get(
      "/checador/firma-digital/solicitudes/documento",
      {
        params: {
          id_empresa: idEmpresa,
          tipo_documento: tipoDocumento,
          referencia_id: referenciaId,
        },
        headers: authHeaders(),
      },
    );

    return res.data;
  },

  async obtenerDocumentoFirmado({
    idSolicitud,
    idEmpresa,
  }) {
    const res = await firmaDigitalPublicApi.get(
      `/checador/firma-digital/solicitudes/${encodeURIComponent(
        idSolicitud,
      )}/documento-firmado`,
      {
        params: {
          id_empresa: idEmpresa,
        },
        headers: authHeaders(),
      },
    );

    return res.data;
  },

  async crearSolicitud({
    idEmpresa,
    idEmpleado,
    tipoDocumento,
    referenciaId,
    documento,
    nombreArchivo,
    expiracionHoras = 72,
  }) {
    const formData = new FormData();

    formData.append("id_empresa", String(idEmpresa));
    formData.append("id_empleado", String(idEmpleado));
    formData.append("tipo_documento", tipoDocumento);
    formData.append("referencia_id", String(referenciaId));
    formData.append("expiracion_horas", String(expiracionHoras));
    formData.append("documento", documento, nombreArchivo);

    const res = await firmaDigitalPublicApi.post(
      "/checador/firma-digital/solicitudes",
      formData,
      {
        headers: authHeaders(),
      },
    );

    return res.data;
  },
};
