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

// ——— Bolsa de trabajo pública: la empresa decide si sus vacantes aparecen en la bolsa de ADAMIA ———
export const rutaBolsa = (empresa) => (empresa ? `${RUTA_WA}/bolsa${consulta({ empresa })}` : null);
export const guardarBolsa = (empresa, publicar) => axios.put(rutaBolsa(empresa), { publicar_bolsa: publicar }).then((r) => r.data);

// ——— R3: agenda de entrevistas y recordatorios ———
export const rutaAgendaEmpresa = (empresa) => (empresa ? `${RUTA_WA}/agenda/empresa${consulta({ empresa })}` : null);
export const guardarAgendaEmpresa = (empresa, cuerpo) => axios.put(rutaAgendaEmpresa(empresa), cuerpo).then((r) => r.data);
export const rutaAgendaVacante = (idVacante) => (idVacante ? `${RUTA_WA}/vacantes/${encodeURIComponent(idVacante)}/agenda` : null);
export const guardarAgendaVacante = (idVacante, cuerpo) => axios.put(rutaAgendaVacante(idVacante), cuerpo).then((r) => r.data);
export const rutaHorarios = (idVacante, desde, dias = 7) =>
  idVacante && desde ? `${rutaAgendaVacante(idVacante)}/horarios${consulta({ desde, dias })}` : null;
export const rutaCitas = (empresa, { desde, hasta, id_vacante, estado } = {}) =>
  empresa ? `${RUTA_WA}/citas${consulta({ empresa, desde, hasta, id_vacante, estado })}` : null;
const rutaCita = (id) => `${RUTA_WA}/citas/${encodeURIComponent(id)}`;
export const crearCita = (cuerpo) => axios.post(`${RUTA_WA}/citas`, cuerpo).then((r) => r.data);
export const reagendarCita = (id, inicio) => axios.post(`${rutaCita(id)}/reagendar`, { inicio }).then((r) => r.data);
export const cancelarCita = (id, motivo) => axios.post(`${rutaCita(id)}/cancelar`, { motivo }).then((r) => r.data);
export const marcarAsistencia = (id, asistio) => axios.post(`${rutaCita(id)}/asistencia`, { asistio }).then((r) => r.data);
export const confirmarCita = (id) => axios.post(`${rutaCita(id)}/confirmar`).then((r) => r.data);
export const aprobarAgenda = (id) => axios.post(`${rutaConversacion(id)}/aprobar-agenda`).then((r) => r.data);
export const enviarSeguimiento = (id, plantilla) =>
  axios.post(`${rutaConversacion(id)}/seguimiento`, plantilla ? { plantilla } : {}).then((r) => r.data);

// ——— Chat todo-en-uno: adjuntos y «Ofrecer horarios» ———
// Envío multipart con progreso. Se fuerza el adaptador XHR (el de fetch no reporta el avance de subida) y el tipo
// multipart para que axios no convierta el FormData a JSON; el navegador pone el «boundary».
export const enviarAdjunto = (id, { archivo, nombre, texto, notaVoz = false }, { onProgreso, signal } = {}) => {
  const form = new FormData();
  form.append("archivo", archivo, nombre || archivo?.name || "archivo");
  if (texto) form.append("texto", texto);
  if (notaVoz) form.append("nota_voz", "1");
  return axios.post(`${rutaConversacion(id)}/adjuntos`, form, {
    adapter: "xhr",
    headers: { "Content-Type": "multipart/form-data" },
    signal,
    timeout: 0,
    onUploadProgress: (e) => onProgreso?.(e.total ? Math.min(1, e.loaded / e.total) : null),
  }).then((r) => r.data);
};
// Bytes de un adjunto (ruta relativa ya validada con rutaAdjuntoSegura). El token va en el encabezado, nunca en la URL.
export const descargarAdjunto = (ruta, { signal } = {}) => axios.get(ruta, { adapter: "xhr", responseType: "blob", signal, timeout: 0 }).then((r) => r.data);
export const ofrecerHorarios = (id, cuantos) =>
  axios.post(`${rutaConversacion(id)}/ofrecer-horarios`, cuantos ? { cuantos } : {}).then((r) => r.data);

// ——— P7: salud del agente y cobro ———
export const rutaSalud = (empresa, { desde, hasta } = {}) => (empresa ? `${RUTA_WA}/salud${consulta({ empresa, desde, hasta })}` : null);
export const rutaEventosSalud = (empresa, { pagina = 1, severidad, tipo } = {}) =>
  empresa ? `${RUTA_WA}/salud/eventos${consulta({ empresa, pagina, severidad, tipo })}` : null;
export const RUTA_ADMIN_SALUD = `${RUTA_WA}/admin/salud`;

// ——— Lumo fase A: «Sugerir con IA», base de conocimiento y requisitos de la vacante ———
export const sugerirPreguntas = (idVacante) => axios.post(`${rutaPreguntas(idVacante)}/sugerir`, {}, { timeout: 70000 }).then((r) => r.data);
export const rutaRequisitos = (idVacante) => (idVacante ? `${RUTA_WA}/vacantes/${encodeURIComponent(idVacante)}/requisitos` : null);
export const guardarRequisitos = (idVacante, cuerpo) => axios.put(rutaRequisitos(idVacante), cuerpo).then((r) => r.data);
export const rutaConocimiento = (empresa) => (empresa ? `${RUTA_WA}/conocimiento${consulta({ empresa })}` : null);
export const rutaSinRespuesta = (empresa, { todas } = {}) => (empresa ? `${RUTA_WA}/sin-respuesta${consulta({ empresa, todas: todas ? 1 : undefined })}` : null);
export const crearEntrada = (empresa, cuerpo) => axios.post(rutaConocimiento(empresa), cuerpo).then((r) => r.data);
export const guardarEntrada = (id, cuerpo) => axios.put(`${RUTA_WA}/conocimiento/${encodeURIComponent(id)}`, cuerpo).then((r) => r.data);
export const borrarEntrada = (id) => axios.delete(`${RUTA_WA}/conocimiento/${encodeURIComponent(id)}`).then((r) => r.data);
export const importarConocimiento = (empresa) => axios.post(`${RUTA_WA}/conocimiento/importar${consulta({ empresa })}`).then((r) => r.data);
export const responderPregunta = (id, cuerpo) => axios.post(`${RUTA_WA}/sin-respuesta/${encodeURIComponent(id)}/responder`, cuerpo).then((r) => r.data);
export const descartarPregunta = (id) => axios.post(`${RUTA_WA}/sin-respuesta/${encodeURIComponent(id)}/descartar`).then((r) => r.data);

// ——— Lumo fase B1: ubicación de sucursales (Mapbox SOLO en el servidor) y sucursales de la vacante ———
export const rutaSucursales = (empresa) => (empresa ? `${RUTA_WA}/sucursales${consulta({ empresa })}` : null);
export const geocodificarDireccion = (empresa, direccion) =>
  axios.post(`${RUTA_WA}/sucursales/geocodificar${consulta({ empresa })}`, { direccion }, { timeout: 20000 }).then((r) => r.data);
export const guardarUbicacionSucursal = (idUnidad, cuerpo) =>
  axios.put(`${RUTA_WA}/sucursales/${encodeURIComponent(idUnidad)}/ubicacion`, cuerpo).then((r) => r.data);
export const rutaSucursalesVacante = (idVacante) => (idVacante ? `${RUTA_WA}/vacantes/${encodeURIComponent(idVacante)}/sucursales` : null);
export const guardarSucursalesVacante = (idVacante, ids) => axios.put(rutaSucursalesVacante(idVacante), { ids }).then((r) => r.data);
