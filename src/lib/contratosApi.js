import axios from "@/lib/axios";
import Cookies from "js-cookie";

/**
 * Cliente API para Contratos.
 * - Relación: usado en `src/app/panel/contratos/ContratoDialog.jsx` y hooks.
 * - Endpoints esperados (ajusta si tu backend difiere):
 *   GET    /contratos?empresa=ID&page=1&limit=10&search=&tipo=&estatus=&desde=&hasta=
 *   POST   /contratos
 *   PUT    /contratos/:id
 *   DELETE /contratos/:id
 */
function authHeaders() {
  const token = Cookies.get("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const contratosApi = {
  async listar(params) {
    const res = await axios.get("/checador/contratos", {
      params,
      headers: authHeaders(),
    });
    return res.data;
  },
  async crear(payload) {
    const res = await axios.post("/checador/contratos", payload, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async actualizar(id, payload) {
    const res = await axios.put(`/checador/contratos/${id}`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async eliminar(id) {
    const res = await axios.delete(`/checador/contratos/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async actualizarEstatus(id, estatus, motivo_terminacion) {
    const res = await axios.patch(
      `/checador/contratos/${id}/estatus`,
      { estatus, motivo_terminacion },
      { headers: authHeaders() }
    );
    return res.data;
  },
  async actualizarUrl(id, url) {
    const res = await axios.patch(
      `/checador/contratos/${id}/url`,
      { url },
      { headers: authHeaders() }
    );
    return res.data;
  },
  async getById(id) {
    const res = await axios.get(`/checador/contratos/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
};


