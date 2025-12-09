import axios from "@/lib/axios";
import Cookies from "js-cookie";

function authHeaders() {
  const token = Cookies.get("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const finiquitosApi = {
  async listar(params) {
    const res = await axios.get("/checador/finiquitos", {
      params,
      headers: authHeaders(),
    });
    return res.data;
  },
  async detalle(id) {
    const res = await axios.get(`/checador/finiquitos/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async calcular(payload) {
    const res = await axios.post("/checador/finiquitos/calcular", payload, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async guardar(payload) {
    const res = await axios.post("/checador/finiquitos", payload, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async actualizarEstado(id, estado) {
    const res = await axios.patch(
      `/checador/finiquitos/${id}/estado`,
      { estado },
      { headers: authHeaders() }
    );
    return res.data;
  },
  async eliminar(id) {
    const res = await axios.delete(`/checador/finiquitos/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async obtenerVacacionesDatos({ idEmpleado, empresa, aniosCompletos }) {
    const res = await axios.get(`/checador/finiquitos/empleado/${idEmpleado}/vacaciones-datos`, {
      params: { empresa, aniosCompletos },
      headers: authHeaders(),
    });
    return res.data;
  },
  async empleadosActivos({ empresa, q, limit = 8 }) {
    const res = await axios.get(`/checador/finiquitos/empleados-activos`, {
      params: { empresa, q, limit },
      headers: authHeaders(),
    });
    return res.data;
  },
  // Obtener días no trabajados desde la tabla asistencias
  // - Relación: endpoint `/api/checador/finiquitos/empleado/:idEmpleado/dias-no-trabajados`
  // - Cuenta registros donde asistencia = 0 o NULL en el rango de fechas
  async obtenerDiasNoTrabajados({ idEmpleado, fechaIngreso, fechaBaja }) {
    const res = await axios.get(`/checador/finiquitos/empleado/${idEmpleado}/dias-no-trabajados`, {
      params: { fechaIngreso, fechaBaja },
      headers: authHeaders(),
    });
    return res.data;
  },
};


