"use client";

// Asistencia de una persona en el periodo de nómina: de dónde sale cada número (días, faltas, retardos, horas extra,
// festivos, domingos y el sueldo), día por día y con lo que se pagó de más cada día. Misma tipografía que Asistencias.
// `modo="tabla"`: desplegable de la tabla de la nómina; `modo="compacto"`: dentro del panel del recibo (menos columnas).
// `onCorregir(fecha)`: abre la ventana de edición de Asistencias de ese día (solo con la nómina en borrador).
import { Pencil } from "lucide-react";
import { DIA, diaCorto, dinero, horas } from "@/lib/nomina/nomina.mjs";
import { Chip } from "./comun";

function explicaSueldo(r) {
  const sueldo = dinero((r.sueldo ?? 0) / 100);
  if (r.periodoPago === "Diario") return `${sueldo} diarios × ${r.diasPagados} días pagados`;
  if (r.periodoPago === "Por hora") return `${sueldo} por hora × horas ordinarias trabajadas`;
  return `${sueldo} ${String(r.periodoPago ?? "").toLowerCase()} × ${r.diasPagados} días pagados ÷ ${r.diasRango} días del periodo`;
}

// Franja de totales al estilo de Asistencias: cuadrito de color, etiqueta y número.
export function ResumenAsistencia({ r }) {
  const extra = (r.minDobles ?? 0) + (r.minTriples ?? 0);
  const datos = [
    ["#10b981", "Trabajó", `${r.diasTrabajados} d`, r.minTrabajados ? horas(r.minTrabajados) : null],
    ["#f43f5e", "Faltas", r.faltas, r.sinGoce ? `${r.sinGoce} sin goce` : null],
    ["#f59e0b", "Retardos", r.retardos, null],
    ["#7c3aed", "Horas extra", extra ? horas(extra) : 0, r.minTriples ? `${horas(r.minTriples)} al triple` : null],
    ["#2563eb", "Días pagados", `${r.diasPagados} de ${r.diasRango}`, null],
  ];
  if (r.domingos) datos.push(["#64748b", "Domingos", r.domingos, "con prima"]);
  if (r.festivosTrab) datos.push(["#64748b", "Festivos trabajados", r.festivosTrab, "+200 %"]);
  if (r.descansosTrab) datos.push(["#64748b", "Descansos trabajados", r.descansosTrab, "+200 %"]);
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
      {datos.map(([color, t, v, n]) => (
        <p key={t} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
          <span className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: color }} />
          {t} <b className="font-extrabold tabular-nums text-gray-900">{v}</b>
          {n ? <span className="font-normal text-gray-400">· {n}</span> : null}
        </p>
      ))}
    </div>
  );
}

function PagosDia({ pagos }) {
  if (!pagos?.length) return <span className="text-slate-300">—</span>;
  return (
    <span className="grid gap-0.5">
      {pagos.map((p) => (
        <span key={p.texto} className="whitespace-nowrap text-[12px]">
          <b className="tabular-nums text-emerald-700">+{dinero(p.importe / 100)}</b> <span className="text-slate-500">{p.texto}</span>
        </span>
      ))}
    </span>
  );
}

export default function AsistenciaRecibo({ recibo, modo = "tabla", onEditar, onCorregir }) {
  const d = recibo.datos ?? {};
  const r = d.resumen ?? {};
  const dias = d.dias ?? [];
  if (r.diasTrabajados == null) {
    return <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Presiona «Recalcular» para ver la asistencia de este recibo.</p>;
  }
  const compacto = modo === "compacto";
  const extra = (r.minDobles ?? 0) + (r.minTriples ?? 0);
  const columnas = compacto
    ? ["Día", "Qué pasó", "Entrada · salida", "Trabajó", "Se pagó de más"]
    : ["Día", "Qué pasó", "Entrada", "Salida", "Trabajó", "Su jornada", "Se pagó de más"];
  if (onCorregir) columnas.push("");
  const th = "px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-500";
  const td = "px-3 py-2";

  return (
    <section className="grid gap-3 text-[13px]" aria-label={`Asistencia de ${d.empleado?.nombre ?? "la persona"}`}>
      <ResumenAsistencia r={r} />
      <div className="grid gap-1 rounded-xl bg-blue-50/70 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-slate-700">
        {r.sueldo ? <p><b className="text-slate-900">Sueldo:</b> {explicaSueldo(r)}{r.diario ? ` · diario ${dinero(r.diario / 100)}` : ""}.</p> : null}
        {extra ? (
          <p><b className="text-slate-900">Horas extra:</b> {horas(r.minDobles)} al doble{r.minTriples ? ` y ${horas(r.minTriples)} al triple (pasó el tope semanal de la ley)` : ""}. Solo cuentan las autorizadas en Asistencias.</p>
        ) : null}
        {r.domingos || r.festivosTrab || r.descansosTrab ? <p><b className="text-slate-900">Días especiales:</b> prima dominical 25 % del diario por domingo; festivo o descanso trabajado +200 % (dos días más).</p> : null}
        {r.retardos ? <p><b className="text-slate-900">Retardos:</b> no descuentan sueldo; solo quitan bonos condicionados a puntualidad.</p> : null}
      </div>
      {dias.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className={`w-full tabular-nums ${compacto ? "min-w-[600px]" : "min-w-[760px]"}`}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left">{columnas.map((h, i) => <th key={h || i} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {dias.map((x) => {
                const e = DIA[x.estado] ?? DIA.inactivo;
                const apagado = x.estado === "descanso" || x.estado === "inactivo";
                return (
                  <tr key={x.fecha} className={`border-t border-slate-100 ${x.estado === "falta" ? "bg-rose-50/40" : ""} ${apagado ? "text-slate-400" : "text-slate-800"}`}>
                    <td className={`${td} whitespace-nowrap font-semibold capitalize`}>{diaCorto(x.fecha)}</td>
                    <td className={td}>
                      <span className="flex flex-wrap gap-1">
                        <Chip tono={e.tono}>{e.texto}</Chip>
                        {x.retardo ? <Chip tono="ambar">Retardo</Chip> : null}
                        {x.domingo && !apagado ? <Chip tono="azul">Domingo</Chip> : null}
                      </span>
                      {x.estado === "permiso_sin_goce" && x.nota ? <span className="text-[11px] text-slate-500">{x.nota}</span> : null}
                    </td>
                    {compacto ? (
                      <td className={`${td} whitespace-nowrap`}>
                        {x.entrada || x.salida ? <><span className={x.retardo ? "font-semibold text-amber-700" : ""}>{x.entrada ?? "—"}</span> – {x.salida ?? "—"}</> : "—"}
                      </td>
                    ) : (
                      <>
                        <td className={`${td} ${x.retardo ? "font-semibold text-amber-700" : ""}`}>{x.entrada ?? "—"}</td>
                        <td className={td}>{x.salida ?? "—"}</td>
                      </>
                    )}
                    <td className={`${td} whitespace-nowrap`}>{horas(x.min)}{x.extra ? <span className="block text-[11px] text-violet-700">{horas(x.extra)} extra autorizada</span> : null}</td>
                    {compacto ? null : <td className={`${td} whitespace-nowrap text-slate-500`}>{horas(x.programado)}</td>}
                    <td className={td}><PagosDia pagos={x.pagos} /></td>
                    {onCorregir ? (
                      <td className={`${td} text-right`}>
                        <button type="button" onClick={() => onCorregir(x.fecha)} title="Corregir asistencia" className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-semibold text-[#2c56e8] hover:bg-blue-50" aria-label={`Corregir asistencia del ${diaCorto(x.fecha)}`}>
                          <Pencil className="size-3.5" />{compacto ? null : " Corregir"}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {onEditar ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEditar} className="rounded-lg bg-[#2c56e8] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1f44c8]">Revisar recibo y ajustar importes</button>
        </div>
      ) : null}
    </section>
  );
}
