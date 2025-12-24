import axios from "@/lib/axios";
import Cookies from "js-cookie";

/**
 * API cliente para el módulo "Mapa de rutas"
 * - Relación:
 *   - Backend routes: `hr360-checkin-backend/modules/attendance/routes/mapaRutasRoutes.js`
 *   - Página: `hr360-checkin-frontend/src/app/panel/mapa-de-rutas/page.jsx`
 *
 * Nota:
 * - Se usa el patrón del proyecto (igual que `aguinaldosApi.js`): token en cookie + header Authorization.
 */

function authHeaders() {
  const token = Cookies.get("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const mapaRutasApi = {
  /**
   * Lista empleados activos de una empresa.
   * @param {{ empresa: number|string, q?: string, limit?: number }} params
   */
  async empleadosActivos({ empresa, q = "", limit = 1000 }) {
    const res = await axios.get("/checador/mapa-rutas/empleados-activos", {
      params: { empresa, q, limit },
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * Obtiene movimientos por rango (por empleado) filtrando por empresa.
   * @param {{ empresa: number|string, idEmpleado: number|string, fechaInicio: string, fechaFin: string }} params
   */
  async movimientosPorRango({ empresa, idEmpleado, fechaInicio, fechaFin }) {
    const res = await axios.get("/checador/mapa-rutas/movimientos", {
      params: { empresa, idEmpleado, fechaInicio, fechaFin },
      headers: authHeaders(),
    });
    return res.data;
  },
};


