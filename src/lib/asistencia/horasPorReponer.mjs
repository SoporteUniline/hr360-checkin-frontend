// Asistencias → «Horas por reponer» (25/11/2026, maqueta aprobada Main.dc.html). Lógica pura de la pestaña: filtros,
// textos de la fila, cuerpos que se mandan al backend y la hoja de Excel. Los números (debe, desde, días, motivos, lo del
// mes) los calcula el backend (GET /checador/cuenta-horas/por-reponer, services/permisoHoras.js). Probado en
// scripts/test-horas-por-reponer.mjs.
import { formatearMinutos } from "./jornada.mjs";
import { FORMA_REPOSICION } from "./horasExtra.mjs";
import { movimientosCuenta } from "./permisoHoras.mjs";

export const UMBRAL_DIAS = 30;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const FECHA = /^(\d{4})-(\d{2})-(\d{2})/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const sinAcentos = (v) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const aMin = (hhmm) => (HORA.test(String(hhmm ?? "")) ? Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) : null);

// «21 oct 2026» / «12 nov» (sin año).
export function fechaLarga(iso, { anio = true } = {}) {
  const m = FECHA.exec(String(iso ?? ""));
  if (!m) return "—";
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1]}${anio ? ` ${m[1]}` : ""}`;
}

export const esViejo = (fila) => Number(fila?.dias) >= UMBRAL_DIAS;

// DESDE: fecha del cargo más viejo sin cubrir y «hace N días» (rojo a partir de 30).
export function textoDesde(fila) {
  const dias = Number(fila?.dias);
  const hace = !Number.isFinite(dias) ? "" : dias === 0 ? "hoy" : dias === 1 ? "hace 1 día" : `hace ${dias} días`;
  return { fecha: fechaLarga(fila?.desde), hace, rojo: esViejo(fila) };
}

// POR QUÉ: «2 permisos · Visita al médico, Trámite».
export function textoPorQue(fila) {
  const n = Number(fila?.permisos) || 0;
  const base = `${n} ${n === 1 ? "permiso" : "permisos"}`;
  const motivos = (fila?.motivos ?? []).filter(Boolean);
  return motivos.length ? `${base} · ${motivos.join(", ")}` : base;
}

// LO ÚLTIMO: «Repuso 1 h · 12 nov» o «Sin reposiciones».
export function textoUltimo(fila) {
  const u = fila?.ultima_reposicion;
  return u ? `Repuso ${formatearMinutos(u.minutos)} · ${fechaLarga(u.fecha, { anio: false })}` : "Sin reposiciones";
}

// Áreas de las filas, ordenadas (para el filtro).
export function areasDe(filas) {
  return [...new Set((filas ?? []).map((f) => f.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

// Búsqueda (nombre o área, sin acentos), área exacta y «Solo más de 30 días».
export function filtrarFilas(filas, { busca = "", area = "", soloViejos = false } = {}) {
  const b = sinAcentos(busca);
  return (filas ?? []).filter((f) => (!b || sinAcentos(`${f.nombre} ${f.area ?? ""}`).includes(b))
    && (!area || f.area === area) && (!soloViejos || esViejo(f)));
}

// Tarjetas del resumen (los cuatro números de arriba).
export function tarjetasResumen(totales) {
  const t = totales ?? {};
  const viejos = t.mas_de_30 ?? {};
  const mes = t.mes ?? {};
  const personas = Number(t.personas) || 0;
  const nViejos = Number(viejos.personas) || 0;
  const reps = Number(mes.reposiciones) || 0;
  return [
    { clave: "total", titulo: "Total que te deben", valor: formatearMinutos(Number(t.debe) || 0),
      detalle: personas ? `entre ${personas} ${personas === 1 ? "persona" : "personas"}` : "nadie debe horas", tono: "normal" },
    { clave: "viejos", titulo: "Más de 30 días", valor: `${nViejos} ${nViejos === 1 ? "persona" : "personas"}`,
      detalle: nViejos ? `${formatearMinutos(viejos.minutos)} desde el ${fechaLarga(viejos.desde, { anio: false })}` : "nadie pasa de 30 días",
      tono: nViejos ? "rojo" : "normal" },
    { clave: "repuesto", titulo: "Repuesto este mes", valor: formatearMinutos(Number(mes.repuesto) || 0),
      detalle: `en ${reps} ${reps === 1 ? "reposición" : "reposiciones"}`, tono: Number(mes.repuesto) ? "verde" : "normal" },
    { clave: "cerrado", titulo: "Rebajado / condonado", valor: `${formatearMinutos(Number(mes.rebajado) || 0)} · ${formatearMinutos(Number(mes.condonado) || 0)}`,
      detalle: "este mes", tono: "normal" },
  ];
}

// Movimientos de la fila desplegada, del más viejo al más nuevo (cargos +, reposiciones −, cierres −), con lo que se
// puede hacer en cada uno: «Cancelar» el permiso (si viene de una solicitud) o «Deshacer» el cierre (si sigue vigente).
export function movimientosFila(cuenta) {
  return [...movimientosCuenta(cuenta)].reverse().map((m) => ({
    ...m,
    accion: m.cargo?.id_solicitud ? "cancelar" : m.cierre && !m.deshecho ? "deshacer" : null,
  }));
}

// «Registrar reposición»: validación y cuerpo del PUT /checador/horas-extra/empleado/:id (registro con su horario y forma
// «Reposición»; el backend vuelve a validar jornada, encimados y nómina autorizada).
export function validarReposicion({ fecha, desde, hasta, motivo, autoriza, minimo = null, hoy = null }) {
  if (!FECHA.test(String(fecha ?? ""))) return "Elige el día.";
  if (minimo && fecha < minimo) return `Solo cuenta desde el ${fechaLarga(minimo)} (su permiso más viejo sin cubrir).`;
  if (hoy && fecha > hoy) return "No puede ser un día que aún no pasa.";
  const a = aMin(desde);
  const b = aMin(hasta);
  if (a == null || b == null) return "Indica de qué hora a qué hora se quedó.";
  if (b <= a) return "«A» debe ser después de «De».";
  if (!String(motivo ?? "").trim()) return "Escribe el motivo.";
  if (!autoriza) return "Elige quién autoriza.";
  return "";
}

export const minutosReposicion = (desde, hasta) => Math.max(0, (aMin(hasta) ?? 0) - (aMin(desde) ?? 0));

export function cuerpoReposicion({ fecha, desde, hasta, motivo, autoriza }) {
  return {
    registros: [{ fecha, desde: `${fecha} ${desde}`, hasta: `${fecha} ${hasta}`, motivo: String(motivo).trim(), origen: "manual_rh" }],
    quitar: [],
    id_autoriza: Number(autoriza),
    forma_pago: FORMA_REPOSICION,
  };
}

// Rebajar / Condonar / Otro: misma regla que el backend (cuentaHorasController.cerrar) y la Cuenta del Panel empleado.
export function validarCierre({ tipo, minutos, debe, nota }) {
  const total = Number(minutos) || 0;
  if (total <= 0) return "Indica el tiempo.";
  if (total > (Number(debe) || 0)) return `No puede pasar de ${formatearMinutos(debe)}.`;
  if (tipo === "otro" && !String(nota ?? "").trim()) return "Escribe el motivo.";
  return "";
}

export function cuerpoCierre({ tipo, minutos, nota }) {
  const texto = String(nota ?? "").trim();
  return { tipo, minutos: Number(minutos), ...(texto ? { nota: texto } : {}) };
}

// Hoja de Excel: una fila por persona (con lo filtrado en pantalla).
export const COLUMNAS_EXCEL = [
  { header: "Persona", key: "persona", width: 28 },
  { header: "Área", key: "area", width: 18 },
  { header: "Debe (h:mm)", key: "debe", width: 12 },
  { header: "Debe (minutos)", key: "minutos", width: 14 },
  { header: "Desde", key: "desde", width: 12 },
  { header: "Días", key: "dias", width: 8 },
  { header: "Permisos", key: "permisos", width: 10 },
  { header: "Motivos", key: "motivos", width: 32 },
  { header: "Última reposición", key: "ultima", width: 22 },
];
const hmm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
export function filasExcel(filas) {
  return (filas ?? []).map((f) => ({
    persona: f.nombre,
    area: f.area ?? "",
    debe: hmm(Number(f.debe) || 0),
    minutos: Number(f.debe) || 0,
    desde: f.desde ?? "",
    dias: f.dias ?? "",
    permisos: Number(f.permisos) || 0,
    motivos: (f.motivos ?? []).join(", "),
    ultima: f.ultima_reposicion ? `${formatearMinutos(f.ultima_reposicion.minutos)} · ${f.ultima_reposicion.fecha}` : "Sin reposiciones",
  }));
}
