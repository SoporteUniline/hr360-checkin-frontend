/**
 * Cliente API para Documentos de Empleados.
 * Relación:
 *  - Usado en: src/app/panel/panel-empleado/components/PanelEmpleadoDocumentos.jsx
 *  - Endpoints backend: /api/checador/documentos-empleado
 */

import axios from "@/lib/axios";
import Cookies from "js-cookie";

function authHeaders() {
  const token = Cookies.get("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const documentosEmpleadoApi = {
  /**
   * Lista los documentos de un empleado.
   * @param {number|string} id_empleado
   * @param {number|string} id_empresa
   */
  async listar(id_empleado, id_empresa) {
    const res = await axios.get(`/checador/documentos-empleado/${id_empleado}`, {
      params: { id_empresa },
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * Sube un documento para un empleado usando multipart/form-data.
   * @param {number|string} id_empleado
   * @param {File} file                 - Objeto File del input/dropzone
   * @param {string} tipo_documento     - Categoría (ej: "INE", "CURP")
   * @param {number|string} id_empresa
   * @param {string} [descripcion]      - Nota adicional opcional
   * @param {function} [onProgress]     - Callback de progreso (0-100)
   */
  async subir(id_empleado, file, tipo_documento, id_empresa, descripcion = "", onProgress) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo_documento", tipo_documento);
    formData.append("id_empresa", id_empresa);
    if (descripcion) formData.append("descripcion", descripcion);

    const res = await axios.post(
      `/checador/documentos-empleado/${id_empleado}`,
      formData,
      {
        headers: {
          ...authHeaders(),
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: onProgress
          ? (e) => {
              const pct = Math.round((e.loaded * 100) / e.total);
              onProgress(pct);
            }
          : undefined,
      }
    );
    return res.data;
  },

  /**
   * Elimina un documento por su ID.
   * @param {number|string} id_documento
   */
  async eliminar(id_documento) {
    const res = await axios.delete(
      `/checador/documentos-empleado/documento/${id_documento}`,
      { headers: authHeaders() }
    );
    return res.data;
  },
};
