"use client";

// Banda de la LFT + totales + tabla de todos los empleados del periodo (maqueta aprobada 19/11/2026).
// Datos: GET /checador/reportes/horas-ley → reporte.ley (backend services/reporteLey.js).

import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";

const fmt = (m) => formatearMinutos(Number(m) || 0);

// Regla aplicable: la de la última semana del periodo (horas ordinarias y tope de extra al doble).
function reglaDelPeriodo(reportes) {
  const semanas = reportes.flatMap((r) => r.ley?.semanas ?? []);
  return semanas.at(-1) ?? null;
}

export function Chip({ tono = "gr", children }) {
  const tonos = {
    ok: "bg-emerald-50 text-emerald-700",
    or: "bg-orange-50 text-orange-700",
    rj: "bg-red-50 text-red-700",
    az: "bg-blue-50 text-blue-700",
    gr: "bg-slate-100 text-slate-600",
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${tonos[tono]}`}>{children}</span>;
}

export default function ResumenLey({ reportes, onElegir }) {
  const conLey = (reportes ?? []).filter((r) => r.ley);
  if (!conLey.length) return null;
  const regla = reglaDelPeriodo(conLey);
  const total = (k) => conLey.reduce((t, r) => t + (Number(r.ley[k]) || 0), 0);
  const conAlerta = conLey.filter((r) => r.ley.alertas.length).length;
  const limite = regla?.limite;

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4" aria-label="Resumen de la LFT">
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[12.5px] text-slate-700">
        <b>LFT{limite ? "" : " (sin regla para estas fechas)"}</b>
        {limite != null && (
          <>
            {" "}· ordinaria máx. <b>{fmt(limite)}</b>/semana · extra máx. <b>4 h/día</b> en <b>4 días</b> ·{" "}
            <b>{fmt(regla.topeDoble)}</b> dobles/semana, el resto triples · jornada máx. <b>12 h/día</b> · menores: sin horas extra
          </>
        )}
        <span className="block text-[11px] text-violet-700">
          Fuente: DOF 1/may/2026, transitorios 2.º y 4.º · Solo cuentan las horas extra autorizadas en Asistencias · Horas, no pesos.
        </span>
      </div>

      <div className="my-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        {[
          ["Trabajadas", fmt(total("trabajado")), "text-slate-900"],
          ["Extra dobles", fmt(total("dobles")), "text-emerald-700"],
          ["Extra triples", fmt(total("triples")), total("triples") ? "text-red-700" : "text-slate-900"],
          ["Por autorizar", fmt(total("porAutorizar")), total("porAutorizar") ? "text-orange-700" : "text-slate-900"],
          ["Empleados con alertas de ley", `${conAlerta} de ${conLey.length}`, conAlerta ? "text-red-700" : "text-slate-900"],
        ].map(([etiqueta, valor, color]) => (
          <div key={etiqueta} className="rounded-xl border border-slate-200 px-3 py-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</p>
            <p className={`text-lg font-extrabold tabular-nums ${color}`}>{valor}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-slate-50 text-left text-[10.5px] uppercase tracking-wide text-slate-500">
              {["Empleado", "Trabajadas", "Programadas", limite != null ? `vs ${fmt(limite)}` : "vs límite", "Extra dobles", "Extra triples", "Por autorizar", "Alertas de ley"].map((t) => (
                <th key={t} className="px-2 py-2 font-semibold">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conLey.map((r, i) => {
              const dif = limite != null ? r.ley.trabajado - limite * (r.ley.semanas.length || 1) : null;
              return (
                <tr key={r.empleado?.id_empleado ?? i} onClick={() => onElegir?.(i)} className="cursor-pointer border-t border-slate-100 tabular-nums hover:bg-slate-50">
                  <td className="px-2 py-2 font-semibold text-slate-800">{r.empleado?.nombre_empleado}</td>
                  <td className="px-2 py-2">{fmt(r.ley.trabajado)}</td>
                  <td className="px-2 py-2">{fmt(r.ley.programado)}</td>
                  <td className="px-2 py-2">
                    {dif == null ? "—" : <Chip tono={dif > 0 ? "rj" : "gr"}>{dif > 0 ? "+" : ""}{formatearMinutos(dif, { signo: dif < 0 })}</Chip>}
                  </td>
                  <td className="px-2 py-2 text-emerald-700">{fmt(r.ley.dobles)}</td>
                  <td className={`px-2 py-2 ${r.ley.triples ? "text-red-700" : ""}`}>{fmt(r.ley.triples)}</td>
                  <td className={`px-2 py-2 ${r.ley.porAutorizar ? "text-orange-700" : ""}`}>{fmt(r.ley.porAutorizar)}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.ley.alertas.length ? r.ley.alertas.map((a) => <Chip key={a} tono="rj">{a}</Chip>) : <Chip>Sin alertas</Chip>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-slate-400">Clic en un empleado para ir a su hoja (abajo), lista para firmar.</p>
    </section>
  );
}
