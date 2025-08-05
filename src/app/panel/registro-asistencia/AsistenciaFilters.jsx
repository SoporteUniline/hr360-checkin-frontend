// src/app/panel/registro-asistencia/AsistenciaFilters.jsx
import { Combobox } from "@/components/Combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AsistenciaFilters({
  filtroEmpleado,
  setFiltroEmpleado,
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
  setPage,
  filtroDepartamento,
  setFiltroDepartamento,
  departamentos = [],
  filtroTipoRegistro,
  setFiltroTipoRegistro,
  tiposRegistro = [],
  filtroEstadoAsistencia, // Nuevo prop: el valor actual del filtro de estado de asistencia
  setFiltroEstadoAsistencia, // Nuevo prop: la función para actualizar el filtro de estado de asistencia
}) {
  const departamentoOptions = [
    { value: "", label: "Todos los departamentos" },
    ...departamentos.map((depto) => ({
      value: depto,
      label: depto,
    })),
  ];

  const tipoRegistroOptions = [
    { value: "", label: "Todos los tipos" },
    ...tiposRegistro.map((tipo) => ({
      value: tipo.clave,
      label: tipo.nombre,
    })),
  ];

  // La lógica para deseleccionar un valor se debe manejar dentro del Combobox.
  // Aquí, simplemente establecemos el nuevo valor del filtro.
  const handleDepartamentoChange = (value) => {
    setFiltroDepartamento(value);
    setPage(1); // Reinicia la paginación
  };

  const handleTipoRegistroChange = (value) => {
    setFiltroTipoRegistro(value);
    setPage(1); // Reinicia la paginación
  };

  const estadoAsistenciaOptions = [
    { value: "", label: "Todos los estados" },
    { value: "Presente", label: "Presente" },
    { value: "Ausente", label: "Ausente" },
    { value: "Tardanza", label: "Tardanza" },
    { value: "Permiso", label: "Permiso" },
    { value: "Día Libre", label: "Día Libre" },
  ];

  const handleEstadoAsistenciaChange = (value) => {
    setFiltroEstadoAsistencia(value);
    setPage(1); // Reinicia la paginación
  };

  return (
    <div className="mb-3 w-full flex gap-3 justify-between items-center">
      <div className="flex flex-col gap-2">
        <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
        <Input
          id="fecha_inicio"
          type="date"
          value={fechaInicio}
          onChange={(e) => {
            setFechaInicio(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
          placeholder="Fecha de Inicio"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fecha_fin">Fecha Fin</Label>
        <Input
          id="fecha_fin"
          type="date"
          value={fechaFin}
          onChange={(e) => {
            setFechaFin(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
          placeholder="Fecha de Fin"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="empleado">Empleado</Label>
        <Input
          id="empleado"
          placeholder="Buscar por nombre..."
          value={filtroEmpleado}
          onChange={(e) => setFiltroEmpleado(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="departamento">Departamento</Label>
        <Combobox
          name="departamento"
          options={departamentoOptions}
          value={filtroDepartamento}
          onChange={handleDepartamentoChange}
          placeholder="Elige un departamento..."
          emptyText="No se encontraron departamentos."
        />
      </div>

      {/* Nuevo filtro de Tipo de Registro */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="tipo_registro">Tipo de Registro</Label>
        <Combobox
          name="tipo_registro"
          options={tipoRegistroOptions}
          value={filtroTipoRegistro}
          onChange={handleTipoRegistroChange}
          placeholder="Elige un tipo..."
          emptyText="No se encontraron tipos de registro."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="estado_asistencia">Estado de Asistencia</Label>
        <Combobox
          name="estado_asistencia"
          options={estadoAsistenciaOptions}
          value={filtroEstadoAsistencia}
          onChange={handleEstadoAsistenciaChange}
          placeholder="Elige un estado..."
          emptyText="No se encontraron estados."
        />
      </div>
    </div>
  );
}
