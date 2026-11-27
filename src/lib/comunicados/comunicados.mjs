// Centro de comunicados (muro) — reglas de presentación compartidas por el panel de RH, Mi espacio y el aviso emergente.
// Sin red ni React: probado en scripts/test-comunicados.mjs. Las reglas de negocio (audiencia congelada, quién publica,
// moderación, límites, validación de archivos por bytes, YouTube) viven en el backend (/api/checador/comunicados);
// aquí solo se repite lo necesario para avisar ANTES de mandar (el servidor vuelve a validar todo).
// Todo lo que escribe una persona se muestra como texto (nunca HTML).

export const API = "/checador/comunicados";
export const API_MI = `${API}/mi`;
export const RUTA_PANEL = "/panel/comunicados";
export const RUTA_NUEVO = `${RUTA_PANEL}/nuevo`;
export const RUTA_AUTOMATICOS = `${RUTA_PANEL}/automaticos`;
export const RUTA_MODERACION = `${RUTA_PANEL}/moderacion`;
export const RUTA_MURO = "/empleado/panel/muro";
export const RUTA_PUBLICAR = `${RUTA_MURO}/publicar`;
export const rutaSeguimiento = (id) => `${RUTA_PANEL}/${encodeURIComponent(id)}`;
export const rutaEditar = (id) => `${RUTA_PANEL}/${encodeURIComponent(id)}/editar`;
export const rutaPost = (id) => `${RUTA_MURO}/${encodeURIComponent(id)}`;

// Service worker de Web Push: alcance propio para no tocar el registro de «/» (offline-clock-sw.js se retira solo y
// RetireOfflineWorker lo actualiza; si compartieran alcance, uno borraría al otro).
export const PUSH_SW = "/comunicados-push-sw.js";
export const PUSH_ALCANCE = "/comunicados-push/";

// ───────── catálogos ─────────
export const TIPOS = Object.freeze([
  { clave: "aviso", texto: "Aviso general" },
  { clave: "evento", texto: "Evento o actividad" },
  { clave: "auditoria", texto: "Auditoría" },
  { clave: "politica", texto: "Política o reglamento" },
  { clave: "cumpleanos", texto: "Cumpleaños" },
  { clave: "aniversario", texto: "Aniversario" },
  { clave: "bienvenida", texto: "Bienvenida" },
  { clave: "festivo", texto: "Día festivo" },
  { clave: "publicacion", texto: "Publicación" },
]);
// Nombre corto de la tabla y del muro («Evento», «Política»). Acepta variantes de clave (aviso_general, politica_reglamento).
const CORTO = { aviso: "Aviso general", aviso_general: "Aviso general", evento: "Evento", auditoria: "Auditoría", politica: "Política", politica_reglamento: "Política", cumpleanos: "Cumpleaños", aniversario: "Aniversario", bienvenida: "Bienvenida", festivo: "Festivo", publicacion: "Publicación" };
export const textoTipo = (clave) => CORTO[String(clave ?? "")] ?? "Comunicado";
// Tipos que RH elige al redactar (los automáticos los publica el sistema, pero también se pueden escribir a mano).
export const TIPOS_REDACTAR = TIPOS;

export const LIMITES = Object.freeze({ fotos: 10, fotoBytes: 8 * 1024 * 1024, pdfBytes: 15 * 1024 * 1024, titulo: 150, cuerpo: 5000, comentario: 1000, motivo: 300, fijados: 3, recordatorios: 3, portadaTitulo: 120 });
export const TIPOS_FOTO = Object.freeze(["image/jpeg", "image/png", "image/webp"]);

export const FILTROS_PANEL = Object.freeze([
  { clave: "todos", texto: "Todos", params: {} },
  { clave: "confirmacion", texto: "Requieren confirmación", params: { nivel: "confirmacion" } },
  { clave: "programados", texto: "Programados", params: { estado: "programado" } },
  { clave: "automaticos", texto: "Automáticos", params: { automatico: "1" } },
  { clave: "borradores", texto: "Borradores", params: { estado: "borrador" } },
  { clave: "por_aprobar", texto: "Por aprobar", params: { estado: "pendiente_aprobacion" } },
]);
/** Ruta del listado del panel con filtro, búsqueda, página y empresa. */
export function urlListado({ filtro = "todos", q = "", pagina = 1, empresa = null } = {}) {
  const f = FILTROS_PANEL.find((x) => x.clave === filtro) ?? FILTROS_PANEL[0];
  const p = new URLSearchParams({ ...f.params });
  if (String(q).trim()) p.set("q", String(q).trim());
  if (Number(pagina) > 1) p.set("pagina", String(pagina));
  if (empresa) p.set("empresa", String(empresa));
  const s = p.toString();
  return `${API}${s ? `?${s}` : ""}`;
}
/** Filtro de respaldo en el navegador (por si el servidor ignora el parámetro «automatico»). */
export function filtrarLocal(items = [], filtro = "todos") {
  if (filtro === "automaticos") return items.filter((i) => i.automatico);
  return items;
}

// ───────── fechas (zona de la empresa) ─────────
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const CON_ZONA = /(Z|[+-]\d{2}:?\d{2})$/i;
const capital = (s) => s.charAt(0).toLocaleUpperCase("es-MX") + s.slice(1);

/** Partes de fecha y hora en la zona de la empresa. Sin zona («2026-11-27 09:00:00») se toma como hora de la empresa. */
export function partes(valor, tz = "America/Mexico_City") {
  if (valor == null || valor === "") return null;
  if (typeof valor === "string" && !CON_ZONA.test(valor.trim())) {
    const m = valor.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) return null;
    const [y, mo, d, h = "0", mi = "0"] = m.slice(1);
    const dow = new Date(Date.UTC(+y, +mo - 1, +d, 12)).getUTCDay();
    return { y: +y, m: +mo, d: +d, h: +h, min: +mi, dow, conHora: m[4] != null };
  }
  const f = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(f.getTime())) return null;
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23", weekday: "short" })
    .formatToParts(f).map((x) => [x.type, x.value]));
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute, dow, conHora: true };
}
const dia = (p) => Date.UTC(p.y, p.m - 1, p.d) / 86400000;
const hhmm = (p) => `${p.h}:${String(p.min).padStart(2, "0")}`;

/** «Hoy 9:00», «Ayer 18:20», «Lunes», «24 nov», «24 nov 2025». */
export function fechaRelativa(valor, { ahora = new Date(), tz } = {}) {
  const p = partes(valor, tz);
  const h = partes(ahora, tz);
  if (!p || !h) return "";
  const dif = dia(h) - dia(p);
  if (dif === 0) return p.conHora ? `Hoy ${hhmm(p)}` : "Hoy";
  if (dif === 1) return p.conHora ? `Ayer ${hhmm(p)}` : "Ayer";
  if (dif > 1 && dif < 7) return capital(DIAS[p.dow]);
  if (dif === -1) return p.conHora ? `Mañana ${hhmm(p)}` : "Mañana";
  return `${p.d} ${MESES[p.m - 1]}${p.y !== h.y ? ` ${p.y}` : ""}`;
}
/** «el lunes 1 a las 7:00» (programados) */
export function fechaProgramada(valor, { tz } = {}) {
  const p = partes(valor, tz);
  if (!p) return "";
  return `el ${DIAS[p.dow]} ${p.d}${p.conHora ? ` a las ${hhmm(p)}` : ""}`;
}
/** «jueves 3 de diciembre, 10:00» */
export function fechaEvento(valor, { tz } = {}) {
  const p = partes(valor, tz);
  if (!p) return "";
  return `${capital(DIAS[p.dow])} ${p.d} de ${MESES_LARGOS[p.m - 1]}${p.conHora && (p.h || p.min) ? `, ${hhmm(p)}` : ""}`;
}
export const horaCorta = (valor, opciones) => { const p = partes(valor, opciones?.tz); return p?.conHora ? hhmm(p) : ""; };
/** «27/11/2026 9:14» para la evidencia (confirmó, avisado en persona). */
export function fechaHora(valor, { tz } = {}) {
  const p = partes(valor, tz);
  if (!p) return "";
  return `${p.d}/${String(p.m).padStart(2, "0")}/${p.y}${p.conHora ? ` ${hhmm(p)}` : ""}`;
}

// ───────── textos de la tabla del panel ─────────
const CANALES = [["app", "App"], ["correo", "Correo"], ["push", "Push"], ["popup", "Aviso"]];
/** «App · Correo · Push · Aviso». Acepta { push, correo, popup } o una lista. App va siempre. */
export function textoCanales(canales) {
  const activo = (c) => (Array.isArray(canales) ? canales.includes(c) : Boolean(canales?.[c]));
  return CANALES.filter(([c]) => c === "app" || activo(c)).map(([, t]) => t).join(" · ");
}
export const plural = (n, uno, varios) => `${n} ${Number(n) === 1 ? uno : varios}`;

/** Lectura de una fila: «30 de 42 confirmaron», «164 lo vieron · 38 felicitaciones», «Se publica el lunes 1 a las 7:00». */
export function textoLectura(it, opciones) {
  if (!it) return "";
  if (it.estado === "programado") return `Se publica ${fechaProgramada(it.publicar_en, opciones)}`.trim();
  if (it.estado === "borrador") return "Sin publicar";
  if (it.estado === "pendiente_aprobacion") return "Espera tu aprobación";
  if (it.estado === "rechazado") return "Rechazada";
  if (it.nivel === "confirmacion") return `${Number(it.confirmados) || 0} de ${Number(it.total) || 0} confirmaron`;
  const partesTexto = [`${Number(it.vistos) || 0} lo vieron`];
  if (["cumpleanos", "aniversario", "bienvenida"].includes(it.tipo) && Number(it.reacciones) > 0) partesTexto.push(plural(it.reacciones, "felicitación", "felicitaciones"));
  return partesTexto.join(" · ");
}

/** Etiqueta de estado junto al título: { texto, tono } (tono = clase de Tailwind). */
export function etiquetaEstado(it) {
  if (!it) return null;
  const T = {
    azul: "bg-blue-50 text-blue-800", ambar: "bg-amber-100 text-amber-900", verde: "bg-green-100 text-green-800",
    gris: "bg-slate-100 text-slate-700", morado: "bg-violet-100 text-violet-800", rojo: "bg-red-100 text-red-800",
  };
  if (it.estado === "borrador") return { texto: "Borrador", tono: T.gris };
  if (it.estado === "programado") return { texto: "Programado", tono: T.morado };
  if (it.estado === "pendiente_aprobacion") return { texto: "Por aprobar", tono: T.ambar };
  if (it.estado === "rechazado") return { texto: "Rechazada", tono: T.rojo };
  if (it.estado === "archivado") return { texto: "Archivado", tono: T.gris };
  if (it.automatico) return { texto: "Automático", tono: T.azul };
  if (it.nivel === "confirmacion") {
    const completo = Number(it.total) > 0 && Number(it.confirmados) >= Number(it.total);
    return completo ? { texto: "Confirmación completa", tono: T.verde } : { texto: "Requiere confirmación", tono: T.ambar };
  }
  return { texto: "Normal", tono: T.gris };
}
/** «Sucursal Centro · 42» */
export const textoPara = (it) => [it?.audiencia_texto || "Toda la empresa", it?.total != null ? String(it.total) : null].filter(Boolean).join(" · ");

/** Tarjetas del resumen del panel. */
export function tarjetasResumen(r = {}) {
  const n = (v) => (v == null ? "—" : String(v));
  return [
    { clave: "publicados_mes", texto: "Publicados este mes", valor: n(r.publicados_mes) },
    { clave: "lectura_promedio", texto: "Lectura promedio", valor: r.lectura_promedio == null ? "—" : `${Math.round(Number(r.lectura_promedio))} %` },
    { clave: "confirmaciones_pendientes", texto: "Confirmaciones pendientes", valor: r.confirmaciones_pendientes == null ? "—" : plural(r.confirmaciones_pendientes, "persona", "personas") },
    { clave: "programados", texto: "Programados", valor: n(r.programados) },
  ];
}

// ───────── seguimiento ─────────
export const FILTROS_DESTINATARIOS = Object.freeze([
  { clave: "faltan", texto: "Faltan" },
  { clave: "confirmaron", texto: "Confirmaron" },
  { clave: "todos", texto: "Todos" },
]);
/** Estado de una persona en la tabla de seguimiento. */
export function textoDestinatario(d, opciones) {
  if (!d) return { texto: "", tono: "" };
  if (d.estado === "confirmado") return { texto: `Confirmó ${fechaRelativa(d.confirmado_en, opciones).replace(/^Hoy /, "")}`.trim(), tono: "text-green-700" };
  if (d.avisado_persona_en) return { texto: `Avisado en persona por ${d.avisado_persona_por || "RH"} · ${fechaHora(d.avisado_persona_en, opciones)}`, tono: "text-slate-700" };
  if (d.estado === "visto") return { texto: `Abrió ${horaCorta(d.visto_en, opciones) || fechaRelativa(d.visto_en, opciones)}, sin confirmar`, tono: "text-amber-800" };
  if (d.estado === "sin_canal") return { texto: "Sin app ni correo", tono: "text-red-700" };
  return { texto: "No lo ha abierto", tono: "text-slate-600" };
}
/** Tarjetas del seguimiento (confirmación o normal). conteos del servidor: { total, confirmados, vistos (incluye a los que
 *  confirmaron), vistos_sin_confirmar, no_vistos, sin_canal, faltan }. */
export function tarjetasSeguimiento(conteos = {}, nivel = "normal") {
  const n = (v) => Number(v) || 0;
  const sinConfirmar = conteos.vistos_sin_confirmar != null ? n(conteos.vistos_sin_confirmar) : Math.max(0, n(conteos.vistos) - n(conteos.confirmados));
  const base = nivel === "confirmacion"
    ? [{ clave: "confirmados", texto: "Confirmaron «Enterado»", valor: n(conteos.confirmados), tono: "text-green-700" },
      { clave: "vistos", texto: "Lo abrieron sin confirmar", valor: sinConfirmar, tono: "text-amber-700" }]
    : [{ clave: "vistos", texto: "Lo vieron", valor: n(conteos.vistos), tono: "text-green-700" }];
  return [...base,
    { clave: "no_vistos", texto: "No lo han abierto", valor: n(conteos.no_vistos), tono: "text-slate-900" },
    { clave: "sin_canal", texto: "Sin canal (avisar en persona)", valor: n(conteos.sin_canal), tono: "text-red-700" }];
}
/** Cuántos faltan (confirmación: sin confirmar; normal: sin ver). */
export function faltan(conteos = {}, nivel = "confirmacion") {
  if (conteos.faltan != null) return Number(conteos.faltan) || 0;
  const n = (v) => Number(v) || 0;
  return nivel === "confirmacion" ? Math.max(0, n(conteos.total) - n(conteos.confirmados)) : n(conteos.no_vistos) + n(conteos.sin_canal);
}
/** Totales de las pestañas Faltan / Confirmaron (o Ya lo vieron) / Todos. */
export function totalesPestanas(conteos = {}, nivel = "confirmacion") {
  const total = Number(conteos.total) || 0;
  const f = faltan(conteos, nivel);
  return { faltan: f, confirmaron: Math.max(0, total - f), todos: total };
}

/** Entregas por canal: [{ canal, detalle }]. Solo los canales que usó el comunicado (App siempre). */
export function textoEntregas(e = {}) {
  const filas = [];
  const n = (v) => Number(v) || 0;
  const usado = (x) => x && x.activo !== false;
  if (e.app) filas.push({ canal: "App", detalle: e.app.destinatarios != null ? `${n(e.app.destinatarios)} destinatarios · ${n(e.app.vistos)} lo vieron` : `${n(e.app.entregados)} entregados` });
  if (usado(e.push)) {
    filas.push({ canal: "Push", detalle: e.push.habilitado === false ? "No configurado en el servidor" : [`${n(e.push.enviados ?? e.push.entregados)} entregados`, n(e.push.sin_permiso ?? e.push.omitidos) ? `${n(e.push.sin_permiso ?? e.push.omitidos)} sin permiso` : null, n(e.push.fallidos) ? `${n(e.push.fallidos)} fallidos` : null].filter(Boolean).join(" · ") });
  }
  if (usado(e.correo)) {
    const reb = n(e.correo.rebotados ?? e.correo.fallidos);
    filas.push({ canal: "Correo", detalle: [`${n(e.correo.enviados)} enviados`, reb ? `${reb} ${reb === 1 ? "rebotado" : "rebotados"}` : null, n(e.correo.omitidos) ? `${n(e.correo.omitidos)} sin correo` : null].filter(Boolean).join(" · ") });
  }
  if (usado(e.popup)) filas.push({ canal: "Aviso emergente", detalle: e.popup.cerrados != null ? `${n(e.popup.cerrados)} lo cerraron o confirmaron` : `${n(e.popup.vistos)} de ${n(e.popup.total)} lo vieron` });
  return filas;
}

// ───────── YouTube ─────────
const ID_YT = /^[A-Za-z0-9_-]{11}$/;
/** Id de 11 caracteres de un enlace de YouTube (watch, youtu.be, shorts, embed, live) o null. */
export function youtubeId(url) {
  const s = String(url ?? "").trim();
  if (!s) return null;
  if (ID_YT.test(s)) return s;
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else { const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/); id = m?.[1] ?? null; }
  }
  return id && ID_YT.test(id) ? id : null;
}
/** URL del reproductor (sin cookies). Un id inválido no se incrusta. */
export const urlEmbed = (id) => (ID_YT.test(String(id ?? "")) ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null);
export const urlMiniatura = (id) => (ID_YT.test(String(id ?? "")) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null);

/** Solo enlaces https (portada). */
export function enlaceSeguro(url) {
  const s = String(url ?? "").trim();
  if (!s) return null;
  try { const u = new URL(s); return u.protocol === "https:" ? u.href : null; } catch { return null; }
}

// ───────── archivos (aviso inmediato; el servidor valida por bytes) ─────────
const mb = (b) => `${Math.round(b / (1024 * 1024))} MB`;
/** Errores de fotos y PDF antes de subir: { fotos?, pdf? } (vacío = bien). */
export function validarArchivos({ fotos = [], pdf = null, previas = 0 } = {}) {
  const e = {};
  if (fotos.length + previas > LIMITES.fotos) e.fotos = `Hasta ${LIMITES.fotos} fotos por publicación.`;
  else if (fotos.some((f) => !TIPOS_FOTO.includes(f.type))) e.fotos = "Las fotos deben ser JPG, PNG o WebP.";
  else if (fotos.some((f) => f.size > LIMITES.fotoBytes)) e.fotos = `Cada foto puede pesar hasta ${mb(LIMITES.fotoBytes)}.`;
  if (pdf) {
    if (pdf.type !== "application/pdf" && !/\.pdf$/i.test(pdf.name ?? "")) e.pdf = "El documento debe ser PDF.";
    else if (pdf.size > LIMITES.pdfBytes) e.pdf = `El PDF puede pesar hasta ${mb(LIMITES.pdfBytes)}.`;
  }
  return e;
}
export function validarPortada(imagen) {
  if (!imagen) return null;
  if (!TIPOS_FOTO.includes(imagen.type)) return "La portada debe ser JPG, PNG o WebP.";
  if (imagen.size > LIMITES.fotoBytes) return `La portada puede pesar hasta ${mb(LIMITES.fotoBytes)}.`;
  return null;
}
export const tamanoLegible = (b) => (b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// ───────── redactar ─────────
export const audienciaVacia = () => ({ todos: false, sucursales: [], areas: [], puestos: [], empleados: [] });
export const GRUPOS_AUDIENCIA = Object.freeze([
  { clave: "sucursales", texto: "Sucursal", plural: "Sucursales" },
  { clave: "areas", texto: "Área", plural: "Áreas" },
  { clave: "puestos", texto: "Puesto", plural: "Puestos" },
  { clave: "empleados", texto: "Persona", plural: "Personas" },
]);
/** La audiencia que va al servidor: sucursales, áreas y puestos por NOMBRE (como en la ficha del empleado) y las personas
 *  por id. Sin nada elegido el servidor entiende «toda la empresa», por eso aquí se exige elegir. */
export function audienciaParaEnviar(a = {}) {
  const nombres = (l) => {
    const vistos = new Set();
    return (l ?? []).map((x) => String(typeof x === "object" ? x.nombre : x).trim())
      .filter((n) => n && !vistos.has(n.toLocaleLowerCase("es-MX")) && vistos.add(n.toLocaleLowerCase("es-MX")));
  };
  const ids = (l) => [...new Set((l ?? []).map((x) => Number(typeof x === "object" ? x.id : x)).filter((n) => Number.isInteger(n) && n > 0))];
  if (a.todos) return { todos: true, sucursales: [], areas: [], puestos: [], empleados: [] };
  return { todos: false, sucursales: nombres(a.sucursales), areas: nombres(a.areas), puestos: nombres(a.puestos), empleados: ids(a.empleados) };
}
export const audienciaElegida = (a = {}) => Boolean(a.todos) || GRUPOS_AUDIENCIA.some((g) => (a[g.clave] ?? []).length > 0);
/** Chips de la audiencia: [{ grupo, id, texto }]. */
export function chipsAudiencia(a = {}) {
  if (a.todos) return [{ grupo: "todos", id: 0, nombre: "", texto: "Toda la empresa" }];
  return GRUPOS_AUDIENCIA.flatMap((g) => (a[g.clave] ?? []).map((x) => ({ grupo: g.clave, id: x.id, nombre: x.nombre, texto: g.clave === "empleados" ? x.nombre : `${g.texto}: ${x.nombre}` })));
}
/** «42 empleados activos · 39 con app · 35 con correo» */
export function textoPrevia(p) {
  if (!p) return "";
  return [plural(Number(p.total) || 0, "empleado activo", "empleados activos"), `${Number(p.con_app) || 0} con app`, `${Number(p.con_correo) || 0} con correo`].join(" · ");
}

/** «2026-12-01T07:00» (hora de quien escribe) → instante ISO; el servidor guarda en UTC y muestra en la zona de la empresa. */
export function instante(local) {
  if (!local) return null;
  const d = new Date(String(local).length === 10 ? `${local}T23:59:59` : local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
export const formularioVacio = () => ({
  tipo: "aviso", titulo: "", cuerpo: "", nivel: "normal", fecha_evento: "", youtube_url: "",
  permite_reacciones: true, permite_comentarios: true,
  canales: { push: true, correo: false, popup: false }, audiencia: audienciaVacia(),
  publicar: "ahora", publicar_en: "", expira_en: "", recordatorio_auto: true, recordatorios_max: 3,
});

/** Errores del formulario: { campo: mensaje } (vacío = se puede mandar). Un borrador solo pide título. */
export function validarFormulario(f, { accion = "publicar", ahora = new Date() } = {}) {
  const e = {};
  const titulo = String(f.titulo ?? "").trim();
  if (!titulo) e.titulo = "Escribe un título.";
  else if (titulo.length > LIMITES.titulo) e.titulo = `Máximo ${LIMITES.titulo} caracteres.`;
  if (String(f.cuerpo ?? "").length > LIMITES.cuerpo) e.cuerpo = `Máximo ${LIMITES.cuerpo} caracteres.`;
  if (String(f.youtube_url ?? "").trim() && !youtubeId(f.youtube_url)) e.youtube_url = "Pega un enlace de YouTube (youtube.com/watch?v=… o youtu.be/…).";
  if (accion === "borrador") return e;
  if (!String(f.cuerpo ?? "").trim()) e.cuerpo = "Escribe el mensaje.";
  if (!audienciaElegida(f.audiencia)) e.audiencia = "Elige para quién es: toda la empresa, una sucursal, área, puesto o persona.";
  if (f.publicar === "programar") {
    if (!f.publicar_en) e.publicar_en = "Elige la fecha y hora de publicación.";
    else if (new Date(f.publicar_en).getTime() <= ahora.getTime()) e.publicar_en = "La fecha de publicación debe ser futura.";
  }
  if (f.expira_en) {
    const desde = f.publicar === "programar" && f.publicar_en ? new Date(f.publicar_en) : ahora;
    if (new Date(`${f.expira_en}T23:59:59`).getTime() <= desde.getTime()) e.expira_en = "Debe ser después de la publicación.";
  }
  return e;
}

/** Campos JSON del multipart (`datos`). accion: publicar | borrador. */
export function datosParaEnviar(f, { accion = "publicar", empresa = null } = {}) {
  const yt = String(f.youtube_url ?? "").trim();
  const conf = f.nivel === "confirmacion";
  return {
    ...(empresa ? { empresa: Number(empresa) } : {}),
    tipo: f.tipo, titulo: String(f.titulo ?? "").trim(), cuerpo: String(f.cuerpo ?? "").trim(), nivel: conf ? "confirmacion" : "normal",
    fecha_evento: f.fecha_evento ? String(f.fecha_evento).slice(0, 10) : null, youtube_url: yt || null,
    permite_reacciones: Boolean(f.permite_reacciones), permite_comentarios: Boolean(f.permite_comentarios),
    canales: { push: Boolean(f.canales?.push), correo: Boolean(f.canales?.correo), popup: Boolean(f.canales?.popup) },
    audiencia: audienciaParaEnviar(f.audiencia),
    publicar: accion === "borrador" ? "borrador" : f.publicar === "programar" ? "programar" : "ahora",
    publicar_en: f.publicar === "programar" && f.publicar_en ? instante(f.publicar_en) : null,
    expira_en: f.expira_en ? instante(f.expira_en) : null,
    recordatorio_auto: conf ? Boolean(f.recordatorio_auto) : false,
    recordatorios_max: conf && f.recordatorio_auto ? Math.min(LIMITES.recordatorios, Math.max(1, Number(f.recordatorios_max) || LIMITES.recordatorios)) : 0,
  };
}
/** Valor del servidor (ISO con zona o «YYYY-MM-DD HH:MM») → «YYYY-MM-DDTHH:MM» para un input datetime-local. */
export function localDe(v) {
  if (!v) return "";
  const t = String(v).trim();
  if (!CON_ZONA.test(t)) return t.slice(0, 16).replace(" ", "T");
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
/** Formulario a partir de un comunicado guardado (editar borrador o programado). */
export function formularioDe(c) {
  const f = formularioVacio();
  if (!c) return f;
  const a = c.audiencia ?? {};
  const lista = (l) => (l ?? []).map((x) => (typeof x === "object" ? { id: Number(x.id), nombre: x.nombre ?? String(x.id) } : { id: Number(x), nombre: String(x) }));
  return {
    ...f, tipo: c.tipo ?? f.tipo, titulo: c.titulo ?? "", cuerpo: c.cuerpo ?? "", nivel: c.nivel === "confirmacion" ? "confirmacion" : "normal",
    fecha_evento: String(c.fecha_evento ?? "").slice(0, 10), youtube_url: c.youtube_id ? `https://youtu.be/${c.youtube_id}` : c.youtube_url ?? "",
    permite_reacciones: c.permite_reacciones !== false && c.permite_reacciones !== 0, permite_comentarios: c.permite_comentarios !== false && c.permite_comentarios !== 0,
    canales: { push: Boolean(c.canales?.push), correo: Boolean(c.canales?.correo), popup: Boolean(c.canales?.popup) },
    audiencia: { todos: Boolean(a.todos), sucursales: lista(a.sucursales), areas: lista(a.areas), puestos: lista(a.puestos), empleados: lista(a.empleados) },
    publicar: c.estado === "programado" ? "programar" : "ahora", publicar_en: localDe(c.publicar_en),
    expira_en: localDe(c.expira_en).slice(0, 10), recordatorio_auto: c.recordatorio_auto !== false && c.recordatorio_auto !== 0,
    recordatorios_max: Number(c.recordatorios_max) || 3,
  };
}
/** Texto del botón principal: «Publicar a 42 personas», «Programar para 42 personas», «Publicar». */
export function textoPublicar(f, total) {
  const n = Number(total);
  const quien = Number.isFinite(n) && n > 0 ? plural(n, "persona", "personas") : null;
  if (f.publicar === "programar") return quien ? `Programar para ${quien}` : "Programar";
  return quien ? `Publicar a ${quien}` : "Publicar";
}

// ───────── muro del empleado ─────────
export const iniciales = (nombre) => String(nombre ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";
/** «Tú y 53 más», «Tú», «54 me gusta», «Sé el primero». */
export function textoReacciones(n, meGusta) {
  const total = Number(n) || 0;
  if (meGusta) return total <= 1 ? "Te gusta" : `Tú y ${total - 1} más`;
  return total ? `${total} me gusta` : "";
}
export const textoComentarios = (n) => (Number(n) ? plural(Number(n), "comentario", "comentarios") : "");
/** Me gusta optimista: el estado nuevo antes de la respuesta del servidor. */
export function alternarMeGusta(it) {
  const me = !it.me_gusta;
  return { ...it, me_gusta: me, reacciones: Math.max(0, (Number(it.reacciones) || 0) + (me ? 1 : -1)) };
}
/** Fijados arriba (como mucho 3, en el orden del servidor) y luego el resto, sin repetir. */
export function ordenarMuro(items = []) {
  const vistos = new Set();
  const unicos = items.filter((i) => (vistos.has(i.id) ? false : vistos.add(i.id)));
  const fijados = unicos.filter((i) => i.fijado).slice(0, LIMITES.fijados);
  const ids = new Set(fijados.map((i) => i.id));
  return { fijados, resto: unicos.filter((i) => !ids.has(i.id)) };
}
/** ¿Le toca confirmar? (las altas posteriores ven los avisos generales, pero no se les pide confirmar los viejos). */
export const porConfirmar = (it) => (it?.requiere_confirmar != null ? Boolean(it.requiere_confirmar) : it?.nivel === "confirmacion" && !it?.confirmado_en);
/** Franja «1 comunicado por confirmar: Auditoría del jueves 3». */
export function textoPendientes(n, primero) {
  const total = Number(n) || 0;
  if (!total) return "";
  return `${plural(total, "comunicado", "comunicados")} por confirmar${primero?.titulo ? `: ${primero.titulo}` : ""}`;
}
/** Mosaico de fotos: cuántas se ven y cuántas quedan («+5»). */
export function mosaico(n) {
  const total = Number(n) || 0;
  const visibles = Math.min(total, total === 4 ? 4 : 3);
  return { visibles, resto: Math.max(0, total - visibles), clase: total <= 1 ? "uno" : total === 2 ? "dos" : total === 4 ? "cuatro" : "tres" };
}
export const fotosDe = (it) => (it?.adjuntos ?? []).filter((a) => a.tipo === "foto" || a.tipo === "imagen");
export const pdfDe = (it) => (it?.adjuntos ?? []).find((a) => a.tipo === "pdf") ?? null;
/** «Recursos Humanos · Evento · Toda la empresa» */
export const lineaAutor = (it, opciones) => [fechaRelativa(it?.publicado_en, opciones), it?.tipo && it.tipo !== "publicacion" ? textoTipo(it.tipo) : null, it?.audiencia_texto].filter(Boolean).join(" · ");

// ───────── comentarios ─────────
/** Hilos de un nivel: [{ ...comentario, respuestas: [] }] desde una lista plana (padre_id) o ya anidada. */
export function hilos(lista = []) {
  const raiz = [];
  const porId = new Map();
  for (const c of lista) {
    if (c.padre_id == null) { const n = { ...c, respuestas: [...(c.respuestas ?? [])] }; porId.set(c.id, n); raiz.push(n); }
  }
  for (const c of lista) {
    if (c.padre_id == null) continue;
    const padre = porId.get(c.padre_id);
    if (padre) { if (!padre.respuestas.some((r) => r.id === c.id)) padre.respuestas.push(c); } else raiz.push({ ...c, respuestas: [] });
  }
  return raiz;
}
export function validarComentario(texto) {
  const t = String(texto ?? "").trim();
  if (!t) return "Escribe tu comentario.";
  if (t.length > LIMITES.comentario) return `Máximo ${LIMITES.comentario} caracteres.`;
  return null;
}
/** Hace cuánto: «ahora», «40 min», «2 h», «Ayer», «24 nov». */
export function haceCuanto(valor, { ahora = new Date(), tz } = {}) {
  if (!valor) return "";
  const f = typeof valor === "string" && !CON_ZONA.test(valor.trim()) ? null : new Date(valor);
  if (f && !Number.isNaN(f.getTime())) {
    const min = Math.floor((ahora.getTime() - f.getTime()) / 60000);
    if (min < 1) return "ahora";
    if (min < 60) return `${min} min`;
    if (min < 24 * 60) return `${Math.floor(min / 60)} h`;
  }
  return fechaRelativa(valor, { ahora, tz }).replace(/ \d+:\d{2}$/, "");
}

// ───────── moderación y reglas ─────────
export const FILTROS_MODERACION = Object.freeze([
  { clave: "reportados", texto: "Reportados" },
  { clave: "retenidos", texto: "Retenidos por palabra" },
  { clave: "ocultos", texto: "Ocultos" },
]);
export const QUIEN_PUBLICA = Object.freeze([
  { clave: "rh", texto: "Solo RH y dirección", publican_jefes: false, publican_empleados: false },
  { clave: "jefes", texto: "También jefes, para su área", publican_jefes: true, publican_empleados: false },
  { clave: "todos", texto: "Todos, con aprobación de RH antes de salir", publican_jefes: true, publican_empleados: true },
]);
export const quienPublica = (c = {}) => (truthy(c.publican_empleados) ? "todos" : truthy(c.publican_jefes) ? "jefes" : "rh");
const truthy = (v) => v === true || v === 1 || v === "1";
/** Palabras bloqueadas: una por línea o separadas por coma; sin vacías ni repetidas, en minúsculas. */
export function palabrasDe(texto) {
  return [...new Set(String(texto ?? "").split(/[\n,]/).map((p) => p.trim().toLocaleLowerCase("es-MX")).filter(Boolean))].slice(0, 500);
}
export const configVacia = () => ({ publican_jefes: true, publican_empleados: true, permitir_reacciones: true, permitir_comentarios: true, palabras_bloqueadas: [], umbral_reportes: 3, hora_automaticos: "08:00" });
export function normalizarConfig(c = {}) {
  const v = { ...configVacia(), ...(c ?? {}) };
  return {
    publican_jefes: truthy(v.publican_jefes), publican_empleados: truthy(v.publican_empleados),
    permitir_reacciones: truthy(v.permitir_reacciones), permitir_comentarios: truthy(v.permitir_comentarios),
    palabras_bloqueadas: Array.isArray(v.palabras_bloqueadas) ? v.palabras_bloqueadas : palabrasDe(v.palabras_bloqueadas),
    umbral_reportes: Math.min(50, Math.max(1, Number(v.umbral_reportes) || 3)), hora_automaticos: horaHH(v.hora_automaticos),
  };
}

// ───────── automáticos ─────────
export const REGLAS_AUTO = Object.freeze([
  { regla: "cumpleanos", titulo: "Cumpleaños del día", cuando: "hora", detalle: "Plantilla de felicitación de cumpleaños" },
  { regla: "aniversario", titulo: "Aniversario laboral", cuando: "hora", detalle: "Plantilla de felicitación de aniversario" },
  { regla: "bienvenida", titulo: "Bienvenida a nuevo ingreso", cuando: "primer_dia", detalle: "Al darlo de alta en Inducción" },
  { regla: "festivo", titulo: "Días festivos oficiales", cuando: "dos_dias", detalle: "Del calendario de festivos de la empresa" },
]);
export const AUDIENCIAS_AUTO = Object.freeze([{ clave: "empresa", texto: "Toda la empresa" }, { clave: "sucursal", texto: "Su sucursal" }, { clave: "area", texto: "Su área" }]);
export function cuandoAuto(regla, hora = 8) {
  const r = REGLAS_AUTO.find((x) => x.regla === regla);
  if (r?.cuando === "dos_dias") return "2 días antes";
  if (r?.cuando === "primer_dia") return "Su primer día";
  return `${hora12(horaHH(hora))} del día`;
}
/** 8, «8» u «08:00» → «08:00». */
export function horaHH(h) {
  const m = String(h ?? "").trim().match(/^(\d{1,2})(?::\d{2})?$/);
  const n = m ? Number(m[1]) : 8;
  return `${String(n >= 0 && n <= 23 ? n : 8).padStart(2, "0")}:00`;
}
export function hora12(h) {
  const m = String(h ?? "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  return `${Number(m[1])}:${m[2]}`;
}
/** Reglas completas en el orden de la maqueta, con lo que mandó el servidor encima. */
export function reglasAuto(servidor = []) {
  const por = new Map((servidor ?? []).map((r) => [r.regla, r]));
  return REGLAS_AUTO.map((base) => {
    const s = por.get(base.regla) ?? {};
    const canales = s.canales ?? (base.regla === "bienvenida" ? {} : { push: true });
    return { regla: base.regla, activo: s.activo == null ? base.regla !== "bienvenida" : truthy(s.activo), audiencia: s.audiencia ?? (base.regla === "aniversario" ? "sucursal" : base.regla === "bienvenida" ? "area" : "empresa"), canales: { push: Boolean(canales.push), correo: Boolean(canales.correo), popup: false }, id_plantilla: s.id_plantilla ?? null };
  });
}
/** «Mañana: 2 cumpleaños y 1 aniversario» */
export function textoManana(m) {
  if (!m) return "";
  const partesM = [];
  if (Number(m.cumpleanos)) partesM.push(`${m.cumpleanos} cumpleaños`);
  if (Number(m.aniversarios ?? m.aniversario)) { const n = Number(m.aniversarios ?? m.aniversario); partesM.push(plural(n, "aniversario", "aniversarios")); }
  if (Number(m.festivos ?? m.festivo)) { const n = Number(m.festivos ?? m.festivo); partesM.push(plural(n, "festivo", "festivos")); }
  if (Number(m.bienvenidas ?? m.bienvenida)) { const n = Number(m.bienvenidas ?? m.bienvenida); partesM.push(plural(n, "bienvenida", "bienvenidas")); }
  if (!partesM.length) return "Mañana: nada programado.";
  return `Mañana: ${partesM.length > 1 ? `${partesM.slice(0, -1).join(", ")} y ${partesM.at(-1)}` : partesM[0]}`;
}

// ───────── errores y respuestas ─────────
/** Mensaje del servidor ({ mensaje } o { error }) o uno por defecto. Sin red: aviso claro. */
export function errorDe(e, porDefecto = "No se pudo completar la acción. Intenta de nuevo.") {
  const d = e?.response?.data;
  if (d?.mensaje) return d.mensaje;
  if (typeof d?.error === "string") return d.error;
  if (e?.response?.status === 503 && d?.codigo === "SIN_MIGRACION") return "El módulo de comunicados aún no está instalado en el servidor.";
  if (e && !e.response && e.request) return "Sin conexión. Revisa tu internet e intenta de nuevo.";
  return porDefecto;
}
/** El objeto principal de una respuesta, se llame como se llame ({ comunicado }, { item }, { popup } o el cuerpo). */
export function principal(data, ...claves) {
  if (!data || typeof data !== "object") return null;
  for (const c of [...claves, "comunicado", "item"]) if (c in data) return data[c] ?? null;
  return data.id != null ? data : null;
}
/** Rutas del aviso emergente: Mi espacio (/mi) o panel (usuario del panel ligado a un empleado). */
export function rutasPopup(modo = "empleado") {
  const base = modo === "panel" ? API : API_MI;
  return {
    popup: `${base}/popup`,
    confirmar: (id) => `${base}/${encodeURIComponent(id)}/confirmar`,
    posponer: (id) => `${base}/${encodeURIComponent(id)}/posponer`,
  };
}
/** Aviso emergente pendiente o null. */
export const popupDe = (data) => principal(data, "popup", "aviso");
/** Descripción corta del dispositivo para la evidencia de la confirmación (el servidor guarda además la IP). */
export function dispositivo(ua = "", nativo = false) {
  const s = String(ua);
  const so = /iPhone|iPad|iPod/.test(s) ? "iOS" : /Android/.test(s) ? "Android" : /Windows/.test(s) ? "Windows" : /Mac OS X/.test(s) ? "macOS" : /Linux/.test(s) ? "Linux" : "Otro";
  const nav = /Edg\//.test(s) ? "Edge" : /OPR\//.test(s) ? "Opera" : /Chrome\//.test(s) ? "Chrome" : /Firefox\//.test(s) ? "Firefox" : /Safari\//.test(s) ? "Safari" : "Navegador";
  return `${nativo ? "App ADAMIA" : nav} · ${so}`.slice(0, 120);
}
/** Clave pública VAPID (base64url) → Uint8Array para pushManager.subscribe. */
export function claveVapid(base64) {
  const s = String(base64 ?? "").replace(/-/g, "+").replace(/_/g, "/");
  const relleno = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = typeof atob === "function" ? atob(s + relleno) : Buffer.from(s + relleno, "base64").toString("binary");
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
