// Celda «Comida» de Asistencias (Hoy y Registros): solo el tiempo. Se pasó → etiqueta roja (como «Balance del día»);
// en comida a tiempo → etiqueta amarilla; ya regresó a tiempo → texto normal. Las horas van en el tooltip.
// c = celdaComida(...) de src/lib/reporte/comida.mjs (o null → «—»).
export default function CeldaComida({ c }) {
  if (!c) return <span className="text-slate-300">—</span>;
  const estado = c.excedida ? "excedida" : c.enCurso ? "en-curso" : "cerrada";
  const clase = {
    excedida: "rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-600",
    "en-curso": "rounded-full bg-yellow-50 px-2 py-0.5 font-semibold text-yellow-800",
    cerrada: "text-slate-700",
  }[estado];
  return (
    <span title={c.detalle} className={`inline-block whitespace-nowrap text-xs tabular-nums ${clase}`} data-comida={estado}>
      {c.texto}
      <span className="sr-only">{c.enCurso ? ", en comida" : ""}{c.excedida ? ", se pasó de su tiempo" : ""} ({c.detalle})</span>
    </span>
  );
}
