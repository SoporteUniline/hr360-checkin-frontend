"use client";

// Desglose de la nómina formal en el recibo: gravado y exento por concepto, ISR según tarifa, subsidio para el empleo,
// ISR retenido, SBC, IMSS del trabajador y del patrón (informativo). Si a la persona le faltan datos, lo dice y lleva a
// completarlos. Los importes los calcula el servidor (datos.fiscal); aquí solo se muestran.
import Link from "next/link";
import { dinero } from "@/lib/nomina/nomina.mjs";
import { conceptosGravados, filasDesglose } from "@/lib/nomina/formal.mjs";

export default function DesgloseFiscal({ fiscal, idEmpleado }) {
  if (!fiscal?.formal) return null;
  if (!fiscal.calculado) {
    return (
      <section aria-label="ISR e IMSS" className="grid gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-base text-red-900" data-desglose-fiscal="sin-calcular">
        <h3 className="text-base font-bold">No se calculó el ISR ni el IMSS</h3>
        <ul className="grid list-disc gap-1 pl-5">{(fiscal.faltantes ?? []).map((f) => <li key={f}>{f}</li>)}</ul>
        <p>Esta nómina no se puede enviar ni autorizar hasta que se completen sus datos y se recalcule.</p>
        {idEmpleado ? <Link href={`/panel/nomina/configuracion/personas/${idEmpleado}`} className="font-bold text-[#1D3FB8] underline">Completar sus datos fiscales</Link> : null}
      </section>
    );
  }
  const conceptos = conceptosGravados(fiscal);
  return (
    <section aria-label="ISR e IMSS" className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-base text-[#0B1033]" data-desglose-fiscal="calculado">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold">ISR e IMSS</h3>
        <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-base font-bold text-[#374151]">Pre-nómina, no timbrada</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-base tabular-nums">
          <caption className="sr-only">Gravado y exento por concepto</caption>
          <thead>
            <tr className="text-left text-base text-slate-600">
              <th className="py-1 pr-2 font-bold" style={{ fontSize: 16 }}>Concepto</th>
              <th className="py-1 pr-2 text-right font-bold" style={{ fontSize: 16 }}>Gravado</th>
              <th className="py-1 text-right font-bold" style={{ fontSize: 16 }}>Exento</th>
            </tr>
          </thead>
          <tbody>
            {conceptos.map((c) => (
              <tr key={c.clave} className="border-t border-slate-100 align-top">
                <td className="py-1.5 pr-2">{c.concepto}{Number(c.exento) > 0 ? <span className="block text-base text-slate-600">{c.regla}</span> : null}</td>
                <td className="py-1.5 pr-2 text-right">{dinero(c.gravado)}</td>
                <td className="py-1.5 text-right">{dinero(c.exento)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid gap-2">
        {filasDesglose(fiscal).map((f) => (
          <div key={f.clave} className="grid gap-0.5 border-t border-slate-100 pt-2" data-fila-fiscal={f.clave}>
            <div className="flex items-baseline justify-between gap-3">
              <dt className={f.fuerte ? "font-bold" : ""}>{f.texto}</dt>
              <dd className={`shrink-0 tabular-nums ${f.fuerte ? "font-bold" : ""}`}>{f.valor}</dd>
            </div>
            {f.nota ? <p className="text-base text-slate-600">{f.nota}</p> : null}
          </div>
        ))}
      </dl>
      {(fiscal.avisos ?? []).length ? (
        <ul className="grid gap-1 rounded-lg bg-amber-50 p-3 text-base text-amber-950">{fiscal.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
      ) : null}
      <p className="text-base text-slate-600">Cálculo de ADAMIA con las tablas fiscales confirmadas. Valídalo con tu contador: este recibo no es un CFDI.</p>
    </section>
  );
}
