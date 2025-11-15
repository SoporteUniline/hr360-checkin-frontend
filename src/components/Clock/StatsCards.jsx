import { CheckCircle, Calendar } from "lucide-react";

export default function StatsCards({ empleadosActivos, totalRegistros }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 text-center">
        <div className="w-12 h-12 mx-auto bg-green-100 rounded-xl flex items-center justify-center mb-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div className="text-2xl font-bold text-slate-800">
          {empleadosActivos}
        </div>
        <div className="text-sm text-slate-600">Empleados Activos</div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 text-center">
        <div className="w-12 h-12 mx-auto bg-slate-100 rounded-xl flex items-center justify-center mb-3">
          <Calendar className="w-6 h-6 text-slate-600" />
        </div>
        <div className="text-2xl font-bold text-slate-800">
          {totalRegistros}
        </div>
        <div className="text-sm text-slate-600">Registros Hoy</div>
      </div>
    </div>
  );
}
