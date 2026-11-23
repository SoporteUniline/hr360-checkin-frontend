// Acceso al API de WhatsApp de reclutamiento (R1 bandeja, R2 agente entrevistador). Usa la instancia de axios del proyecto, que pone la sesión.
import axios from "@/lib/axios";

export const RUTA_WA = "/reclutamiento/whatsapp";

const consulta = (params) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  const texto = q.toString();
  return texto ? `?${texto}` : "";
};

export const rutaEstado = (empresa) => (empresa ? `${RUTA_WA}/estado${consulta({ empresa })}` : null);
// R2: `filtro` son los parámetros del chip elegido ({ calificacion } o { atencion: 1 }).
export const rutaConversaciones = (empresa, { q, pagina = 1, limite = 30, filtro = {} } = {}) =>
  empresa ? `${RUTA_WA}/conversaciones${consulta({ empresa, q, pagina, limite, ...filtro })}` : null;
export const rutaVacantes = (empresa) => (empresa ? `${RUTA_WA}/vacantes${consulta({ empresa })}` : null);
export const rutaConversacion = (id) => (id ? `${RUTA_WA}/conversaciones/${encodeURIComponent(id)}` : null);

export const obtener = (url) => axios.get(url).then((r) => r.data);

export const tomarControl = (id) => axios.post(`${rutaConversacion(id)}/tomar`).then((r) => r.data);
export const devolverAIa = (id) => axios.post(`${rutaConversacion(id)}/devolver`).then((r) => r.data);
export const enviarMensaje = (id, texto) => axios.post(`${rutaConversacion(id)}/mensajes`, { texto }).then((r) => r.data);
export const reintentarMensaje = (id, idMensaje) =>
  axios.post(`${rutaConversacion(id)}/mensajes/${encodeURIComponent(idMensaje)}/reintentar`).then((r) => r.data);
export const enlaceVacante = (idVacante) =>
  axios.get(`${RUTA_WA}/vacantes/${encodeURIComponent(idVacante)}/enlace`).then((r) => r.data);

export const listarEmpresasAdmin = () => axios.get(`${RUTA_WA}/admin/empresas`).then((r) => r.data);
export const guardarEmpresaAdmin = (idEmpresa, cuerpo) =>
  axios.put(`${RUTA_WA}/admin/empresas/${encodeURIComponent(idEmpresa)}`, cuerpo).then((r) => r.data);

// ——— R2: agente entrevistador ———
export const rutaAgente = (empresa) => (empresa ? `${RUTA_WA}/agente${consulta({ empresa })}` : null);
export const rutaPreguntas = (idVacante) => (idVacante ? `${RUTA_WA}/vacantes/${encodeURIComponent(idVacante)}/preguntas` : null);
export const guardarAgente = (empresa, cuerpo) => axios.put(rutaAgente(empresa), cuerpo).then((r) => r.data);
export const guardarPreguntas = (idVacante, cuerpo) => axios.put(rutaPreguntas(idVacante), cuerpo).then((r) => r.data);
export const marcarAtendido = (id) => axios.post(`${rutaConversacion(id)}/atendido`).then((r) => r.data);

// ——— Bolsa de trabajo pública (27/11/2026): la empresa decide si sus vacantes aparecen en la bolsa de ADAMIA ———
export const rutaBolsa = (empresa) => (empresa ? `${RUTA_WA}/bolsa${consulta({ empresa })}` : null);
export const guardarBolsa = (empresa, publicar) => axios.put(rutaBolsa(empresa), { publicar_bolsa: publicar }).then((r) => r.data);
