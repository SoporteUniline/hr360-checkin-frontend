import { CheckCircle, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function StatsCards({ empleadosActivos, totalRegistros }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
              Empleados activos
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {empleadosActivos ?? 0}
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2.5">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
              Registros hoy
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {totalRegistros ?? 0}
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2.5">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
