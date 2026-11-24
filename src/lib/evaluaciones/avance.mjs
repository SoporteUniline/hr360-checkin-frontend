// Avance de una campaña en una sola pantalla: los 5 pasos y una fila por persona. Solo cuenta lo que ya manda el
// servidor; no decide permisos ni calificaciones. Probado en scripts/test-evaluaciones.mjs.

// Quién falta, en palabras cortas para la fila de la persona.
const QUIEN = {
  descending: "su jefe",
  ascending: "su equipo",
  peer: "pares",
  self: "autoevaluación",
  hr: "RH",
};

const clave = (v) => (v == null ? "" : String(v));
const enviada = (a) => a.status === "submitted";

// Una fila por persona evaluada: respuestas, resultado y planes.
export function filasCampana(campana, resultados = [], planes = []) {
  const asignaciones = Array.isArray(campana?.assignments) ? campana.assignments : [];
  const resultadoDe = new Map(resultados.map((r) => [clave(r.subjectId ?? r.employeeId), r]));
  const planesDe = new Map();
  for (const p of planes) {
    const k = clave(p.subjectId);
    planesDe.set(k, (planesDe.get(k) || 0) + 1);
  }
  return (campana?.subjects || []).map((s) => {
    const id = clave(s.employeeId);
    const suyas = asignaciones.filter((a) => clave(a.subjectId) === id);
    const faltan = [...new Set(suyas.filter((a) => !enviada(a)).map((a) => QUIEN[a.perspective] || a.perspective))];
    return {
      id,
      nombre: s.name,
      respondidas: suyas.filter(enviada).length,
      total: suyas.length,
      faltan,
      resultado: resultadoDe.get(id) || null,
      planes: planesDe.get(id) || 0,
    };
  });
}

// Los 5 pasos: Preparar · Responder · Revisar · Publicar · Planes.
// estado: "hecho" | "actual" | "pendiente". El primero que no está hecho es el actual.
export function pasosCampana(campana, filas) {
  const status = campana?.status;
  const personas = filas.length;
  const total = filas.reduce((n, f) => n + f.total, 0);
  const respondidas = filas.reduce((n, f) => n + f.respondidas, 0);
  const revisados = filas.filter((f) => f.resultado?.approvedAt || f.resultado?.publishedAt).length;
  const publicados = filas.filter((f) => f.resultado?.publishedAt).length;
  const conPlan = filas.filter((f) => f.planes > 0).length;
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  const de = (n, d) => `${n} de ${d}`;
  const pasos = [
    {
      clave: "preparar",
      titulo: "Preparar",
      hecho: status !== "draft",
      detalle: status === "draft" ? "Borrador" : status === "scheduled" ? `Abre el ${campana.opensOn || "—"}` : "Hecho",
    },
    {
      clave: "responder",
      titulo: "Responder",
      hecho: status === "closed" || (total > 0 && respondidas === total),
      detalle: total ? `${de(respondidas, total)} (${pct(respondidas, total)} %)` : "Sin asignaciones",
    },
    { clave: "revisar", titulo: "Revisar", hecho: personas > 0 && revisados === personas, detalle: de(revisados, personas) },
    { clave: "publicar", titulo: "Publicar", hecho: personas > 0 && publicados === personas, detalle: de(publicados, personas) },
    // Un plan no es obligatorio para todos: este paso nunca bloquea ni se marca «hecho» por sí solo.
    { clave: "planes", titulo: "Planes", hecho: false, detalle: conPlan ? `${conPlan} con plan` : "Sin planes" },
  ];
  const actual = pasos.findIndex((p) => !p.hecho);
  return pasos.map((p, i) => ({ ...p, estado: p.hecho ? "hecho" : i === actual ? "actual" : "pendiente" }));
}
