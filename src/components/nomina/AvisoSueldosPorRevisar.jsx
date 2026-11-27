// (27/11/2026, docs/contratos.md del backend) El sueldo vive en el contrato vigente. Si la ficha de alguien dice otro,
// la nómina no se crea ni se autoriza hasta que RH decida cuál es el correcto en «Revisar sueldos». Ver sí se puede.
import Link from "next/link";
import { dinero } from "@/lib/nomina/nomina.mjs";

const POR = { Mensual: "al mes", Quincenal: "a la quincena", Catorcenal: "a la catorcena", Semanal: "a la semana", Diario: "al día", "Por hora": "por hora" };

/** personas: [{ id_empleado, nombre, sueldo_ficha, periodo_ficha, contrato_en_periodo_ficha, folio }]. accion: «crear» | «autorizar». */
export default function AvisoSueldosPorRevisar({ personas = [], accion = "autorizar" }) {
  if (!personas.length) return null;
  return (
    <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-[16px] text-amber-900" data-aviso="sueldos-por-revisar">
      <p className="m-0 font-bold">No se puede {accion} esta nómina: hay sueldos por revisar.</p>
      <p className="m-0 mt-1">El sueldo de la ficha no coincide con el del contrato vigente de:</p>
      <ul className="m-0 mt-1 list-disc pl-5">
        {personas.map((p) => (
          <li key={p.id_empleado}>
            <b>{p.nombre}</b>: ficha {dinero(p.sueldo_ficha)} {POR[p.periodo_ficha] ?? ""} · contrato{p.folio ? ` ${p.folio}` : ""} {dinero(p.contrato_en_periodo_ficha)} {POR[p.periodo_ficha] ?? ""}
          </li>
        ))}
      </ul>
      <Link href="/panel/contratos/revisar-sueldos" className="mt-2 inline-flex min-h-12 items-center rounded-[14px] bg-[#2C56E8] px-5 font-bold text-white no-underline hover:bg-[#1E40C4]">
        Revisar sueldos
      </Link>
    </div>
  );
}
