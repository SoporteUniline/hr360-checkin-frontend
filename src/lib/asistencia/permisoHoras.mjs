// Permisos por horas (R1, 20/11/2026): textos para mostrar. El cálculo de lo que faltó y la cuenta de
// horas los hace el backend (services/permisoHoras.js); aquí solo se presentan.
// Probado en scripts/test-permiso-horas.mjs.
import { hora12 } from "../hora12.mjs";
import { formatearMinutos } from "./jornada.mjs";

export const TIPOS_HORAS = [
  { valor: "llega_tarde", texto: "Llega tarde" },
  { valor: "sale_antes", texto: "Sale antes" },
  { valor: "sale_regresa", texto: "Sale y regresa" },
];
export const TRATAMIENTOS = [
  { valor: "repone", texto: "Se repone", ayuda: "Va a su cuenta de horas; lo repone otro día o el mismo día." },
  { valor: "rebaja", texto: "Se rebaja", ayuda: "Queda como permiso con descuento para nómina." },
];
export const TIPOS_CIERRE = [
  { valor: "rebaja", texto: "Rebajar" },
  { valor: "condonacion", texto: "Condonar" },
  { valor: "otro", texto: "Otro" },
];

const textoTipo = (v) => TIPOS_HORAS.find((t) => t.valor === v)?.texto ?? "Permiso";

// «Llega tarde · hasta 11:00 a.m.», «Sale antes · desde 3:00 p.m.», «Sale y regresa · 10:00 a.m. a 12:00 p.m.»
export function horarioPermiso(p) {
  if (!p) return "";
  if (p.tipo_horas === "llega_tarde") return `${textoTipo(p.tipo_horas)} · hasta ${hora12(p.hora_fin)}`;
  if (p.tipo_horas === "sale_antes") return `${textoTipo(p.tipo_horas)} · desde ${hora12(p.hora_inicio)}`;
  return `${textoTipo(p.tipo_horas)} · ${hora12(p.hora_inicio)} a ${hora12(p.hora_fin)}`;
}

// Etiqueta del día en Asistencias: { texto, detalle, tono }.
export function etiquetaPermisoHoras(p) {
  if (!p) return null;
  const base = horarioPermiso(p);
  if (p.estado === "sin_checadas") return { texto: "Permiso por horas", detalle: `${base} · aún sin checadas`, tono: "azul" };
  if (p.estado === "sin_horario") return { texto: "Permiso por horas", detalle: `${base} · sin horario para calcular`, tono: "azul" };
  const min = Number(p.minutos) || 0;
  if (!min) return { texto: "Permiso · cubierto", detalle: `${base} · no faltó tiempo (o lo repuso el mismo día)`, tono: "verde" };
  return p.tratamiento === "rebaja"
    ? { texto: `Permiso · rebaja ${formatearMinutos(min)}`, detalle: `${base} · con descuento`, tono: "ambar" }
    : { texto: `Permiso · por reponer ${formatearMinutos(min)}`, detalle: `${base} · va a su cuenta de horas`, tono: "azul" };
}

// Movimientos de la cuenta, del más reciente al más antiguo: { fecha, texto, minutos (+ debe / − abona), cierre? }.
export function movimientosCuenta(cuenta) {
  if (!cuenta) return [];
  const cierres = { rebaja: "Rebajado", condonacion: "Condonado", otro: "Cerrado" };
  return [
    ...(cuenta.cargos ?? []).map((c) => ({
      clave: `c${c.id_solicitud}`, fecha: c.fecha, texto: horarioPermiso(c), minutos: c.minutos,
      nota: c.estado === "sin_checadas" ? "Aún sin checadas" : c.estado === "sin_horario" ? "Sin horario" : null,
    })),
    ...(cuenta.reposiciones ?? []).map((r) => ({ clave: `r${r.id_asistencia}`, fecha: r.fecha, texto: "Reposición", minutos: -r.minutos })),
    ...(cuenta.cierres ?? []).map((c) => ({
      clave: `x${c.id}`, fecha: String(c.creado_en ?? "").slice(0, 10), texto: cierres[c.tipo] ?? "Cerrado",
      minutos: -c.minutos, nota: [c.nota, c.creado_por_nombre && `por ${c.creado_por_nombre}`].filter(Boolean).join(" · ") || null,
      cierre: c, deshecho: Boolean(c.borrado_en),
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));
}
