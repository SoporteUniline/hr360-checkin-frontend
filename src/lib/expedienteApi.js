/**
 * Cliente API del Expediente Digital de Empleados.
 * Categorías + Documentos.
 * Relación: usado en PanelEmpleadoDocumentos.jsx
 */
import axios from "@/lib/axios";
import Cookies from "js-cookie";

function h() {
  const token = Cookies.get("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Categorías ───────────────────────────────────────────────────────────────
export const categoriasApi = {
  listarActivas: (empresa_id) =>
    axios.get(`/checador/expediente/categorias/${empresa_id}/activas`, { headers: h() }).then((r) => r.data),

  listarTodas: (empresa_id) =>
    axios.get(`/checador/expediente/categorias/${empresa_id}`, { headers: h() }).then((r) => r.data),

  crear: (empresa_id, body) =>
    axios.post(`/checador/expediente/categorias/${empresa_id}`, body, { headers: h() }).then((r) => r.data),

  actualizar: (id, body) =>
    axios.put(`/checador/expediente/categorias/item/${id}`, body, { headers: h() }).then((r) => r.data),

  eliminar: (id) =>
    axios.delete(`/checador/expediente/categorias/item/${id}`, { headers: h() }).then((r) => r.data),

  reordenar: (items) =>
    axios.put(`/checador/expediente/categorias/reordenar`, items, { headers: h() }).then((r) => r.data),

  inicializar: (empresa_id) =>
    axios.post(`/checador/expediente/categorias/${empresa_id}/inicializar`, {}, { headers: h() }).then((r) => r.data),
};

// ─── Documentos ───────────────────────────────────────────────────────────────
export const documentosApi = {
  listar: (empleado_id, empresa_id, params = {}) =>
    axios.get(`/checador/expediente/documentos/${empleado_id}`, {
      headers: h(),
      params: { empresa_id, ...params },
    }).then((r) => r.data),

  stats: (empleado_id, empresa_id) =>
    axios.get(`/checador/expediente/documentos/${empleado_id}/stats`, {
      headers: h(),
      params: { empresa_id },
    }).then((r) => r.data),

  alertas: (empleado_id, empresa_id) =>
    axios.get(`/checador/expediente/documentos/${empleado_id}/alertas`, {
      headers: h(),
      params: { empresa_id },
    }).then((r) => r.data),

  subir: (empleado_id, formData, onProgress) =>
    axios.post(`/checador/expediente/documentos/${empleado_id}`, formData, {
      headers: { ...h(), "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    }).then((r) => r.data),

  // Llama al backend para registrar VISUALIZADO en bitácora y devuelve la URL firmada
  obtener: (id) =>
    axios.get(`/checador/expediente/documentos/doc/${id}`, { headers: h() }).then((r) => r.data),

  editar: (id, body) =>
    axios.put(`/checador/expediente/documentos/doc/${id}`, body, { headers: h() }).then((r) => r.data),

  eliminar: (id) =>
    axios.delete(`/checador/expediente/documentos/doc/${id}`, { headers: h() }).then((r) => r.data),

  bitacora: (id) =>
    axios.get(`/checador/expediente/documentos/doc/${id}/bitacora`, { headers: h() }).then((r) => r.data),
};
