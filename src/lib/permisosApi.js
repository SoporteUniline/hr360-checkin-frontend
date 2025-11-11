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

  async actualizarEstado(id, estado, actualizado_por = null) {
    const token = Cookies.get("token");
    const res = await axios.patch(
      `/checador/solicitudes-permiso/${id}/estado`,
      { estado, actualizado_por },
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
};


