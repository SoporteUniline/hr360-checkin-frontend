// Inducción digital (27/12/2026): reglas de presentación compartidas por las pantallas de RH, la liga del celular y la
// ruta de bienvenida. Sin red ni React: probado en scripts/test-induccion.mjs. Las reglas de negocio (plantilla más
// específica, plazos, responsables, congelado, validaciones) viven en el backend (modules/induccion/services/reglas.js);
// aquí solo se repite lo necesario para avisar ANTES de mandar (el servidor vuelve a validar todo).

import { mensajeRechazoPorPeso } from "../errorSubida.mjs";

export const RUTA_TABLERO = "/panel/nuevos-ingresos";
export const RUTA_PLANTILLAS = "/panel/plantillas-induccion";
export const RUTA_BIENVENIDA = "/empleado/panel/bienvenida";
export const API = "/checador/induccion";
export const rutaPublica = (token) => `${API}/publico/${encodeURIComponent(token)}`;

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fecha = (f) => new Date(`${String(f).slice(0, 10)}T12:00:00Z`);

/** «lun 1 dic», «hoy», «mañana». */
export function fechaCorta(f, hoy) {
  if (!f) return "—";
  const s = String(f).slice(0, 10);
  if (hoy && s === hoy) return "hoy";
  if (hoy && s === new Date(fecha(hoy).getTime() + 86400000).toISOString().slice(0, 10)) return "mañana";
  const d = fecha(s);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}
/** «1 de diciembre de 2026». */
export const fechaLarga = (f) => { if (!f) return ""; const d = fecha(f); return `${d.getUTCDate()} de ${MESES_LARGOS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; };
/** «9:00 a. m.» */
export function hora12(h) {
  if (!/^\d{2}:\d{2}/.test(String(h ?? ""))) return "";
  const [hh, mm] = String(h).split(":").map(Number);
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "a. m." : "p. m."}`;
}

/** Plazo de una tarea: «1 día antes», «Día 1», «Día 5» (−N = días antes; Día 1 = ingreso). */
export function etiquetaDia(dia) {
  const d = Number(dia);
  if (d < 0) return `${-d} ${d === -1 ? "día" : "días"} antes`;
  return `Día ${d}`;
}
export const OPCIONES_DIA = [-5, -3, -2, -1, 1, 2, 3, 5, 7, 10, 15, 30].map((d) => ({ valor: d, texto: etiquetaDia(d) }));

export const ALCANCES = [
  { valor: "general", texto: "General · toda la empresa" },
  { valor: "puesto", texto: "Puesto" },
  { valor: "area", texto: "Área" },
  { valor: "sucursal", texto: "Sucursal" },
];
export function textoAlcance(p) {
  if (!p) return "";
  if (p.alcance === "general") return "General · toda la empresa";
  const tipo = { puesto: "Puesto", area: "Área", sucursal: "Sucursal" }[p.alcance] ?? "";
  return `${tipo}: ${p.alcance_valor ?? ""}`;
}

export const TIPOS_PASO = { contenido: "Contenido", curso: "Curso", equipo: "Tu equipo", encuesta: "Encuesta de Clima" };

export function textoResponsable(r, { roles = [], personas = [] } = {}) {
  if (!r) return "Sin responsable";
  if (r.tipo === "jefe") return "Su jefe directo";
  if (r.tipo === "rol") {
    const rol = roles.find((x) => Number(x.id_rol) === Number(r.id_rol));
    return rol ? `${rol.persona ? `${rol.persona.split(" ")[0]} ` : ""}(${rol.nombre})`.trim() : "Rol";
  }
  return personas.find((x) => Number(x.id) === Number(r.id_empleado))?.nombre ?? "Persona";
}

// ───────── tablero ─────────
export const iniciales = (p) => [p?.nombre, p?.apellido_paterno].filter(Boolean).map((x) => x[0]).join("").toUpperCase() || "?";
const PALETA = [["bg-green-100", "text-green-800"], ["bg-indigo-100", "text-indigo-800"], ["bg-pink-100", "text-pink-800"], ["bg-amber-100", "text-amber-900"], ["bg-sky-100", "text-sky-800"]];
export function colorAvatar(id) { const [fondo, texto] = PALETA[Math.abs(Number(id) || 0) % PALETA.length]; return `${fondo} ${texto}`; }
export const origenTexto = (p, hoy) => (p.estado === "alta" && String(p.fecha_ingreso) === hoy ? "Ingresó hoy" : p.origen === "reclutamiento" ? "Vino de Reclutamiento" : "Alta manual");

/** Chips de avance: [{ texto, tono: listo | parcial | pendiente }] y porcentaje de la barra. */
export function chipsAvance(av) {
  if (!av) return { chips: [], porcentaje: 0 };
  const doc = av.documentos ?? { listos: 0, total: 0 };
  const docsListos = doc.total > 0 && doc.listos >= doc.total;
  const chips = [
    { clave: "datos", texto: av.datos ? "✓ Datos" : "Datos", tono: av.datos ? "listo" : "pendiente" },
    { clave: "documentos", texto: docsListos ? "✓ Documentos" : `Documentos ${doc.listos}/${doc.total}`, tono: docsListos ? "listo" : doc.listos > 0 ? "parcial" : "pendiente" },
    { clave: "firma", texto: av.firma ? "✓ Firma" : "Firma", tono: av.firma ? "listo" : "pendiente" },
    { clave: "rostro", texto: av.rostro ? "✓ Rostro" : "Rostro", tono: av.rostro ? "listo" : "pendiente" },
  ];
  const partes = [av.datos ? 1 : 0, doc.total ? doc.listos / doc.total : 1, av.firma ? 1 : 0, av.rostro ? 1 : 0];
  return { chips, porcentaje: Math.round((partes.reduce((a, b) => a + b, 0) / partes.length) * 100) };
}
export const TONO_CHIP = { listo: "bg-green-100 text-green-800 font-bold", parcial: "bg-amber-100 text-amber-900 font-bold", pendiente: "bg-slate-100 text-slate-600 font-semibold" };

// ───────── datos de la persona (aviso inmediato; el servidor valida igual) ─────────
const CURP = /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;
const RFC = /^([A-ZÑ&]{4})\d{6}[A-Z\d]{3}$/;
const digitos = (v) => String(v ?? "").replace(/\D/g, "");
export function clabeValida(v) {
  const s = digitos(v);
  if (s.length !== 18) return false;
  const pesos = [3, 7, 1];
  const suma = [...s.slice(0, 17)].reduce((t, d, i) => t + ((Number(d) * pesos[i % 3]) % 10), 0);
  return (10 - (suma % 10)) % 10 === Number(s[17]);
}
/** Error de un campo del paso «Datos» (o null). */
export function errorCampo(clave, valor, datos = {}) {
  const v = String(valor ?? "").trim();
  if (!v) return null;
  switch (clave) {
    case "curp": return CURP.test(v.toUpperCase()) ? null : "La CURP tiene 18 caracteres (revisa letras y números).";
    case "rfc": {
      if (!RFC.test(v.toUpperCase())) return "El RFC con homoclave tiene 13 caracteres.";
      const curp = String(datos.curp ?? "").toUpperCase();
      return curp.length === 18 && curp.slice(0, 10) !== v.toUpperCase().slice(0, 10) ? "El RFC no coincide con tu CURP (los primeros 10 caracteres)." : null;
    }
    case "nss": return digitos(v).length === 11 ? null : "El número de seguridad social tiene 11 dígitos.";
    case "clabe": return clabeValida(v) ? null : "La CLABE tiene 18 dígitos; revisa que esté bien escrita.";
    case "telefono": case "telefono_emergencia": return digitos(v).slice(-10).length === 10 ? null : "Escribe 10 dígitos.";
    case "correo": return /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/.test(v) ? null : "Correo inválido.";
    case "direccion": return v.length >= 10 ? null : "Escribe calle, número, colonia, ciudad y código postal.";
    default: return null;
  }
}

// ───────── liga del celular ─────────
export const PASOS = [
  { clave: "datos", texto: "Datos" },
  { clave: "documentos", texto: "Documentos" },
  { clave: "firma", texto: "Firma" },
  { clave: "rostro", texto: "Rostro" },
];
/** Primer paso pendiente (para continuar donde se quedó). */
export function pasoInicial(v) {
  if (!v?.avance?.datos) return "datos";
  if ((v.documentos ?? []).some((d) => d.obligatorio && ["pendiente", "parcial", "rechazado"].includes(d.estado))) return "documentos";
  if (!v.avance.firma) return "firma";
  if (!v.avance.rostro) return "rostro";
  return "listo";
}
export const ESTADO_DOC = {
  pendiente: { texto: "Pendiente", tono: "text-slate-500" },
  parcial: { texto: "Falta un lado", tono: "text-amber-800" },
  recibido: { texto: "Recibido", tono: "text-green-700" },
  con_dato: { texto: "Listo", tono: "text-green-700" },
  aprobado: { texto: "Aprobado por RH", tono: "text-green-700" },
  rechazado: { texto: "Corregir", tono: "text-red-700" },
};
export const docListo = (d) => ["recibido", "con_dato", "aprobado"].includes(d?.estado);
export const contarListos = (docs = []) => ({ listos: docs.filter(docListo).length, total: docs.length });

/** Mensaje de un error de la liga pública. */
export function errorPublico(e) {
  const codigo = e?.response?.data?.codigo;
  const texto = e?.response?.data?.error;
  if (["ENLACE_INVALIDO", "ENLACE_VENCIDO", "ENLACE_USADO", "NO_DISPONIBLE"].includes(codigo)) {
    return { fin: true, codigo, titulo: { ENLACE_INVALIDO: "Esta liga no es válida", ENLACE_VENCIDO: "Esta liga ya venció", ENLACE_USADO: "Este ingreso ya se cerró", NO_DISPONIBLE: "No disponible por ahora" }[codigo], texto };
  }
  if (e?.response?.status === 429) return { fin: false, texto: texto || "Demasiados intentos. Espera unos minutos." };
  // 413 de nginx en HTML (no llegó al backend): «El archivo pesa demasiado…».
  const pesado = mensajeRechazoPorPeso(e);
  if (pesado) return { fin: false, texto: pesado };
  if (!e?.response) return { fin: false, texto: "Sin conexión. Revisa tu internet e intenta de nuevo; lo que ya guardaste no se pierde." };
  return { fin: false, texto: texto || "No se pudo guardar. Intenta de nuevo.", campos: e?.response?.data?.campos ?? null };
}

/** Texto de la invitación (vista previa del WhatsApp en el panel). Mismo texto que la plantilla de Meta. */
export function textoInvitacion({ nombre, empresa, puesto, fechaIngreso, horaIngreso }) {
  const d = fechaIngreso ? fecha(fechaIngreso) : null;
  const dia = d ? `${["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d.getUTCDay()]} ${d.getUTCDate()} de ${MESES_LARGOS[d.getUTCMonth()]}${horaIngreso ? ` a las ${hora12(horaIngreso)}` : ""}` : "…";
  return `Hola ${nombre || "…"}, ${empresa || "tu empresa"} registró tu ingreso como ${puesto || "colaborador"}. Tu primer día: ${dia}, y para completar tu alta llena tus datos, sube tus documentos y firma desde tu celular en tu liga personal.`;
}

/** Agrupa las tareas del checklist por su grupo (RH, Sistemas, Jefe directo…), en el orden de la plantilla. */
export function agruparTareas(tareas = []) {
  const grupos = [];
  for (const t of tareas) {
    let g = grupos.find((x) => x.grupo === t.grupo);
    if (!g) { g = { grupo: t.grupo, responsable: t.responsable_nombre, tareas: [] }; grupos.push(g); }
    g.tareas.push(t);
    if (!g.responsable && t.responsable_nombre) g.responsable = t.responsable_nombre;
  }
  return grupos;
}
