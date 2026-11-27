// Apoyos de las pantallas de nómina (R1). Puras: scripts/test-nomina.mjs.
export const PERIODICIDADES = ["Semanal", "Catorcenal", "Quincenal", "Mensual", "Diario", "Por hora"];

export const ESTADOS = {
  borrador: { texto: "Borrador", tono: "gris" },
  por_autorizar: { texto: "Por autorizar", tono: "ambar" },
  autorizado: { texto: "Autorizada", tono: "verde" },
  cancelado: { texto: "Cancelada", tono: "rojo" },
};

export const ENVIOS = {
  pendiente: { texto: "Enviando…", tono: "azul" },
  enviado: { texto: "Enviado", tono: "verde" },
  sin_correo: { texto: "Sin correo", tono: "ambar" },
  error: { texto: "No se envió", tono: "rojo" },
};

export const dinero = (v) => Number(v || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const aFecha = (s) => new Date(`${s}T00:00:00Z`);
const texto = (d) => d.toISOString().slice(0, 10);
const sumar = (s, n) => texto(new Date(aFecha(s).getTime() + n * 86400000));

// Fechas sugeridas para una nómina nueva según la periodicidad, a partir de «hoy» (AAAA-MM-DD).
export function periodoSugerido(periodicidad, hoy) {
  const d = aFecha(hoy);
  const lunes = sumar(hoy, -((d.getUTCDay() + 6) % 7));
  const anio = d.getUTCFullYear();
  const mes = d.getUTCMonth();
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const iso = (dia) => texto(new Date(Date.UTC(anio, mes, dia)));
  switch (periodicidad) {
    case "Semanal":
    case "Por hora":
      return { inicio: lunes, fin: sumar(lunes, 6) };
    case "Catorcenal":
      return { inicio: lunes, fin: sumar(lunes, 13) };
    case "Quincenal":
      return d.getUTCDate() <= 15 ? { inicio: iso(1), fin: iso(15) } : { inicio: iso(16), fin: iso(ultimo) };
    case "Mensual":
      return { inicio: iso(1), fin: iso(ultimo) };
    default:
      return { inicio: hoy, fin: hoy };
  }
}

export const fechaCorta = (s) => {
  if (!s) return "—";
  const [a, m, d] = String(s).slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

// Qué acciones ve cada quien según el estado (el backend vuelve a validar todo).
export function acciones(estado, puedeAutorizar) {
  return {
    recalcular: estado === "borrador",
    editar: estado === "borrador",
    enviar: estado === "borrador",
    regresar: estado === "por_autorizar",
    autorizar: estado === "por_autorizar" && puedeAutorizar,
    cancelar: ["borrador", "por_autorizar"].includes(estado) || (estado === "autorizado" && puedeAutorizar),
    reenviar: estado === "autorizado",
  };
}

// Minutos → "8 h 30 min" (o "—" si no hay).
export function horas(min) {
  const m = Math.round(Number(min) || 0);
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h && r ? `${h} h ${r} min` : h ? `${h} h` : `${r} min`;
}

// Cómo se pinta cada día en el detalle (tono y texto corto).
export const DIA = {
  trabajado: { texto: "Trabajó", tono: "verde" },
  festivo_trabajado: { texto: "Festivo trabajado", tono: "verde" },
  descanso_trabajado: { texto: "Trabajó en descanso", tono: "verde" },
  festivo: { texto: "Festivo", tono: "azul" },
  permiso_con_goce: { texto: "Permiso con goce", tono: "azul" },
  permiso_sin_goce: { texto: "Sin goce", tono: "ambar" },
  falta: { texto: "Falta", tono: "rojo" },
  descanso: { texto: "Descanso", tono: "gris" },
  inactivo: { texto: "No activo", tono: "gris" },
};

// Fecha → "lun 16".
export function diaCorto(fecha) {
  const d = new Date(`${fecha}T12:00:00Z`);
  return `${["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getUTCDay()]} ${d.getUTCDate()}`;
}

// ——— R2: préstamos ———
export const PRESTAMO = {
  solicitado: { texto: "Por aprobar", tono: "ambar" },
  por_firmar: { texto: "Por firmar", tono: "azul" },
  vigente: { texto: "Vigente", tono: "verde" },
  liquidado: { texto: "Pagado", tono: "gris" },
  rechazado: { texto: "Rechazado", tono: "rojo" },
  cancelado: { texto: "Cancelado", tono: "rojo" },
};

export const MOVIMIENTO = { abono_nomina: "Descuento en nómina", abono_efectivo: "Abono en efectivo", reverso: "Regresado (nómina cancelada)" };

// Porcentaje pagado de un préstamo y pagos que faltan. Los pagos restantes los da el servidor (`plan.pagos_restantes`,
// con la regla del redondeo y el último pago ajustado); sin plan se estiman con el abono como antes.
export function avancePrestamo({ monto, abono, saldo }, plan = null) {
  const m = Number(monto) || 0;
  const s = Number(saldo ?? m) || 0;
  const a = Number(abono) || 0;
  return {
    pagado: Math.max(0, m - s),
    porcentaje: m > 0 ? Math.round(((m - s) / m) * 100) : 0,
    pagosRestantes: plan?.pagos_restantes ?? (a > 0 ? Math.ceil(s / a) : null),
  };
}

// ——— (27/11/2026) «¿En cuántos pagos?»: palabras del periodo y calendario. Solo ponen en palabras lo que calcula el
// servidor (plan y calendario de /checador/nomina/prestamos y /mis-prestamos); el dinero no se calcula aquí. ———
const PALABRAS = { Semanal: ["semana", "semanas"], Catorcenal: ["catorcena", "catorcenas"], Quincenal: ["quincena", "quincenas"], Mensual: ["mes", "meses"], Diario: ["día", "días"] };
/** «quincena» / «quincenas» según cuántos; sin periodicidad (o por hora): «nómina(s)». */
export const palabraSola = (periodo, n = 2) => (PALABRAS[periodo] ?? ["nómina", "nóminas"])[Number(n) === 1 ? 0 : 1];
/** «6 quincenas», «1 mes», «12 semanas». */
export const palabraPeriodo = (periodo, n) => `${n} ${palabraSola(periodo, n)}`;
const MASCULINO = new Set(["Mensual", "Diario"]);
/** «¿En cuántas quincenas…?» / «¿En cuántos meses…?». */
export const cuantos = (periodo) => `${MASCULINO.has(periodo) ? "cuántos" : "cuántas"} ${palabraSola(periodo, 2)}`;
/** «la última» (quincena, semana…) / «el último» (mes, día). */
export const elUltimo = (periodo) => (MASCULINO.has(periodo) ? "el último" : "la última");
/** «Abono por quincena», «Abono por mes»… («por nómina» sin periodicidad). */
export const abonoPor = (periodo) => `Abono por ${palabraSola(periodo, 1)}`;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const partes = (s) => { const [a, m, d] = String(s).slice(0, 10).split("-").map(Number); return { a, m, d }; };
/** «16 al 31 dic 2026», «30 nov al 6 dic 2026», «28 dic 2026 al 3 ene 2027», «27 nov 2026». */
export function textoPeriodo(p) {
  if (!p?.inicio || !p?.fin) return "—";
  const x = partes(p.inicio);
  const y = partes(p.fin);
  if (p.inicio === p.fin) return `${x.d} ${MESES[x.m - 1]} ${x.a}`;
  if (x.a !== y.a) return `${x.d} ${MESES[x.m - 1]} ${x.a} al ${y.d} ${MESES[y.m - 1]} ${y.a}`;
  if (x.m !== y.m) return `${x.d} ${MESES[x.m - 1]} al ${y.d} ${MESES[y.m - 1]} ${y.a}`;
  return `${x.d} al ${y.d} ${MESES[y.m - 1]} ${y.a}`;
}

/** «6 quincenas de $833.33 · la última de $833.35» (o «1 quincena de $500.00»). */
export function resumenPlan(plan) {
  if (!plan?.num_pagos) return "";
  const n = Number(plan.num_pagos);
  const distinto = plan.ultimo != null && Math.round(Number(plan.ultimo) * 100) !== Math.round(Number(plan.abono) * 100);
  return `${palabraPeriodo(plan.periodo_pago, n)} de ${dinero(plan.abono)}${distinto && n > 1 ? ` · ${elUltimo(plan.periodo_pago)} de ${dinero(plan.ultimo)}` : ""}`;
}

/** Calendario en palabras: { primero, ultimo, aproximado } con los textos de cada periodo. null si no hay. */
export function textoCalendario(c) {
  if (!c?.primero) return null;
  return { primero: textoPeriodo(c.primero), ultimo: textoPeriodo(c.ultimo), aproximado: Boolean(c.aproximado), mismo: c.ultimo && c.primero.inicio === c.ultimo.inicio };
}
