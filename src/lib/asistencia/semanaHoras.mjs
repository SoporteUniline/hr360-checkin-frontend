// Pestaña «Horas» de Asistencias: semana legal (lunes–domingo) contra el límite de la LFT.
// Datos: GET /checador/reportes/horas-ley (reporte.ley.semanas y reporte.dias[].ley).
//
// Criterio (19/11/2026): la ley mide por semana, así que siempre se calculan semanas completas
// a partir del rango elegido; si el rango toca varias semanas se elige una (por defecto la que
// contiene hoy, o la última). La proyección («va a pasar de 46 h») solo aplica a la semana en curso.

const sumarDias = (fecha, n) => new Date(Date.parse(`${fecha}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const diaSemana = (fecha) => new Date(`${fecha}T00:00:00Z`).getUTCDay();
export const lunesDe = (fecha) => sumarDias(fecha, -((diaSemana(fecha) + 6) % 7));

// Semanas completas que tocan el rango [inicio, fin].
export function semanasDelRango(inicio, fin) {
  if (!inicio || !fin) return [];
  const semanas = [];
  for (let lunes = lunesDe(inicio); lunes <= fin; lunes = sumarDias(lunes, 7)) {
    semanas.push({ inicio: lunes, fin: sumarDias(lunes, 6) });
  }
  return semanas;
}

// La que contiene hoy; si no está en el rango, la última.
export function semanaInicial(semanas, hoy) {
  return semanas.find((s) => s.inicio <= hoy && hoy <= s.fin) ?? semanas.at(-1) ?? null;
}

// Resumen de un empleado en una semana. `hoy` decide qué falta por trabajar (solo semana en curso).
export function resumenSemana(reporte, semana, hoy) {
  const ley = reporte?.ley;
  const sem = ley?.semanas?.find((s) => s.inicio === semana.inicio) ?? null;
  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(semana.inicio, i);
    const d = reporte?.dias?.find((x) => x.fecha === fecha);
    return {
      fecha,
      trabajado: Number(d?.minutosDia) || 0,
      programado: Number(d?.ley?.programado) || 0,
      extraMin: Number(d?.ley?.extraMin) || 0,
      alertas: d?.ley?.alertas ?? [],
    };
  });
  const trabajado = sem ? sem.trabajado : dias.reduce((t, d) => t + d.trabajado, 0);
  const enCurso = semana.inicio <= hoy && hoy <= semana.fin;
  // Lo que falta de su horario: días posteriores a hoy (hoy cuenta como ya trabajado).
  const restante = enCurso ? dias.filter((d) => d.fecha > hoy).reduce((t, d) => t + d.programado, 0) : 0;
  const limite = sem?.limite ?? null;
  const proyeccion = trabajado + restante;
  const nivel = limite == null ? "sin" : trabajado > limite ? "excede" : enCurso && proyeccion > limite ? "va-a-pasar" : "ok";
  return {
    trabajado,
    programado: sem?.programado ?? dias.reduce((t, d) => t + d.programado, 0),
    limite,
    topeDoble: sem?.topeDoble ?? null,
    autorizadas: sem?.autorizadas ?? 0,
    dobles: sem?.dobles ?? 0,
    triples: sem?.triples ?? 0,
    porAutorizar: sem?.porAutorizar ?? 0,
    enCurso,
    restante,
    proyeccion,
    nivel,
    alertas: [...new Set([...(sem?.alertas ?? []), ...dias.flatMap((d) => d.alertas)])],
    dias,
  };
}

// Horas compactas para celdas de tabla: 570 → "9:30", 0 → "—".
export function horaCorta(min) {
  const m = Math.round(Number(min) || 0);
  if (!m) return "—";
  const abs = Math.abs(m);
  return `${m < 0 ? "−" : ""}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

// Orden de la tabla de Horas. campo: nombre | trabajado | autorizadas | porAutorizar | alertas.
// Por defecto (trabajado desc) los que más horas llevan quedan arriba.
const VALOR = {
  nombre: (f) => String(f.r.empleado?.nombre_empleado ?? ""),
  trabajado: (f) => f.s.trabajado,
  autorizadas: (f) => f.s.autorizadas,
  porAutorizar: (f) => f.s.porAutorizar,
  alertas: (f) => f.s.alertas.length,
};
export function ordenarFilas(filas, campo = "trabajado", dir = "desc") {
  const valor = VALOR[campo] ?? VALOR.trabajado;
  const signo = dir === "asc" ? 1 : -1;
  return [...filas].sort((a, b) => {
    const x = valor(a), y = valor(b);
    const c = typeof x === "string" ? x.localeCompare(y, "es") : x - y;
    return c * signo || VALOR.nombre(a).localeCompare(VALOR.nombre(b), "es");
  });
}
