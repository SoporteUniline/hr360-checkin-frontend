import axios from "@/lib/axios";

/**
 * Cliente API: Reportes Personalizados
 * Base: /checador/reportes-personalizados
 */

export async function listarPlantillas(empresa = "all") {
  const res = await axios.get("/checador/reportes-personalizados", {
    params: { empresa },
  });
  return res.data?.data || [];
}

export async function obtenerPlantilla(id) {
  const res = await axios.get(`/checador/reportes-personalizados/${id}`);
  return res.data;
}

export async function crearPlantilla(idEmpresa, payload) {
  const res = await axios.post("/checador/reportes-personalizados", payload, {
    params: { empresa: idEmpresa },
  });
  return res.data?.plantilla || res.data;
}

export async function actualizarPlantilla(id, payload) {
  const res = await axios.put(`/checador/reportes-personalizados/${id}`, payload);
  return res.data?.plantilla || res.data;
}

export async function eliminarPlantilla(id) {
  const res = await axios.delete(`/checador/reportes-personalizados/${id}`);
  return res.data;
}
