// «Dos campos: Qué pasó (tipo) y Motivo (por qué), con el goce en el motivo» (aprobado por Diego, 24/11/2026).
// QUÉ PASÓ = tipo del catálogo `tipos_permiso` que se ofrece en capturas nuevas (`captura` 1): Asistencia, Inasistencia,
// Entrada tarde, Salida temprano, Salir en medio turno y los días de ley (goce fijo en el tipo). MOTIVO = catálogo
// `motivos_permiso`, con su configuración de pago (goce, horas no trabajadas, se cambia al aplicar) por empresa.
// Reglas (el servidor las aplica igual; aquí solo se muestran y se arma el cuerpo de cada petición):
//  · Inasistencia sin motivo = injustificada (sin goce, acta en borrador); con motivo = goce del motivo.
//  · Entrada tarde / Salida temprano / Salir en medio turno con motivo = día con goce y las horas como diga el motivo;
//    sin motivo = retardo / salida antes sin permiso (sin permiso_dia).
//  · Días de ley: goce del tipo, sin motivo.
//  · Tipos ocultos (`captura` 0) no se ofrecen, pero un registro viejo los muestra tal cual.
// Los íconos van por `rol` del tipo, nunca por el nombre. Lo usan la fila de Asistencias, el reloj, la vista móvil,
// Permisos y el catálogo. Probado en scripts/test-quepaso-motivo.mjs.
import { durTexto, estadoFila, requisitoEstado, textoConIcono } from "./relojDia.mjs";
import { HORAS_TXT, alcanceDe, goceDe, normalizarTipo, permisoFila, sinEmoji, tipoHorasDe } from "./tiposGoce.mjs";

const num = (v) => Number(v ?? 0);
const si = (v) => v === true || v === 1 || v === "1";
const plano = (s) => sinEmoji(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

export const ROLES = ["asistencia", "inasistencia", "entrada", "salida", "medio", "ley", "sistema", "heredado", "propio"];
// Ícono por rol (y «justificada» para la inasistencia con motivo).
export const ICONO_ROL = {
  asistencia: "✅", inasistencia: "❌", justificada: "📝", entrada: "⌚", salida: "⏳", medio: "🚶", ley: "📅", heredado: "📝", propio: "📌",
};
// Valores especiales de los selects.
export const ASISTENCIA = "__asistencia";
export const OTRO_MOTIVO = "__otro";
const HORAS_CORTO = { reponen: "las repone", descuentan: "se descuentan", pagan: "se pagan" };

// ——— Tipos («Qué pasó») ———
// Rol del tipo: el del servidor; si aún no lo manda, el mismo respaldo que la migración (nombre exacto y alcance).
export function rolDe(t) {
  if (ROLES.includes(t?.rol)) return t.rol;
  const n = plano(t?.nombre);
  if (/^asistencia$/.test(n)) return "asistencia";
  if (/sin checar|cerrado por sistema/.test(n)) return "sistema";
  if (/^(inasistencia|falta)( injustificada)?$/.test(n)) return "inasistencia";
  if (num(t?.fijo_ley) === 1) return "ley";
  const propio = t?.id_empresa != null && t?.id_empresa !== "";
  const alcance = alcanceDe(t);
  if (alcance !== "dia") return propio ? "propio" : alcance;
  return propio ? "propio" : "heredado";
}
// ¿Se ofrece en capturas nuevas? Con `captura` del servidor; si no viene, todo menos lo del sistema (como antes).
export function capturaDe(t) {
  if (!t || num(t.borrado) || num(t.eliminado)) return false;
  if (t.captura != null && t.captura !== "") return si(t.captura) || t.captura === true;
  return rolDe(t) !== "sistema";
}
// Cómo se captura: asistencia | inasistencia | parcial | ley | dia (propio o anterior de día completo) | sistema.
export function claseDe(t) {
  const r = rolDe(t);
  if (["asistencia", "inasistencia", "ley", "sistema"].includes(r)) return r;
  if (["entrada", "salida", "medio"].includes(r)) return "parcial";
  return alcanceDe(t) === "dia" ? "dia" : "parcial";
}
const ORDEN = { asistencia: 0, inasistencia: 1, parcial: 2, dia: 3, ley: 4 };
export const nombreTipo = (t) => sinEmoji(t?.nombre) || String(t?.nombre ?? "");
const listaTipos = (tipos) => (Array.isArray(tipos) ? tipos : tipos?.tiposPermiso ?? []);
// Tipos que se ofrecen (sin «Asistencia», que va como opción fija). `conChecadas`: solo los parciales (reloj con
// checadas). `actual`: el id guardado; si es un tipo oculto se agrega tal cual para que el select lo muestre.
export function tiposCaptura(tipos, { conChecadas = false, actual = null } = {}) {
  const todos = listaTipos(tipos);
  const lista = todos.filter((t) => capturaDe(t) && !["asistencia", "sistema"].includes(claseDe(t))
    && (!conChecadas || claseDe(t) === "parcial"));
  const orden = lista.map((t, i) => [t, i]).sort((a, b) => ORDEN[claseDe(a[0])] - ORDEN[claseDe(b[0])] || a[1] - b[1]).map(([t]) => t);
  if (actual != null && actual !== "" && !orden.some((t) => String(t.id) === String(actual))) {
    const viejo = todos.find((t) => String(t.id) === String(actual));
    if (viejo && !["asistencia", "sistema"].includes(claseDe(viejo))) orden.push({ ...viejo, _historial: true });
  }
  return orden;
}
// Los que se piden en Permisos (RH y empleado): inasistencia (con motivo) y los parciales; los propios o de ley solo si
// el catálogo los marca como permiso. `conVacaciones`: el empleado también pide vacaciones aquí (descuentan del saldo).
export function tiposPermisoCaptura(tipos, { actual = null, conVacaciones = false } = {}) {
  return tiposCaptura(tipos, { actual }).filter((t) => t._historial || ["inasistencia", "parcial"].includes(claseDe(t)) || num(t.es_permiso) === 1
    || (conVacaciones && num(t.descuenta_vacaciones) === 1));
}
// Opciones del select «Qué pasó»: [{ value, label }].
export function opcionesTipo(tipos, { conAsistencia = true } = {}) {
  return [
    ...(conAsistencia ? [{ value: ASISTENCIA, label: "Asistencia", clase: "asistencia", rol: "asistencia" }] : []),
    // Los días de ley van al final con 🔒 (su goce lo fija la ley, no lleva motivo).
    ...tipos.map((t) => ({ value: String(t.id), label: claseDe(t) === "ley" ? `${nombreTipo(t)} 🔒` : nombreTipo(t), clase: claseDe(t),
      rol: rolDe(t), historial: Boolean(t._historial) })),
  ];
}

// ——— Motivos ———
const esOtro = (nombre) => /^otro$/i.test(String(nombre ?? "").trim());
// Forma única del motivo con su configuración efectiva (la de la empresa para los globales).
export function normalizarMotivo(m) {
  if (!m) return null;
  if (typeof m === "string") m = { id: m, nombre: m, global: true };
  const horas = m.horas ?? m.horas_no_trabajadas;
  return {
    id: String(m.id), nombre: String(m.nombre ?? "").trim(), global: m.global !== false && m.global !== 0,
    goce: goceDe(m.goce ?? m.goce_sueldo), horas: HORAS_TXT[horas] ? horas : null,
    cambia: m.cambia_al_aplicar == null ? true : si(m.cambia_al_aplicar),
    personalizado: si(m.personalizado), oculto: si(m.oculto) || m.activo === false || m.activo === 0, otro: esOtro(m.nombre),
  };
}
const listaMotivosApi = (motivos) => (Array.isArray(motivos) ? motivos : motivos?.motivos ?? []);
// Motivos que se ofrecen: visibles, «Otro» al final como «Otro…» (pide escribirlo). Si el catálogo no trae «Otro»,
// se ofrece igual (solo viaja el texto).
export function motivosCaptura(motivos) {
  const lista = listaMotivosApi(motivos).map(normalizarMotivo).filter((m) => m && m.nombre && !m.oculto);
  const otro = lista.find((m) => m.otro) ?? { id: OTRO_MOTIVO, nombre: "Otro", global: true, goce: null, horas: null, cambia: true, otro: true, sinCatalogo: true };
  return [...lista.filter((m) => !m.otro), otro];
}
export const opcionesMotivo = (motivos) => motivosCaptura(motivos).map((m) => ({ value: m.id, label: m.otro ? "Otro…" : m.nombre, otro: m.otro }));
export const motivoPorId = (motivos, id) => (id ? motivosCaptura(motivos).find((m) => m.id === String(id)) ?? null : null);
// Motivo guardado (id o texto) → { motivo, texto } del par de selects.
export function motivoGuardado(motivos, { id = null, nombre = "" } = {}) {
  const lista = motivosCaptura(motivos);
  const n = String(nombre ?? "").trim();
  const porId = id != null && id !== "" ? lista.find((m) => m.id === String(id)) : null;
  if (porId) return { motivo: porId.id, texto: porId.otro && !esOtro(n) ? n : "" };
  if (!n) return { motivo: "", texto: "" };
  const porNombre = lista.find((m) => !m.otro && m.nombre.toLowerCase() === n.toLowerCase());
  if (porNombre) return { motivo: porNombre.id, texto: "" };
  return { motivo: lista.find((m) => m.otro).id, texto: esOtro(n) ? "" : n };
}

// ——— Reglas del par (tipo + motivo) ———
// Qué se muestra y qué se paga con el tipo y el motivo elegidos.
export function reglas(tipo, motivo) {
  const clase = tipo ? claseDe(tipo) : "asistencia";
  const n = normalizarTipo(tipo);
  const m = motivo ?? null;
  const base = { clase, motivoVisible: ["inasistencia", "parcial", "dia"].includes(clase), folio: false, acta: false,
    abreReloj: clase === "asistencia" || clase === "parcial", goce: null, goceCambia: false, horas: null, horasCambian: false,
    vacioMotivo: clase === "inasistencia" ? "Injustificada" : clase === "parcial" ? "Sin permiso" : "Sin motivo" };
  if (clase === "ley") return { ...base, folio: requisitoEstado(tipo) === "folio", goce: n?.goce ?? "sin" };
  if (clase === "inasistencia") {
    return m ? { ...base, goce: m.goce ?? "sin", goceCambia: m.cambia } : { ...base, acta: true, goce: "sin" };
  }
  if (clase === "parcial") {
    return m ? { ...base, goce: "con", horas: m.horas ?? n?.horas ?? "reponen", horasCambian: m.cambia } : base;
  }
  if (clase === "dia") {
    return m ? { ...base, goce: m.goce ?? n?.goce ?? "sin", goceCambia: m.cambia } : { ...base, goce: n?.goce ?? "sin", goceCambia: Boolean(n?.cambia) };
  }
  return base;
}
// Estado vacío del par: { tipo, motivo, texto, goce, horas, folio } (goce/horas null = los del motivo).
export const parVacio = (tipo = "") => ({ tipo: String(tipo ?? ""), motivo: "", texto: "", goce: null, horas: null, folio: "" });
// Goce y horas que se aplican (lo elegido por RH solo si el motivo se cambia al aplicar).
export function aplicado(par, tipo, motivos) {
  const m = motivoPorId(motivos, par?.motivo);
  const r = reglas(tipo, m);
  return {
    r, motivo: m,
    goce: r.goceCambia && goceDe(par?.goce) ? goceDe(par.goce) : r.goce,
    horas: r.horasCambian && HORAS_TXT[par?.horas] ? par.horas : r.horas,
  };
}
// Lo que falta para poder guardar ("" si está listo).
export function faltaPar(par, tipo, motivos, { motivoObligatorio = false } = {}) {
  if (!tipo) return "Elige qué pasó.";
  const { r, motivo } = aplicado(par, tipo, motivos);
  if (r.folio && !String(par?.folio ?? "").trim()) return "Escribe el folio de la incapacidad.";
  if (motivoObligatorio && r.motivoVisible && !motivo) return "Elige el motivo del permiso.";
  if (motivo?.otro && !String(par?.texto ?? "").trim()) return "Escribe el motivo.";
  return "";
}

// ——— Cuerpos de las peticiones (contrato) ———
const camposMotivo = (motivo, texto, clave) => (motivo ? {
  ...(motivo.sinCatalogo ? {} : { [clave]: Number(motivo.id) }),
  ...(motivo.otro ? { motivo_permiso: String(texto ?? "").trim() } : {}),
} : {});
// PUT /checador/asistencias/:id/estado-dia: { id_tipo_permiso, id_motivo?, motivo_permiso? (texto de «Otro»), goce?, folio? }.
export function cuerpoEstadoDia(par, tipo, motivos) {
  const { r, motivo, goce } = aplicado(par, tipo, motivos);
  return {
    id_tipo_permiso: Number(tipo.id),
    ...(r.folio ? { folio: String(par.folio ?? "").trim() } : {}),
    ...(r.motivoVisible ? camposMotivo(motivo, par.texto, "id_motivo") : {}),
    ...(r.goceCambia && goce ? { goce } : {}),
  };
}
// permiso_dia del PUT /:id/reloj: { id_tipo, id_motivo, motivo (nombre o texto de «Otro»), horas? } o null (sin permiso).
export function cuerpoPermisoDia(par, tipo, motivos) {
  if (!par || !tipo || claseDe(tipo) !== "parcial") return null;
  const { r, motivo, horas } = aplicado(par, tipo, motivos);
  if (!motivo) return null;
  return {
    id_tipo: Number(tipo.id), ...(motivo.sinCatalogo ? {} : { id_motivo: Number(motivo.id) }),
    motivo: motivo.otro ? String(par.texto ?? "").trim() : motivo.nombre,
    ...(r.horasCambian && horas ? { horas } : {}),
  };
}
// permiso_dia guardado (GET /:id/reloj) → par.
export function parDesdePermiso(p, motivos) {
  if (!p || p.id_tipo == null) return null;
  const { motivo, texto } = motivoGuardado(motivos, { id: p.id_motivo, nombre: p.motivo });
  const m = motivoPorId(motivos, motivo);
  return { ...parVacio(p.id_tipo), motivo, texto,
    horas: m?.cambia && HORAS_TXT[p.horas] && p.horas !== (m.horas ?? null) ? p.horas : null };
}
// Fila de Asistencias (sin checadas) → par guardado.
export function parDesdeFila(fila, tipos, motivos) {
  const t = listaTipos(tipos).find((x) => String(x.id) === String(fila?.id_tipo_permiso));
  if (!t || ["asistencia", "sistema"].includes(claseDe(t))) return parVacio();
  const { motivo, texto } = motivoGuardado(motivos, { id: fila.id_motivo_permiso, nombre: fila.motivo_permiso });
  const r = reglas(t, motivoPorId(motivos, motivo));
  const g = goceDe(fila.goce_sueldo);
  return { ...parVacio(t.id), motivo, texto, goce: r.goceCambia && g && g !== r.goce ? g : null };
}
const TRATAMIENTO = { reponen: "repone", descuentan: "rebaja" };
// Campos de la solicitud de Permisos: id_motivo_permiso (+ texto de «Otro»), goce (solo RH y si el motivo se cambia al
// aplicar) y en los parciales horas_no_trabajadas del motivo (+ tipo_horas/tratamiento de siempre).
export function camposSolicitud(par, tipo, motivos, { rh = true } = {}) {
  if (!tipo) return {};
  const { r, motivo, goce, horas } = aplicado(par, tipo, motivos);
  const h = r.clase === "parcial" ? (rh ? horas : r.horas) : null;
  return {
    ...camposMotivo(motivo, par?.texto, "id_motivo_permiso"),
    ...(rh && r.goceCambia && goce && r.clase !== "parcial" ? { goce } : {}),
    ...(r.clase === "parcial" ? { horas_no_trabajadas: h, tipo_horas: tipoHorasDe(tipo), ...(TRATAMIENTO[h] ? { tratamiento: TRATAMIENTO[h] } : {}) } : {}),
  };
}
// Solicitud guardada → par.
export function parDesdeSolicitud(s, motivos) {
  if (!s) return parVacio();
  const { motivo, texto } = motivoGuardado(motivos, { id: s.id_motivo_permiso, nombre: s.motivo_permiso });
  const g = goceDe(s.goce ?? s.goce_sueldo);
  return { ...parVacio(s.id_tipo_permiso ?? ""), motivo, texto, goce: g, horas: HORAS_TXT[s.horas_no_trabajadas] ? s.horas_no_trabajadas : null };
}

// ——— Textos ———
// Debajo del par: «🔒 Sin goce», «Con goce», «Día con goce · las horas se reponen».
export const goceTxt = (g) => (goceDe(g) === "con" ? "Con goce" : "Sin goce");
// Lo que pasará en una línea mientras se captura.
export function textoAplicado(par, tipo, motivos) {
  if (!tipo) return "";
  const { r, goce, horas } = aplicado(par, tipo, motivos);
  if (r.clase === "inasistencia" && r.acta) return "Inasistencia injustificada: sin goce. Se creará un acta en borrador.";
  if (r.clase === "parcial") return r.goce ? `Día con goce · ${HORAS_TXT[horas]?.toLowerCase() ?? ""}`.replace(/ · $/, "") : "Sin permiso: cuenta como retardo o salida antes.";
  return goce ? goceTxt(goce) : "";
}
// «Estado · motivo» de solo lectura de una fila: «❌ Inasistencia injustificada», «📝 Inasistencia · Permiso personal ·
// sin goce», «⌚ Entrada tarde · Visita al médico · 2 h · las repone». null si la fila no es de este modelo (se usa el
// estado de siempre).
export function estadoMotivo(fila, tipos = null, { ley = true } = {}) {
  const p = fila?.permiso_dia;
  const lista = listaTipos(tipos);
  if (p && (p.tipo || p.nombre_tipo || p.id_tipo != null)) {
    const t = lista.find((x) => String(x.id) === String(p.id_tipo)) ?? { nombre: p.tipo ?? p.nombre_tipo, alcance: p.alcance };
    const rol = ROLES.includes(t.rol) ? t.rol : ["entrada", "salida", "medio"].includes(p.alcance) ? p.alcance : rolDe(t);
    const min = Number(p.minutos ?? p.minutos_no_trabajados) || 0;
    return [`${ICONO_ROL[rol] ?? "📝"} ${nombreTipo({ nombre: p.tipo ?? p.nombre_tipo ?? t.nombre })}`, String(p.motivo ?? "").trim(),
      min > 0 && HORAS_CORTO[p.horas] ? `${durTexto(min)} · ${HORAS_CORTO[p.horas]}` : ""].filter(Boolean).join(" · ");
  }
  const t = lista.find((x) => String(x.id) === String(fila?.id_tipo_permiso)) ?? (fila?.tipo_registro_nombre ? { nombre: fila.tipo_registro_nombre } : null);
  if (!t) return null;
  const rol = rolDe(t);
  const motivo = String(fila?.motivo_permiso ?? "").trim();
  if (rol === "inasistencia") {
    return motivo ? `${ICONO_ROL.justificada} Inasistencia · ${motivo} · ${goceDe(fila.goce_sueldo) === "con" ? "con" : "sin"} goce` : `${ICONO_ROL.inasistencia} Inasistencia injustificada`;
  }
  if (rol === "ley" && ley) return `${ICONO_ROL.ley} ${nombreTipo(t)}`;
  return null;
}
// El texto de estadoMotivo partido en dos columnas: «⌚ Entrada tarde» | «Permiso personal · 2 h · se descuentan».
// «❌ Inasistencia injustificada» no tiene motivo. null si estadoMotivo no aplica (se usa el texto de siempre).
export function partesEstadoMotivo(fila, tipos = null) {
  const t = estadoMotivo(fila, tipos);
  if (!t) return null;
  const i = t.indexOf(" · ");
  // El goce va en su propia columna («Goce»): aquí solo el porqué y las horas.
  const sinGoce = (m) => m.replace(/ · (con|sin) goce$/, "");
  return i < 0 ? { estado: t, motivo: "" } : { estado: t.slice(0, i), motivo: sinGoce(t.slice(i + 3)) };
}
// Lo que se ve en la columna «Estado» (qué pasó): «⌚ Entrada tarde», «❌ Inasistencia injustificada», «✅ Asistió»…
// Es también el valor del filtro de esa columna, para que lo que se filtra sea literalmente lo que se ve.
export function textoColumnaEstado(fila, tipos = null) {
  const partes = partesEstadoMotivo(fila, tipos);
  if (partes?.estado) return partes.estado;
  const e = estadoFila(fila);
  return permisoFila(fila)?.tipo || textoConIcono(e.texto, e.clave);
}
// Texto de la fila: el nuevo «estado · motivo» o, para lo demás (sin checar, asistió, tipos anteriores), el de siempre.
export const textoEstadoFila = (fila, tipos, estado) => estadoMotivo(fila, tipos) ?? textoConIcono(estado?.texto, estado?.clave);
