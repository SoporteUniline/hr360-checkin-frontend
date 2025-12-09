import axios from "@/lib/axios";
import Cookies from "js-cookie";

/**
 * API cliente para el módulo de Aguinaldos
 * - Relación: consumido por hooks y componentes de aguinaldos
 * - Endpoints: backend en `hr360-checkin-backend/modules/attendance/routes/aguinaldosRoutes.js`
 */

function authHeaders() {
  const token = Cookies.get("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const aguinaldosApi = {
  /**
   * Lista todos los cálculos de aguinaldos con paginación y filtros
   * @param {Object} params - Parámetros de búsqueda (empresa, page, limit, search, estatus, año_fiscal)
   */
  async listar(params) {
    const res = await axios.get("/checador/aguinaldos", {
      params,
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * Obtiene el detalle completo de un cálculo de aguinaldo
   * @param {number} id - ID del cálculo
   */
  async detalle(id) {
    const res = await axios.get(`/checador/aguinaldos/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * Calcula aguinaldos masivamente para múltiples empleados
   * @param {Object} payload - Datos del cálculo (empleados_ids, fecha_corte, año_fiscal, observaciones)
   */
  async calcular(payload) {
    const res = await axios.post("/checador/aguinaldos/calcular", payload, {
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * Guarda un cálculo de aguinaldos en la base de datos
   * @param {Object} payload - Datos completos del cálculo a guardar
   */
  async guardar(payload) {
    const res = await axios.post("/checador/aguinaldos", payload, {
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * Actualiza el estado de un cálculo de aguinaldo
   * @param {number} id - ID del cálculo
   * @param {string} estado - Nuevo estado (Pendiente, Pagado, Cancelado)
   */
  async actualizarEstado(id, estado) {
    const res = await axios.patch(
      `/checador/aguinaldos/${id}/estado`,
      { estado },
      { headers: authHeaders() }
    );
    return res.data;
  },

  /**
   * Elimina un cálculo de aguinaldo
   * @param {number} id - ID del cálculo a eliminar
   */
  async eliminar(id) {
    const res = await axios.delete(`/checador/aguinaldos/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * Obtiene empleados activos para cálculo de aguinaldo (con sugerencias)
   * @param {Object} params - Parámetros (empresa, q, limit)
   */
  async empleadosActivos({ empresa, q, limit = 8 }) {
    const res = await axios.get(`/checador/aguinaldos/empleados-activos`, {
      params: { empresa, q, limit },
      headers: authHeaders(),
    });
    return res.data;
  },
};

