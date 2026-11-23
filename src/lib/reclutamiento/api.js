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
// cuerpo: { etapa, motivo?, sugerencia? } (aCuerpoEtapa). Acepta también solo la etapa (texto).
export const cambiarEtapa = (id, cuerpo) =>
  axios.put(`${postulacion(id)}/etapa`, typeof cuerpo === "string" ? { etapa: cuerpo } : cuerpo).then((r) => r.data.postulacion);
export const guardarPreparacion = (id, cuerpo) => axios.put(`${postulacion(id)}/preparacion`, cuerpo).then((r) => r.data.postulacion);
export const agregarNota = (id, texto) => axios.post(`${postulacion(id)}/notas`, { texto }).then((r) => r.data.postulacion);
export const contratar = (id, cuerpo) => axios.post(`${postulacion(id)}/contratar`, cuerpo).then((r) => r.data);

// Candidato de WhatsApp (04/12/2026): meter al proceso una entrevista que aceptó el aviso y avisarle por WhatsApp.
export const iniciarProcesoWhatsapp = (idEntrevista) =>
  axios.post(`${RUTA_PANEL}/whatsapp/${encodeURIComponent(idEntrevista)}/proceso`).then((r) => r.data.postulacion);
const conversacionWa = (id) => `/reclutamiento/whatsapp/conversaciones/${encodeURIComponent(id)}`;
export const iniciarProcesoChat = (idConversacion) => axios.post(`${conversacionWa(idConversacion)}/proceso`).then((r) => r.data.proceso);
export const avisarPorWhatsapp = (idConversacion, cuerpo) => axios.post(`${conversacionWa(idConversacion)}/aviso-proceso`, cuerpo).then((r) => r.data);
