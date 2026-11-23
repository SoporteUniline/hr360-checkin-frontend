// Tareas y Checklists (23/11/2026, pedido del dueño). Reglas puras: sirven al prototipo con datos de ejemplo y servirán
// igual cuando haya base de datos. Pruebas: scripts/test-tareas.mjs.
//
// - TAREA: se hace una vez, puede pertenecer a un PROYECTO (o ir suelta), tiene pasos, fecha y responsable, y puede pedir
//   foto. Flujo: por_hacer → en_proceso → revision → hecho. La persona la manda a revisión; solo el jefe la da por hecha
//   (o la regresa a en_proceso).
// - CHECKLIST: plantilla que se repite (diario / semanal) con puntos que pesan. Cada vez que toca, la persona llena un
//   ENVÍO; el jefe lo revisa punto por punto (cumple / no cumple) y eso da su calificación en %.

export const COLUMNAS = [
  { clave: "por_hacer", texto: "Por hacer", color: "#64748b" },
  { clave: "en_proceso", texto: "En proceso", color: "#2563eb" },
  { clave: "revision", texto: "En revisión", color: "#7c3aed" },
  { clave: "hecho", texto: "Hecho", color: "#16a34a" },
];
export const PRIORIDADES = ["Alta", "Media", "Baja"];

const ORDEN = COLUMNAS.map((c) => c.clave);

// ¿Puede quien tiene `rol` ("jefe" | "persona") mover la tarea a `destino`? Devuelve null o el motivo.
export function motivoNoMover(tarea, destino, rol) {
  if (!ORDEN.includes(destino)) return "Columna desconocida.";
  if (tarea.estado === destino) return null;
  if (rol === "jefe") return null; // El jefe acomoda como quiera; pasar a «Hecho» es aprobarla.
  if (destino === "hecho") return "Tu jefe la da por terminada al revisarla.";
  if (tarea.estado === "hecho") return "Ya está terminada.";
  if (destino === "revision") {
    const faltan = (tarea.pasos ?? []).filter((p) => !p.hecho).length;
    if (faltan) return `Te faltan ${faltan} ${faltan === 1 ? "paso" : "pasos"}.`;
    if (tarea.pideFoto && !(tarea.fotos ?? []).length) return "Sube la foto de evidencia.";
  }
  return null;
}

export function avancePasos(pasos = []) {
  const total = pasos.length;
  const hechos = pasos.filter((p) => p.hecho).length;
  return { hechos, total, porcentaje: total ? Math.round((hechos / total) * 100) : 0 };
}

// Avance de un proyecto: tareas hechas / total, y cuántas vencidas (fecha pasada y no hechas).
export function avanceProyecto(tareas = [], hoy) {
  const total = tareas.length;
  const hechas = tareas.filter((t) => t.estado === "hecho").length;
  const vencidas = tareas.filter((t) => t.estado !== "hecho" && t.fecha && t.fecha < hoy).length;
  return { total, hechas, vencidas, porcentaje: total ? Math.round((hechas / total) * 100) : 0 };
}

// Calificación de un envío de checklist, ponderada por peso: lo que el jefe aceptó (o, si aún no revisa, lo que la
// persona palomeó). puntos: [{ id, peso }]; marcas: { [id]: true | false }. Devuelve 0–100 con un decimal.
export function calificar(puntos = [], marcas = {}) {
  const total = puntos.reduce((s, p) => s + (Number(p.peso) > 0 ? Number(p.peso) : 1), 0);
  if (!total) return 0;
  const bien = puntos.reduce((s, p) => s + (marcas[p.id] ? (Number(p.peso) > 0 ? Number(p.peso) : 1) : 0), 0);
  return Math.round((bien / total) * 1000) / 10;
}

// Cumplimiento por persona en un periodo. envios: [{ persona, fecha, estado: "aprobado"|"regresado"|"por_revisar"|
// "no_enviado", calificacion, aTiempo }]. Un «no enviado» cuenta 0 %. Los «por revisar» aún no cuentan.
export function cumplimientoPorPersona(envios = [], { desde, hasta } = {}) {
  const porPersona = new Map();
  for (const e of envios) {
    if ((desde && e.fecha < desde) || (hasta && e.fecha > hasta)) continue;
    const r = porPersona.get(e.persona) ?? { persona: e.persona, asignados: 0, enviados: 0, aTiempo: 0, tarde: 0, noEnviados: 0, porRevisar: 0, suma: 0, contados: 0 };
    r.asignados += 1;
    if (e.estado === "no_enviado") { r.noEnviados += 1; r.contados += 1; }
    else {
      r.enviados += 1;
      if (e.aTiempo) r.aTiempo += 1; else r.tarde += 1;
      if (e.estado === "por_revisar") r.porRevisar += 1;
      else { r.suma += Number(e.calificacion) || 0; r.contados += 1; }
    }
    porPersona.set(e.persona, r);
  }
  return [...porPersona.values()].map((r) => ({
    ...r,
    promedio: r.contados ? Math.round((r.suma / r.contados) * 10) / 10 : null,
  })).sort((a, b) => (b.promedio ?? -1) - (a.promedio ?? -1));
}

// ¿Gana el bono de checklists? (solo si la empresa tiene también Nómina). minimo en %.
export const ganaBono = (promedio, minimo = 90) => promedio != null && promedio >= minimo;

// Las fotos se guardan 3 meses (decisión del dueño, 23/11/2026); después solo queda la calificación.
export const DIAS_FOTOS = 90;
export function fotoVigente(fechaEnvio, hoy) {
  const d = (Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${fechaEnvio}T00:00:00Z`)) / 86400000;
  return d <= DIAS_FOTOS;
}

// ¿Puede la persona enviar el checklist? Los puntos obligatorios deben estar hechos, y todo punto marcado que pide foto
// necesita su foto. Los no obligatorios sin marcar se permiten (cuentan como «no cumple»). Devuelve null o el motivo.
export function motivoNoEnviar(checklist, marcas = {}, fotos = {}) {
  const faltanObligatorios = checklist.puntos.filter((p) => p.obligatorio && !marcas[p.id]).length;
  const faltanFotos = checklist.puntos.filter((p) => p.pideFoto && marcas[p.id] && !fotos[p.id]).length;
  const partes = [];
  if (faltanObligatorios) partes.push(`${faltanObligatorios} ${faltanObligatorios === 1 ? "punto obligatorio" : "puntos obligatorios"}`);
  if (faltanFotos) partes.push(`${faltanFotos} ${faltanFotos === 1 ? "foto" : "fotos"}`);
  return partes.length ? `Faltan ${partes.join(" y ")}.` : null;
}
