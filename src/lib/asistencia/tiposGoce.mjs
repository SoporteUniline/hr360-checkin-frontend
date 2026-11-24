// «Tipos de registro: qué pasó, por qué y cuánto se paga» (aprobado 24/11/2026; mockup Tipos.dc.html).
// Tres cosas separadas: QUÉ pasó (tipo del catálogo `tipos_permiso`), POR QUÉ (motivo del catálogo `motivos_permiso`)
// y CUÁNTO se paga (goce del día y trato de las horas no trabajadas, configurados en el tipo).
// Lógica pura que comparten el catálogo, la fila de Asistencias, el reloj del día, Permisos y la vista móvil.
// El servidor recalcula y valida lo mismo (minutos_no_trabajados, fijo_ley, cambia_al_aplicar).
// Probado en scripts/test-tipos-goce.mjs.
import { durTexto, horarioMin, vivos } from "./relojDia.mjs";

export const ALCANCES = ["dia", "entrada", "salida", "medio"];
export const ALCANCE_TXT = {
  dia: "Día completo", entrada: "Parte del día · al entrar", salida: "Parte del día · al salir", medio: "Parte del día · en medio",
};
export const HORAS = [
  ["reponen", "Se reponen (tiempo por tiempo)"], ["descuentan", "Se descuentan"], ["pagan", "Se pagan"],
];
export const HORAS_TXT = Object.fromEntries(HORAS);
const HORAS_CORTO = { reponen: "las repone", descuentan: "se descuentan", pagan: "se pagan" };
export const GOCES = [["con", "Con goce"], ["sin", "Sin goce"]];

const num = (v) => Number(v ?? 0);
const sinAcentos = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
// Sin el emoji del catálogo («⌚ Entrada después de tiempo» → «Entrada después de tiempo»).
export const sinEmoji = (s) => String(s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();

// Alcance del tipo; si el servidor aún no lo manda, el mismo respaldo por nombre/clave que la migración.
export function alcanceDe(t) {
  if (ALCANCES.includes(t?.alcance)) return t.alcance;
  const n = sinAcentos(`${t?.clave ?? ""} ${t?.nombre ?? ""}`);
  if (/entrada despues|llega tarde|entrada tarde/.test(n)) return "entrada";
  if (/salida antes|sale antes/.test(n)) return "salida";
  if (/entre jornada|permiso por horas|sale y regresa/.test(n)) return "medio";
  return "dia";
}
export const esParcial = (t) => alcanceDe(t) !== "dia";
// 'con' | 'sin' desde cualquiera de las formas en que llega (goce_sueldo 1/0, goce 'con'/'sin'/true).
export function goceDe(v) {
  if (v === "con" || v === "sin") return v;
  if (v == null || v === "") return null;
  return num(v) === 1 || v === true ? "con" : "sin";
}
const horasDe = (t) => (esParcial(t) ? (HORAS_TXT[t?.horas_no_trabajadas ?? t?.horas] ? (t.horas_no_trabajadas ?? t.horas) : "reponen") : null);

// Por qué un tipo está fijado (🔒): la etiqueta corta y la nota (artículo de la LFT o regla del sistema).
const RAZONES = [
  [/injustificad/, "Regla", "También baja la parte proporcional del descanso semanal (art. 72)"],
  [/vacacion/, "Ley", "Descuenta del saldo; lleva prima vacacional"],
  [/incapacidad/, "Ley", "La empresa no paga el día; el IMSS da subsidio"],
  [/paternidad/, "Ley", "5 días laborables con goce (art. 132 XXVII Bis)"],
  [/maternidad/, "Ley", "Descanso pre y posparto con goce (art. 170)"],
  [/suspension/, "Ley", "Máximo 8 días y debe ser oída antes (art. 423)"],
  [/descanso/, "Ley", "Con goce de salario íntegro (art. 69)"],
];
export function razonFijo(t) {
  if (!num(t?.fijo_ley)) return null;
  const n = sinAcentos(t?.nombre);
  const r = RAZONES.find(([re]) => re.test(n));
  return r ? { etiqueta: r[1], nota: r[2] } : { etiqueta: "Ley", nota: "Lo fija la ley o el sistema" };
}

// Forma única del tipo para la interfaz.
export function normalizarTipo(t) {
  if (!t) return null;
  const fijo = num(t.fijo_ley) === 1;
  return {
    id: t.id, nombre: t.nombre ?? "", alcance: alcanceDe(t), parcial: esParcial(t),
    goce: goceDe(t.goce ?? t.goce_sueldo) ?? "sin", horas: horasDe(t),
    cambia: !fijo && (t.cambia_al_aplicar == null ? true : num(t.cambia_al_aplicar) === 1 || t.cambia_al_aplicar === true),
    fijo, razon: razonFijo(t),
  };
}
// Qué puede cambiar RH al aplicar el tipo (en la fila, el reloj o Permisos).
export function puedeCambiar(t) {
  const n = normalizarTipo(t);
  return { goce: Boolean(n?.cambia), horas: Boolean(n?.cambia && n.parcial) };
}

// ——— Grupos de la fila de Asistencias sin checadas ———
// Fuera siempre: «Asistencia», «Sin checar» y «Cerrado por sistema» (los pone el sistema, no son un permiso).
const SISTEMA = /cerrado por sistema|^\W*asistencia\W*$|sin checar/i;
export const esDelSistema = (t) => SISTEMA.test(String(t?.nombre ?? "").trim());
export function gruposFila(tiposPermiso) {
  const lista = (Array.isArray(tiposPermiso) ? tiposPermiso : tiposPermiso?.tiposPermiso ?? [])
    .filter((t) => !num(t.borrado) && !num(t.eliminado) && !esDelSistema(t));
  return { noVino: lista.filter((t) => !esParcial(t)), siVino: lista.filter(esParcial) };
}

// ——— Motivos (por qué) ———
// El catálogo trae «Otro» como motivo global: en los selects se muestra como «Otro…» y pide escribirlo.
export const OTRO = "__otro";
const esOtro = (nombre) => /^otro$/i.test(String(nombre ?? "").trim());
export function listaMotivos(motivos) {
  const arr = Array.isArray(motivos) ? motivos : motivos?.motivos ?? [];
  return arr.filter((m) => m && m.activo !== 0 && m.activo !== false && !esOtro(m.nombre ?? m))
    .map((m) => (typeof m === "string" ? { id: m, nombre: m, global: true } : m));
}
// Valor guardado → { opcion, texto } del select (una opción del catálogo o «Otro…» con el texto escrito).
export function motivoAOpcion(motivo, motivos) {
  const m = String(motivo ?? "").trim();
  if (!m) return { opcion: "", texto: "" };
  return listaMotivos(motivos).some((x) => x.nombre === m) ? { opcion: m, texto: "" } : { opcion: OTRO, texto: esOtro(m) ? "" : m };
}
export const motivoFinal = ({ opcion, texto }) => (opcion === OTRO ? String(texto ?? "").trim() : String(opcion ?? "").trim());

// ——— Minutos no trabajados por alcance ———
// Igual que el servidor: entrada = entrada real − programada; salida = programada − salida real; medio = huecos dentro
// de la jornada que no sean comida (lo checado como comida o, si no checó comida, la comida del horario).
export function minutosNoTrabajados(alcance, regs, horario) {
  const h = horarioMin(horario);
  if (!h || alcance === "dia") return 0;
  const v = vivos(regs ?? []).filter((r) => r.ini != null);
  const trabajo = v.filter((r) => r.concepto !== "comida");
  if (!trabajo.length) return 0;
  const entrada = Math.min(...trabajo.map((r) => r.ini));
  const cerrados = trabajo.filter((r) => r.fin != null);
  if (alcance === "entrada") return Math.max(0, entrada - h.pe);
  if (!cerrados.length || cerrados.length < trabajo.length) return 0; // sin salida: aún no se sabe
  const salida = Math.max(...cerrados.map((r) => r.fin));
  if (alcance === "salida") return Math.max(0, h.ps - salida);
  // medio: huecos entre la primera entrada y la última salida, dentro del horario, sin la comida.
  const desde = Math.max(entrada, h.pe), hasta = Math.min(salida, h.ps);
  if (hasta <= desde) return 0;
  const cubierto = v.filter((r) => r.fin != null).map((r) => [r.ini, r.fin]);
  if (!v.some((r) => r.concepto === "comida") && h.sc != null) cubierto.push([h.sc, h.rc]);
  const tramos = cubierto.map(([a, b]) => [Math.max(a, desde), Math.min(b, hasta)]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  let cursor = desde, hueco = 0;
  for (const [a, b] of tramos) { if (a > cursor) hueco += a - cursor; cursor = Math.max(cursor, b); }
  return hueco + Math.max(0, hasta - cursor);
}

// ——— Textos ———
// Debajo del estado: «Visita al médico · 2 h · las repone · con goce» (como el mockup).
export function textoResumen({ motivo, goce, horas, minutos, parcial } = {}) {
  const min = Number(minutos) || 0;
  const g = goceDe(goce);
  return [
    String(motivo ?? "").trim(),
    parcial && min > 0 && HORAS_CORTO[horas] ? `${durTexto(min)} · ${HORAS_CORTO[horas]}` : "",
    g ? `${g} goce` : "",
  ].filter(Boolean).join(" · ");
}
// «2 h no trabajadas · se reponen» (en vivo, en el reloj).
export function textoNoTrabajadas(minutos, horas) {
  const min = Number(minutos) || 0;
  if (min <= 0) return "Sin horas no trabajadas";
  const fin = { reponen: "se reponen", descuentan: "se descuentan", pagan: "se pagan" }[horas];
  return `${durTexto(min)} no trabajadas${fin ? ` · ${fin}` : ""}`;
}
// Lo que pasará en nómina, en una línea (reglas del recibo del mockup).
export function textoNomina({ parcial, goce, horas, minutos } = {}) {
  const g = goceDe(goce);
  const min = Number(minutos) || 0;
  if (!parcial) return g === "con" ? "Día pagado (con goce)" : "Día no pagado (sin goce)";
  if (g !== "con") return "Día sin goce: solo se pagan las horas trabajadas";
  if (min <= 0) return "Día con goce · sin descuento";
  if (horas === "reponen") return `Día con goce · ${durTexto(min)} a su cuenta de horas`;
  if (horas === "descuentan") return `Día con goce · se descuentan ${durTexto(min)}`;
  return `Día con goce · ${durTexto(min)} se pagan`;
}

// ——— Cuerpos de las peticiones (contrato) ———
// PUT /:id/estado-dia (día completo sin checadas): goce solo si el tipo se cambia al aplicar.
export function cuerpoEstadoDia(tipo, { motivo = "", folio = "", goce = null, requisito = null } = {}) {
  const c = { id_tipo_permiso: Number(tipo.id) };
  if (requisito === "folio") c.folio = String(folio).trim();
  // `motivo` (texto de siempre, lo exige el servidor actual) y `motivo_permiso` (el del catálogo de motivos).
  if (requisito === "motivo") { c.motivo = String(motivo).trim(); c.motivo_permiso = String(motivo).trim(); }
  if (puedeCambiar(tipo).goce && goceDe(goce)) c.goce = goceDe(goce);
  return c;
}
// permiso_dia del PUT /:id/reloj: { id_tipo, motivo, goce?, horas? } | null.
export function cuerpoPermisoDia(p, tipo) {
  if (!p || !tipo) return null;
  const pc = puedeCambiar(tipo);
  return {
    id_tipo: Number(tipo.id), motivo: String(p.motivo ?? "").trim() || null,
    ...(pc.goce && goceDe(p.goce) ? { goce: goceDe(p.goce) } : {}),
    ...(pc.horas && HORAS_TXT[p.horas] ? { horas: p.horas } : {}),
  };
}
// Estado inicial de la sección «Permiso del día» desde GET /:id/reloj (permiso_dia guardado o tipo elegido en la fila).
export function permisoInicial(guardado, tipos, idTipoElegido = null) {
  const lista = Array.isArray(tipos) ? tipos : [];
  if (guardado?.id_tipo != null) {
    const t = lista.find((x) => String(x.id) === String(guardado.id_tipo));
    return { id_tipo: String(guardado.id_tipo), motivo: guardado.motivo ?? "",
      goce: goceDe(guardado.goce) ?? normalizarTipo(t)?.goce ?? "con", horas: guardado.horas ?? normalizarTipo(t)?.horas ?? "reponen" };
  }
  if (idTipoElegido != null) return aplicarTipo(lista.find((x) => String(x.id) === String(idTipoElegido)));
  return null;
}
// Al elegir un tipo: goce y horas del catálogo (preseleccionados).
export function aplicarTipo(tipo, motivo = "") {
  const n = normalizarTipo(tipo);
  if (!n) return null;
  return { id_tipo: String(n.id), motivo, goce: n.goce, horas: n.horas ?? "reponen" };
}
// Validación de la sección: el motivo es obligatorio al aplicar un permiso.
export function errorPermiso(p) {
  if (!p) return "";
  if (!p.id_tipo) return "Elige el tipo de permiso.";
  if (!String(p.motivo ?? "").trim()) return "Elige el motivo del permiso.";
  return "";
}

// ——— Lo que se ve en la lista (GET /checador/asistencias → permiso_dia resumido) ———
// Devuelve { tipo, detalle } o null. `tipo` reemplaza al texto del estado cuando hay permiso.
export function permisoFila(fila) {
  const p = fila?.permiso_dia;
  if (p && (p.tipo || p.nombre_tipo || p.motivo)) {
    const minutos = p.minutos ?? p.minutos_no_trabajados;
    const parcial = p.alcance ? p.alcance !== "dia" : Number(minutos) > 0 || Boolean(p.horas);
    return { tipo: p.tipo ?? p.nombre_tipo ?? "", detalle: textoResumen({ motivo: p.motivo, goce: p.goce, horas: p.horas, minutos, parcial }) };
  }
  if (fila?.motivo_permiso) {
    return { tipo: "", detalle: textoResumen({ motivo: fila.motivo_permiso, goce: fila.goce_sueldo, horas: fila.horas_no_trabajadas,
      minutos: fila.minutos_no_trabajados, parcial: fila.id_tipo_parcial != null }) };
  }
  return null;
}

// ——— Permisos (solicitudes): tipos que se pueden pedir y cuerpo ———
// Se ofrecen los permisos del catálogo y las faltas justificadas (día completo, no fijadas por ley).
export function tiposParaPermiso(tiposPermiso) {
  const lista = Array.isArray(tiposPermiso) ? tiposPermiso : tiposPermiso?.tiposPermiso ?? [];
  return lista.filter((t) => !esDelSistema(t) && !/injustificad/i.test(sinAcentos(t.nombre))
    && (num(t.es_permiso) === 1 || (!esParcial(t) && !num(t.fijo_ley) && num(t.cuenta_como_asistencia) === 0 && /justificad/.test(sinAcentos(t.nombre)))));
}
const TIPO_HORAS = { entrada: "llega_tarde", salida: "sale_antes", medio: "sale_regresa" };
// «Se pagan» no tiene equivalente en el permiso por horas de antes: solo viaja horas_no_trabajadas.
const TRATAMIENTO = { reponen: "repone", descuentan: "rebaja" };
export const tipoHorasDe = (t) => TIPO_HORAS[alcanceDe(t)] ?? "";
// Campos nuevos de la solicitud: motivo_permiso, goce (solo RH y si el tipo se cambia al aplicar) y, en las de horas,
// horas_no_trabajadas (más tipo_horas/tratamiento de siempre, para lo que ya los usa).
export function camposSolicitud(tipo, { motivo, goce, horas, rh = true } = {}) {
  const n = normalizarTipo(tipo);
  if (!n) return {};
  const pc = puedeCambiar(tipo);
  const h = n.parcial ? (pc.horas && rh && HORAS_TXT[horas] ? horas : n.horas) : null;
  return {
    motivo_permiso: String(motivo ?? "").trim() || null,
    ...(rh && pc.goce && goceDe(goce) ? { goce: goceDe(goce) } : {}),
    ...(n.parcial ? { horas_no_trabajadas: h, tipo_horas: tipoHorasDe(tipo), ...(TRATAMIENTO[h] ? { tratamiento: TRATAMIENTO[h] } : {}) } : {}),
  };
}
