import axios from "@/lib/axios";
import Cookies from "js-cookie";

/**
 * API cliente para Actas Administrativas (Administrative Minutes).
 *
 * Relación:
 * - Listado (SWR): `src/hooks/useAdministrativeMinutes.js` (usa `fetcherWithToken`)
 * - Crear/Editar: `src/components/NewActaModal.jsx`
 * - Eliminar/Acciones: `src/app/panel/actas-administrativas/page.jsx`
 *
 * Nota:
 * - Se envía `Authorization: Bearer <token>` para mantener consistencia con el resto del panel.
 */
export const administrativeMinutesApi = {
  /**
   * Crea una nueva acta administrativa.
   * Relación: endpoint backend `POST /api/checador/administrativeMinutes/create`
   */
  async crear(payload) {
    const token = Cookies.get("token");
    const res = await axios.post("/checador/administrativeMinutes/create", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  /**
   * Actualiza una acta administrativa existente.
   * Relación: endpoint backend `PUT /api/checador/administrativeMinutes/:id_acta`
   */
  async actualizar(id_acta, payload) {
    const token = Cookies.get("token");
    const res = await axios.put(`/checador/administrativeMinutes/${id_acta}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  /**
   * Elimina una acta administrativa.
   * Relación: endpoint backend `DELETE /api/checador/administrativeMinutes/:id_acta`
   */
  async eliminar(id_acta, id_empresa) {
    const token = Cookies.get("token");
    const res = await axios.delete(`/checador/administrativeMinutes/${id_acta}`, {
      headers: { Authorization: `Bearer ${token}` },
      // Mandamos `id_empresa` en query para que el backend valide pertenencia.
      params: { id_empresa },
    });
    return res.data;
  },

  /**
   * Actualiza SOLO el estatus de un acta administrativa (cambio rápido desde el modal de detalle).
   *
   * Relación:
   * - Backend: `PATCH /api/checador/administrativeMinutes/:id_acta/estatus`
   *   (ver `hr360-checkin-backend/modules/attendance/controllers/administrativeMinutes.js`)
   * - UI: `src/components/AdministrativeDetailsModal.jsx` (botón "Cambiar estatus")
   */
  async actualizarEstatus(id_acta, { id_empresa, estatus }) {
    const token = Cookies.get("token");
    const res = await axios.patch(
      `/checador/administrativeMinutes/${id_acta}/estatus`,
      { id_empresa, estatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  },
};


