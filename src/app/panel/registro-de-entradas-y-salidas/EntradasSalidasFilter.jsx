// src/app/panel/registro-asistencia/AsistenciaFilters.jsx
import { Input } from "@/components/ui/input";

export default function EntradasSalidasFilter({
  filtroEmpleado,
  setFiltroEmpleado,
  fecha,
  setFecha,
  setPage,
}) {
  return (
    <div className="mb-3 w-full flex gap-3 justify-between items-center">
      <Input
        placeholder="Buscar empleado por nombre..."
        value={filtroEmpleado}
        onChange={(e) => setFiltroEmpleado(e.target.value)}
        className="w-full max-w-md"
      />
      <Input
        type="date"
        value={fecha}
        onChange={(e) => {
          setFecha(e.target.value);
          setPage(1); // Reset page when date changes
        }}
        className="max-w-xs"
      />
    </div>
  );
}
