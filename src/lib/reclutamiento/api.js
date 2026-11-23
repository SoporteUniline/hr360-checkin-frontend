// Acceso al API real de Reclutamiento (03/12/2026). Usa la instancia de axios del proyecto, que pone la sesión.
// La empresa la valida el servidor contra la sesión; ?empresa= solo elige entre las del usuario.
import axios from "@/lib/axios";

export const RUTA_PANEL = "/reclutamiento/panel";
const conEmpresa = (ruta, empresa) => (empresa ? `${ruta}?empresa=${encodeURIComponent(empresa)}` : ruta);

export const rutaResumen = (empresa) => (empresa ? conEmpresa(`${RUTA_PANEL}/resumen`, empresa) : null);
export const rutaPostulacion = (id) => (/^\d+$/.test(String(id ?? "")) ? `${RUTA_PANEL}/postulaciones/${id}` : null);
export const obtener = (url) => axios.get(url).then((r) => r.data);

const vacante = (id) => `${RUTA_PANEL}/vacantes/${encodeURIComponent(id)}`;
const postulacion = (id) => `${RUTA_PANEL}/postulaciones/${encodeURIComponent(id)}`;

export const crearVacante = (empresa, cuerpo) => axios.post(conEmpresa(`${RUTA_PANEL}/vacantes`, empresa), cuerpo).then((r) => r.data.vacante);
export const actualizarVacante = (id, cuerpo) => axios.put(vacante(id), cuerpo).then((r) => r.data.vacante);
export const cambiarEstadoVacante = (id, accion) => axios.post(`${vacante(id)}/estado`, { accion }).then((r) => r.data.vacante);
export const duplicarVacante = (id) => axios.post(`${vacante(id)}/duplicar`).then((r) => r.data.vacante);
export const crearModalidad = (empresa, cuerpo) => axios.post(conEmpresa(`${RUTA_PANEL}/modalidades`, empresa), cuerpo).then((r) => r.data.modalidad);
export const cambiarEtapa = (id, etapa) => axios.put(`${postulacion(id)}/etapa`, { etapa }).then((r) => r.data.postulacion);
export const guardarPreparacion = (id, cuerpo) => axios.put(`${postulacion(id)}/preparacion`, cuerpo).then((r) => r.data.postulacion);
export const agregarNota = (id, texto) => axios.post(`${postulacion(id)}/notas`, { texto }).then((r) => r.data.postulacion);
export const contratar = (id, cuerpo) => axios.post(`${postulacion(id)}/contratar`, cuerpo).then((r) => r.data);
