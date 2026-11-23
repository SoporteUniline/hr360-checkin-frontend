// Reglas de pantalla del agente entrevistador de WhatsApp (R2): etiquetas de calificación, etapa y severidad,
// filtros de la bandeja, formulario de preguntas por vacante y configuración del agente (horario, palabras).
// Es un espejo de la validación del API, que es la que manda; aquí solo se evita mandar lo que se va a rechazar.

// ——— Calificación, etapa, severidad y puntajes ———
const CALIFICACIONES = {
  califica: { texto: "Califica", tono: "verde" },
  con_alerta: { texto: "Con alerta", tono: "ambar" },
  no_califica: { texto: "No califica", tono: "rojo" },
  incompleto: { texto: "Incompleto", tono: "gris" },
};
// { texto, tono } o null cuando todavía no hay calificación.
export const etiquetaCalificacion = (calificacion) => CALIFICACIONES[calificacion] ?? null;

const ETAPAS = {
  consentimiento: "Pidiendo aceptar el aviso de privacidad",
  nombre: "Pidiendo su nombre",
  preguntas: "Respondiendo preguntas",
  cerrada: "Entrevista terminada",
  rechazada: "No aceptó el aviso de privacidad",
  humano: "Pasó a una persona",
};
export const etiquetaEtapa = (etapa) => ETAPAS[etapa] ?? "Sin iniciar";

const SEVERIDADES = {
  ok: { simbolo: "✓", texto: "Sin problema", tono: "verde" },
  alerta: { simbolo: "⚠", texto: "Alerta", tono: "ambar" },
  descarta: { simbolo: "✕", texto: "Descarta", tono: "rojo" },
};
export const etiquetaSeveridad = (severidad) => SEVERIDADES[severidad] ?? SEVERIDADES.ok;

export const PUNTAJES = [
  { clave: "comunicacion", texto: "Comunicación" },
  { clave: "actitud", texto: "Actitud" },
  { clave: "experiencia", texto: "Experiencia" },
  { clave: "confiabilidad", texto: "Confiabilidad" },
  { clave: "disponibilidad", texto: "Disponibilidad" },
];
// Puntaje entero de 1 a 5, o null si no viene o no es válido.
export function normalizarPuntaje(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(1, n));
}

// Consentimiento: true (aceptó), false (no aceptó) o null (aún no responde).
export function textoConsentimiento(consentimiento) {
  if (consentimiento === true) return "Aceptó el aviso de privacidad";
  if (consentimiento === false) return "No aceptó el aviso de privacidad";
  return "Aún no responde al aviso de privacidad";
}

// ——— Filtros de la bandeja ———
export const FILTROS = [
  { valor: "todos", texto: "Todos", params: {} },
  { valor: "atencion", texto: "Requiere atención", params: { atencion: 1 } },
  { valor: "califica", texto: "Califica", params: { calificacion: "califica" } },
  { valor: "con_alerta", texto: "Con alerta", params: { calificacion: "con_alerta" } },
  { valor: "no_califica", texto: "No califica", params: { calificacion: "no_califica" } },
  { valor: "incompleto", texto: "Incompleto", params: { calificacion: "incompleto" } },
];
export const paramsFiltro = (valor) => FILTROS.find((f) => f.valor === valor)?.params ?? {};

// ——— Preguntas de la entrevista por vacante ———
export const MAX_PREGUNTAS = 8;
export const MAX_OPCIONES = 10;
export const LIMITE_PREGUNTA = 300;
export const LIMITE_OPCION = 80;
export const OPCIONES_SI_NO = ["Sí", "No"];
export const TIPOS = [
  { valor: "si_no", texto: "Sí / No" },
  { valor: "opciones", texto: "Opciones" },
  { valor: "numero", texto: "Número" },
  { valor: "texto", texto: "Texto libre" },
];
const TIPOS_VALIDOS = new Set(TIPOS.map((t) => t.valor));

let consecutivo = 0;
const nuevaClave = () => `p${Date.now().toString(36)}${(consecutivo++).toString(36)}`;
const opcion = (texto, efecto = "ok") => ({ clave: nuevaClave(), texto, efecto });

// En el formulario cada opción lleva su efecto («ok», «descarta» o «alerta»): así una respuesta no puede descartar y
// alertar a la vez. Para «numero» los rangos se guardan como texto mientras se escriben.
export function preguntaNueva(tipo = "si_no") {
  return {
    clave: nuevaClave(), id: null, texto: "", tipo, activa: true,
    opciones: tipo === "si_no" ? OPCIONES_SI_NO.map((t) => opcion(t)) : tipo === "opciones" ? [opcion(""), opcion("")] : [],
    descarta: { min: "", max: "" }, alerta: { min: "", max: "" },
  };
}

// Cambiar el tipo conserva el texto y reinicia lo que ya no aplica.
export function cambiarTipo(pregunta, tipo) {
  if (!TIPOS_VALIDOS.has(tipo) || pregunta.tipo === tipo) return pregunta;
  const base = preguntaNueva(tipo);
  return { ...base, clave: pregunta.clave, id: pregunta.id, texto: pregunta.texto, activa: pregunta.activa };
}

const comoTextoNumero = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? "" : String(v));
const rangoATexto = (r) => (r && typeof r === "object" && !Array.isArray(r) ? { min: comoTextoNumero(r.min), max: comoTextoNumero(r.max) } : { min: "", max: "" });
const mismaOpcion = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// Pregunta del API → pregunta del formulario.
export function preguntaDesdeApi(p) {
  const tipo = TIPOS_VALIDOS.has(p?.tipo) ? p.tipo : "texto";
  const base = { ...preguntaNueva(tipo), id: p?.id ?? null, texto: String(p?.texto ?? ""), activa: p?.activa !== false };
  if (tipo === "si_no" || tipo === "opciones") {
    const textos = tipo === "si_no" ? OPCIONES_SI_NO : (Array.isArray(p?.opciones) ? p.opciones.map(String) : []);
    const descartan = Array.isArray(p?.descartan) ? p.descartan : [];
    const alertan = Array.isArray(p?.alertan) ? p.alertan : [];
    base.opciones = textos.map((t) => opcion(t, descartan.some((d) => mismaOpcion(d, t)) ? "descarta" : alertan.some((a) => mismaOpcion(a, t)) ? "alerta" : "ok"));
  }
  if (tipo === "numero") {
    base.descarta = rangoATexto(p?.descartan);
    base.alerta = rangoATexto(p?.alertan);
  }
  return base;
}

export function moverPregunta(lista, indice, delta) {
  const destino = indice + delta;
  if (indice < 0 || indice >= lista.length || destino < 0 || destino >= lista.length) return lista;
  const copia = [...lista];
  [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
  return copia;
}

const leerNumero = (texto) => {
  const t = String(texto ?? "").trim().replace(/,/g, "");
  if (t === "") return { vacio: true };
  const n = Number(t);
  return Number.isFinite(n) ? { valor: n } : { invalido: true };
};

// Rango de texto → { rango: {min?, max?} | null, error }.
function validarRango(rango, que) {
  const min = leerNumero(rango?.min);
  const max = leerNumero(rango?.max);
  if (min.invalido || max.invalido) return { rango: null, error: `Escribe números válidos en «${que}».` };
  if (min.vacio && max.vacio) return { rango: null, error: "" };
  if (!min.vacio && !max.vacio && min.valor > max.valor) return { rango: null, error: `En «${que}» el mínimo no puede ser mayor que el máximo.` };
  const salida = {};
  if (!min.vacio) salida.min = min.valor;
  if (!max.vacio) salida.max = max.valor;
  return { rango: salida, error: "" };
}

// Valida el formulario completo. Devuelve { errores: [{campo: texto}] por pregunta, general, valido, cuerpo }
// con el cuerpo listo para PUT /vacantes/:id/preguntas (orden 1..n según la posición en la lista).
export function validarPreguntas(lista) {
  const preguntas = Array.isArray(lista) ? lista : [];
  const errores = preguntas.map(() => ({}));
  let general = "";
  if (preguntas.length > MAX_PREGUNTAS) general = `Máximo ${MAX_PREGUNTAS} preguntas por vacante.`;
  const salida = preguntas.map((p, i) => {
    const e = errores[i];
    const texto = String(p?.texto ?? "").trim().replace(/\s+/g, " ");
    if (!texto) e.texto = "Escribe la pregunta.";
    else if (texto.length > LIMITE_PREGUNTA) e.texto = `Máximo ${LIMITE_PREGUNTA} caracteres.`;
    if (!e.texto && preguntas.slice(0, i).some((q) => mismaOpcion(String(q?.texto ?? "").replace(/\s+/g, " "), texto))) e.texto = "Esta pregunta está repetida.";
    if (!TIPOS_VALIDOS.has(p?.tipo)) e.tipo = "Elige el tipo de respuesta.";
    const cuerpo = { orden: i + 1, texto, tipo: p?.tipo, opciones: null, descartan: null, alertan: null, activa: p?.activa !== false };
    if (p?.id !== null && p?.id !== undefined) cuerpo.id = p.id;
    if (p?.tipo === "si_no" || p?.tipo === "opciones") {
      const opciones = (p.opciones ?? []).map((o) => ({ ...o, texto: String(o.texto ?? "").trim().replace(/\s+/g, " ") }));
      if (p.tipo === "opciones") {
        if (opciones.some((o) => !o.texto)) e.opciones = "No dejes opciones vacías.";
        else if (opciones.length < 2) e.opciones = "Agrega al menos 2 opciones.";
        else if (opciones.length > MAX_OPCIONES) e.opciones = `Máximo ${MAX_OPCIONES} opciones.`;
        else if (opciones.some((o) => o.texto.length > LIMITE_OPCION)) e.opciones = `Cada opción admite hasta ${LIMITE_OPCION} caracteres.`;
        else if (opciones.some((o, j) => opciones.slice(0, j).some((x) => mismaOpcion(x.texto, o.texto)))) e.opciones = "Hay opciones repetidas.";
      }
      const textos = p.tipo === "si_no" ? OPCIONES_SI_NO : opciones.map((o) => o.texto);
      const efecto = (t) => opciones.find((o) => mismaOpcion(o.texto, t))?.efecto ?? "ok";
      const descartan = textos.filter((t) => efecto(t) === "descarta");
      const alertan = textos.filter((t) => efecto(t) === "alerta");
      if (!e.opciones && textos.length && descartan.length === textos.length) e.descartan = "Al menos una respuesta debe dejar pasar al candidato.";
      cuerpo.opciones = textos;
      cuerpo.descartan = descartan;
      cuerpo.alertan = alertan;
    } else if (p?.tipo === "numero") {
      const d = validarRango(p.descarta, "Respuestas que descartan");
      const a = validarRango(p.alerta, "Respuestas que alertan");
      if (d.error) e.descartan = d.error;
      if (a.error) e.alertan = a.error;
      cuerpo.descartan = d.rango;
      cuerpo.alertan = a.rango;
    }
    return cuerpo;
  });
  const valido = !general && errores.every((e) => !Object.keys(e).length);
  if (!valido && !general) general = "Revisa las preguntas marcadas.";
  return { errores, general, valido, cuerpo: { preguntas: salida } };
}

// En «numero» descartan/alertan son el RANGO ACEPTADO: la respuesta FUERA del rango descarta (o alerta).
// Describe lo que queda fuera: «menos de 18», «más de 60», «fuera de 18 a 60».
export function describirFueraDeRango(rango) {
  if (!rango) return "";
  const min = leerNumero(rango.min);
  const max = leerNumero(rango.max);
  if (min.invalido || max.invalido || (min.vacio && max.vacio)) return "";
  if (!min.vacio && !max.vacio && min.valor > max.valor) return ""; // rango inválido: lo marca la validación
  if (min.vacio) return `más de ${max.valor}`;
  if (max.vacio) return `menos de ${min.valor}`;
  return min.valor === max.valor ? `distinto de ${min.valor}` : `fuera de ${min.valor} a ${max.valor}`;
}

// Línea de ejemplo bajo cada pregunta: «Ej.: ¿Tienes licencia tipo C? → No descarta».
export function vistaPreviaPregunta(p) {
  const texto = String(p?.texto ?? "").trim() || "(escribe la pregunta)";
  const partes = [];
  if (p?.tipo === "si_no" || p?.tipo === "opciones") {
    const con = (efecto) => (p.opciones ?? []).filter((o) => o.efecto === efecto && String(o.texto).trim()).map((o) => String(o.texto).trim());
    const d = con("descarta");
    const a = con("alerta");
    if (d.length) partes.push(`${d.join(" o ")} descarta`);
    if (a.length) partes.push(`${a.join(" o ")} alerta`);
  } else if (p?.tipo === "numero") {
    const d = describirFueraDeRango(p.descarta);
    const a = describirFueraDeRango(p.alerta);
    if (d) partes.push(`${d} descarta`);
    if (a) partes.push(`${a} alerta`);
  } else {
    return `Ej.: ${texto} → solo se guarda la respuesta`;
  }
  return `Ej.: ${texto} → ${partes.length ? partes.join(" · ") : "cualquier respuesta pasa"}`;
}

export const textoConteoPreguntas = (n) => (!n ? "Sin entrevista" : n === 1 ? "1 pregunta" : `${n} preguntas`);
// Cuenta las preguntas activas de la respuesta del API.
export const contarPreguntas = (datos) => (Array.isArray(datos?.preguntas) ? datos.preguntas.filter((p) => p?.activa !== false).length : 0);

// ——— Configuración del agente ———
// Contrato del API: horario_json = {lun..dom: {desde, hasta} | null} o null completo (= siempre disponible);
// palabras_humano es un texto separado por comas.
export const DIAS = [
  { clave: "lun", texto: "Lunes" },
  { clave: "mar", texto: "Martes" },
  { clave: "mie", texto: "Miércoles" },
  { clave: "jue", texto: "Jueves" },
  { clave: "vie", texto: "Viernes" },
  { clave: "sab", texto: "Sábado" },
  { clave: "dom", texto: "Domingo" },
];
export const LIMITE_NOMBRE = 60;
export const LIMITE_FUERA_HORARIO = 500;
export const LIMITE_FRECUENTES = 8000;
export const LIMITE_PALABRAS = 500; // largo total del texto separado por comas
export const LIMITE_PALABRA = 60;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Horario sugerido al dejar de estar «Siempre disponible»: lunes a viernes 9:00–18:00.
export function horarioBase() {
  const h = {};
  for (const { clave } of DIAS) h[clave] = ["sab", "dom"].includes(clave) ? null : { desde: "09:00", hasta: "18:00" };
  return h;
}

export function copiarLunesATodos(horario) {
  const lunes = horario?.lun ?? null;
  const h = {};
  for (const { clave } of DIAS) h[clave] = lunes ? { ...lunes } : null;
  return h;
}

// { errores: {dia: texto}, horario } — horario normalizado con los 7 días (null = no atiende ese día).
export function validarHorario(horario) {
  const errores = {};
  const salida = {};
  for (const { clave, texto } of DIAS) {
    const d = horario?.[clave];
    if (!d) { salida[clave] = null; continue; }
    const desde = String(d.desde ?? "").slice(0, 5);
    const hasta = String(d.hasta ?? "").slice(0, 5);
    if (!HORA.test(desde) || !HORA.test(hasta)) errores[clave] = `${texto}: escribe la hora de inicio y de fin.`;
    else if (desde >= hasta) errores[clave] = `${texto}: la hora de fin debe ser después de la de inicio.`;
    salida[clave] = { desde, hasta };
  }
  return { errores, horario: salida };
}

export const textoPalabras = (lista) => (lista ?? []).join(", ");
// Texto del API («humano, asesor») → lista sin vacíos ni repetidas.
export const separarPalabras = (texto) => agregarPalabras([], String(texto ?? "")).palabras;

// Agrega palabras (separadas por coma o salto de línea) sin repetir. Devuelve { palabras, error }.
export function agregarPalabras(actuales, texto) {
  const lista = [...(actuales ?? [])];
  const nuevas = String(texto ?? "").split(/[,\n]/).map((x) => x.trim().replace(/\s+/g, " ")).filter(Boolean);
  for (const p of nuevas) {
    if (p.length > LIMITE_PALABRA) return { palabras: lista, error: `Cada palabra o frase admite hasta ${LIMITE_PALABRA} caracteres.` };
    if (lista.some((x) => mismaOpcion(x, p))) continue;
    if (textoPalabras([...lista, p]).length > LIMITE_PALABRAS) return { palabras: lista, error: `Entre todas suman más de ${LIMITE_PALABRAS} caracteres; quita alguna.` };
    lista.push(p);
  }
  return { palabras: lista, error: "" };
}

// Respuesta del API → formulario.
export function agenteDesdeApi(a) {
  const conHorario = !!a?.horario_json && typeof a.horario_json === "object";
  return {
    activo: a?.activo === true,
    nombre_asistente: String(a?.nombre_asistente ?? ""),
    usaHorario: conHorario,
    horario: conHorario ? validarHorario(a.horario_json).horario : horarioBase(),
    mensaje_fuera_horario: String(a?.mensaje_fuera_horario ?? ""),
    respuestas_frecuentes: String(a?.respuestas_frecuentes ?? ""),
    palabras_humano: Array.isArray(a?.palabras_humano) ? separarPalabras(a.palabras_humano.join(",")) : separarPalabras(a?.palabras_humano),
  };
}

// Formulario → { errores, valido, cuerpo } con el cuerpo listo para PUT /agente (solo campos editables).
export function validarAgente(form) {
  const errores = {};
  const nombre = String(form?.nombre_asistente ?? "").trim().replace(/\s+/g, " ");
  const fuera = String(form?.mensaje_fuera_horario ?? "").trim();
  const frecuentes = String(form?.respuestas_frecuentes ?? "").trim();
  if (!nombre) errores.nombre_asistente = "Escribe cómo se presenta el asistente (por ejemplo, «Sofía de Uniline»).";
  else if (nombre.length > LIMITE_NOMBRE) errores.nombre_asistente = `Máximo ${LIMITE_NOMBRE} caracteres.`;
  let horario = null;
  if (form?.usaHorario) {
    const r = validarHorario(form.horario);
    horario = r.horario;
    if (Object.keys(r.errores).length) errores.horario = r.errores;
    else if (!DIAS.some(({ clave }) => horario[clave])) errores.horario = { general: "Activa al menos un día o marca «Siempre disponible»." };
    if (!fuera) errores.mensaje_fuera_horario = "Escribe lo que contesta el agente fuera de horario.";
  }
  if (fuera.length > LIMITE_FUERA_HORARIO) errores.mensaje_fuera_horario = `Máximo ${LIMITE_FUERA_HORARIO} caracteres.`;
  if (frecuentes.length > LIMITE_FRECUENTES) errores.respuestas_frecuentes = `Máximo ${LIMITE_FRECUENTES} caracteres.`;
  const palabras = agregarPalabras([], (form?.palabras_humano ?? []).join("\n"));
  if (palabras.error) errores.palabras_humano = palabras.error;
  const cuerpo = {
    activo: form?.activo === true,
    nombre_asistente: nombre,
    horario_json: horario,
    mensaje_fuera_horario: fuera,
    respuestas_frecuentes: frecuentes,
    palabras_humano: textoPalabras(palabras.palabras),
  };
  return { errores, valido: !Object.keys(errores).length, cuerpo };
}

// Texto de la pregunta en curso (el API puede mandar texto u objeto con «texto»).
// El servidor manda el número de la pregunta (su orden); también se aceptan texto u objeto con texto.
export const textoPreguntaActual = (p) => {
  if (typeof p === "number" && Number.isFinite(p)) return `Pregunta ${p}`;
  if (typeof p === "string") return /^\d+$/.test(p.trim()) ? `Pregunta ${p.trim()}` : p.trim();
  return String(p?.texto ?? "").trim();
};
