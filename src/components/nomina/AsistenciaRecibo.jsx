"use client";

// Asistencia de una persona en el periodo de nómina: de dónde sale cada número (días, faltas, retardos, horas extra
// y el sueldo). `modo="tabla"`: desplegable de la tabla de la nómina con el día por día completo;
// `modo="compacto"`: resumen para el panel del recibo.
import { DIA, diaCorto, dinero, horas } from "@/lib/nomina/nomina.mjs";
import { Chip } from "./comun";

function explicaSueldo(r) {
  const sueldo = dinero((r.sueldo ?? 0) / 100);
  if (r.periodoPago === "Diario") return `${sueldo} diarios × ${r.diasPagados} días pagados`;
  if (r.periodoPago === "Por hora") return `${sueldo} por hora × horas ordinarias trabajadas`;
  return `${sueldo} ${String(r.periodoPago ?? "").toLowerCase()} × ${r.diasPagados} días pagados ÷ ${r.diasRango} días del periodo`;
}

export function ResumenAsistencia({ r }) {
  const extra = (r.minDobles ?? 0) + (r.minTriples ?? 0);
  const tarjetas = [
    ["Trabajó", `${r.diasTrabajados} d`, horas(r.minTrabajados)],
    ["Faltas", r.faltas, r.sinGoce ? `${r.sinGoce} sin goce` : null],
    ["Retardos", r.retardos, "no descuentan"],
    ["Horas extra", horas(extra), r.minTriples ? `${horas(r.minTriples)} al triple` : extra ? "al doble" : null],
    ["Días pagados", `${r.diasPagados} / ${r.diasRango}`, "con descanso proporcional"],
    ["Domingos / festivos", `${r.domingos ?? 0} / ${r.festivosTrab ?? 0}`, "trabajados"],
  ];
  return (
    <div className="grid grid-cols-3 gap-2 text-center lg:grid-cols-6">
      {tarjetas.map(([t, v, n]) => (
        <div key={t} className="rounded-lg border border-gray-200 bg-white p-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">{t}</p>
          <p className="text-base font-extrabold tabular-nums text-gray-900">{v}</p>
          {n ? <p className="text-[11px] text-gray-500">{n}</p> : null}
        </div>
      ))}
    </div>
  );
}

export default function AsistenciaRecibo({ recibo, modo = "tabla", onEditar }) {
  const d = recibo.datos ?? {};
  const r = d.resumen ?? {};
  const dias = d.dias ?? [];
  if (r.diasTrabajados == null) {
    return <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Presiona «Recalcular» para ver la asistencia de este recibo.</p>;
  }
  const extra = (r.minDobles ?? 0) + (r.minTriples ?? 0);
  return (
    <section className="grid gap-3 text-[13px]" aria-label={`Asistencia de ${d.empleado?.nombre ?? "la persona"}`}>
      <ResumenAsistencia r={r} />
      <div className="grid gap-1 rounded-lg bg-blue-50 p-3 text-[12.5px] text-blue-950">
        {r.sueldo ? <p><b>Sueldo:</b> {explicaSueldo(r)}{r.diario ? ` · diario ${dinero(r.diario / 100)}` : ""}.</p> : null}
        {extra ? (
          <p>
            <b>Horas extra autorizadas:</b> {horas(r.minDobles)} al doble{r.minTriples ? ` y ${horas(r.minTriples)} al triple (pasó el tope semanal de la ley)` : ""}
. Solo cuentan las autorizadas en Asistencias.
          </p>
        ) : null}
        {r.retardos ? <p><b>Retardos:</b> no descuentan sueldo; solo quitan bonos condicionados a puntualidad.</p> : null}
      </div>
      {modo === "tabla" && dias.length ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[640px] tabular-nums">
            <thead>
              <tr className="bg-gray-50 text-left text-[10px] uppercase tracking-wide text-gray-500">
                {["Día", "Qué pasó", "Entrada", "Salida", "Trabajó", "Su jornada", "Extra autorizada"].map((h) => <th key={h} className="px-2.5 py-1.5 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {dias.map((x) => {
                const e = DIA[x.estado] ?? DIA.inactivo;
                return (
                  <tr key={x.fecha} className={`border-t border-gray-100 ${x.estado === "falta" ? "bg-red-50/40" : x.estado === "descanso" || x.estado === "inactivo" ? "text-gray-400" : ""}`}>
                    <td className="whitespace-nowrap px-2.5 py-1.5 font-semibold capitalize">{diaCorto(x.fecha)}</td>
                    <td className="px-2.5 py-1.5">
                      <span className="flex flex-wrap gap-1">
                        <Chip tono={e.tono}>{e.texto}</Chip>
                        {x.retardo ? <Chip tono="ambar">Retardo</Chip> : null}
                      </span>
                      {x.estado === "permiso_sin_goce" && x.nota ? <span className="text-[11px] text-gray-500">{x.nota}</span> : null}
                    </td>
                    <td className={`px-2.5 py-1.5 ${x.retardo ? "font-semibold text-amber-700" : ""}`}>{x.entrada ?? "—"}</td>
                    <td className="px-2.5 py-1.5">{x.salida ?? "—"}</td>
                    <td className="px-2.5 py-1.5">{horas(x.min)}</td>
                    <td className="px-2.5 py-1.5 text-gray-500">{horas(x.programado)}</td>
                    <td className={`px-2.5 py-1.5 ${x.extra ? "font-semibold text-emerald-700" : "text-gray-400"}`}>{x.extra ? `+${horas(x.extra)}` : "—"}</td>
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
