import { CheckCircle, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function StatsCards({ empleadosActivos, totalRegistros }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase text-gray-500">
              Empleados activos
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {empleadosActivos ?? 0}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-green-50">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase text-gray-500">
              Registros hoy
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalRegistros ?? 0}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50">
            <Calendar className="w-5 h-5 text-[#2563EB]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
