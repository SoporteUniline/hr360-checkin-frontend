import axios from "@/lib/axios";
import Cookies from "js-cookie";

/**
 * API cliente para solicitudes de permiso.
 * Relación: Usado por `app/panel/permisos/*` para crear/actualizar/eliminar solicitudes.
 */
export const permisosApi = {
  async crear(payload) {
    const token = Cookies.get("token");
    const res = await axios.post("/checador/solicitudes-permiso", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async actualizar(id, payload) {
    const token = Cookies.get("token");
    const res = await axios.put(`/checador/solicitudes-permiso/${id}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  /**
   * Actualiza el estado de una solicitud de permiso.
   *
   * Relación:
   * - UI admin: `src/app/panel/permisos/PermisoDialog.jsx` (cambia estado y puede mandar `dias_pasados` al cancelar)
   * - Backend: `hr360-checkin-backend/modules/attendance/controllers/solicitudPermisoController.js` -> `actualizarEstado`
   *
   * @param {number|string} id
   * @param {string} estado
   * @param {number|null} actualizado_por
   * @param {object|null} extra - Payload adicional opcional (ej. `{ dias_pasados: [{ fecha:'YYYY-MM-DD', id_tipo_permiso: 1 }] }`)
   */
  async actualizarEstado(id, estado, actualizado_por = null, extra = null) {
    const token = Cookies.get("token");
    const res = await axios.patch(
      `/checador/solicitudes-permiso/${id}/estado`,
      { estado, actualizado_por, ...(extra || {}) },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  },

  async eliminar(id) {
    const token = Cookies.get("token");
    const res = await axios.delete(`/checador/solicitudes-permiso/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async getById(id) {
    const token = Cookies.get("token");
    const res = await axios.get(`/checador/solicitudes-permiso/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};


