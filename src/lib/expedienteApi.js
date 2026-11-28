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

  obtenerUrlTemporal: (id) =>
    axios.get(`/checador/expediente/documentos/doc/${id}/url-temporal`, { headers: h() }).then((r) => r.data),
  editar: (id, body) =>
    axios.put(`/checador/expediente/documentos/doc/${id}`, body, { headers: h() }).then((r) => r.data),

  // (28/11/2026, INC-EXPEDIENTE-001) El backend solo borra fuera del plazo de guarda y con { confirmar: true }:
  // dentro del plazo responde 409 (solo se archiva); sin confirmar, 428.
  eliminar: (id, { confirmar = false } = {}) =>
    axios.delete(`/checador/expediente/documentos/doc/${id}`, { headers: h(), data: confirmar ? { confirmar: true } : undefined }).then((r) => r.data),

  archivar: (id) =>
    axios.post(`/checador/expediente/documentos/doc/${id}/archivar`, {}, { headers: h() }).then((r) => r.data),

  restaurar: (id) =>
    axios.post(`/checador/expediente/documentos/doc/${id}/restaurar`, {}, { headers: h() }).then((r) => r.data),

  // Versión nueva; la anterior se conserva archivada con su archivo.
  reemplazar: (id, formData) =>
    axios.post(`/checador/expediente/documentos/doc/${id}/reemplazar`, formData, { headers: { ...h(), "Content-Type": "multipart/form-data" } }).then((r) => r.data),

  bitacora: (id) =>
    axios.get(`/checador/expediente/documentos/doc/${id}/bitacora`, { headers: h() }).then((r) => r.data),
};

// ─── Expediente por etapas, lista de ley, exportación y cumplimiento (28/11/2026) ─────────────────────────────────
// Backend: /checador/expediente/* (hr360-checkin-backend/docs/expediente-ley.md).
const E = "/checador/expediente";
export const expedienteApi = {
  reglas: () => axios.get(`${E}/reglas`, { headers: h() }).then((r) => r.data),
  persona: (empleado_id, empresa) => axios.get(`${E}/persona/${empleado_id}`, { headers: h(), params: { empresa } }).then((r) => r.data),
  marcarPaso: (empleado_id, clave, { empresa_id, estado, nota }) =>
    axios.post(`${E}/persona/${empleado_id}/pasos/${clave}`, { empresa_id, estado, nota }, { headers: h() }).then((r) => r.data),
  iniciarSalida: (empleado_id, { empresa_id, motivo }) => axios.post(`${E}/persona/${empleado_id}/salida`, { empresa_id, motivo }, { headers: h() }).then((r) => r.data),
  cancelarSalida: (empleado_id, empresa) => axios.delete(`${E}/persona/${empleado_id}/salida`, { headers: h(), params: { empresa } }).then((r) => r.data),
  // ZIP (modo «expediente» o «juicio»): llega completo como blob.
  exportar: (empleado_id, empresa, modo = "expediente") =>
    axios.get(`${E}/persona/${empleado_id}/exportar`, { headers: h(), params: { empresa, modo }, responseType: "blob" }),
  cumplimiento: (empresa, consulta = "") => axios.get(`${E}/empresa/${empresa}/cumplimiento${consulta}`, { headers: h() }).then((r) => r.data),
  exportarCumplimiento: (empresa, consulta = "", formato = "xlsx") =>
    axios.get(`${E}/empresa/${empresa}/cumplimiento/exportar${consulta ? `${consulta}&` : "?"}formato=${formato}`, { headers: h(), responseType: "blob" }),
};
