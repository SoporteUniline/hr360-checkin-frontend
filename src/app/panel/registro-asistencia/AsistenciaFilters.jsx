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
  filtroEstadoAsistencia,
  setFiltroEstadoAsistencia,
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

  const handleDepartamentoChange = (value) => {
    setFiltroDepartamento(value);
    setPage(1);
  };

  const handleTipoRegistroChange = (value) => {
    setFiltroTipoRegistro(value);
    setPage(1);
  };

  const estadoAsistenciaOptions = [
    { value: "", label: "Todos los estados" },
    { value: "Presente", label: "Presente" },
    { value: "Ausente", label: "Ausente" },
    { value: "Tardanza", label: "Tardanza" },
  ];

  const handleEstadoAsistenciaChange = (value) => {
    setFiltroEstadoAsistencia(value);
    setPage(1);
  };

  return (
    <div className="flex flex-col md:flex-row md:flex-wrap md:justify-start gap-4 mb-4 p-4">
      <div className="flex flex-col gap-2 w-full md:w-auto">
        <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
        <Input
          id="fecha_inicio"
          type="date"
          value={fechaInicio}
          onChange={(e) => {
            setFechaInicio(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="flex flex-col gap-2 w-full md:w-auto">
        <Label htmlFor="fecha_fin">Fecha Fin</Label>
        <Input
          id="fecha_fin"
          type="date"
          value={fechaFin}
          onChange={(e) => {
            setFechaFin(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="flex flex-col gap-2 w-full md:w-auto">
        <Label htmlFor="empleado">Empleado</Label>
        <Input
          id="empleado"
          placeholder="Buscar por nombre..."
          value={filtroEmpleado}
          onChange={(e) => setFiltroEmpleado(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2 w-full md:w-auto">
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

      <div className="flex flex-col gap-2 w-full md:w-auto">
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

      <div className="flex flex-col gap-2 w-full md:w-auto">
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
