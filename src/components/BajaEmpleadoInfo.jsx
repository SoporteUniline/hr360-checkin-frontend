import { formatDateDMY } from "@/lib/formatDate";

export default function BajaEmpleadoInfo({ empleado }) {
  if (!empleado || (!empleado.fecha_baja && !empleado.motivo_baja)) return null;

  return (
    <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4" aria-label="Baja del empleado">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Baja del empleado</h3>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="font-medium text-slate-700">Fecha de baja</dt>
          <dd className="text-slate-900">{formatDateDMY(empleado.fecha_baja) || "Sin fecha registrada"}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-700">Motivo de baja</dt>
          <dd className="whitespace-pre-wrap break-words text-slate-900">{empleado.motivo_baja?.trim() || "Sin motivo registrado"}</dd>
        </div>
      </dl>
    </section>
  );
}
