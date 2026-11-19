// src/app/panel/registro-asistencia/HistorialEmpleadoDialog.jsx
// Checadas del reloj en un diálogo. Solo se usa en vistas de solo lectura: en la tabla
// editable, la fila abre el panel lateral con checadas y edición juntos.
import dayjs from "dayjs";
import { Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ChecadasDelDia from "./ChecadasDelDia";

export default function HistorialEmpleadoDialog({ isOpen, onOpenChange, empleado, mutateAsistencia }) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6" />
            <div>
              <DialogTitle className="text-lg font-semibold text-white">Historial de entradas y salidas</DialogTitle>
              <DialogDescription className="text-sm text-white/90">
                {empleado?.nombre} {empleado?.apellido_paterno} — {dayjs(empleado?.fecha).format("DD/MM/YYYY")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="p-6">
          <ChecadasDelDia empleado={empleado} activo={isOpen} mutateAsistencia={mutateAsistencia} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
