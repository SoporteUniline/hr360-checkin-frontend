// src/app/panel/registro-asistencia/AsistenciaFilters.jsx
import { Combobox } from "@/components/Combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, Filter, Search } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import AgruparOpciones from "@/components/AgruparOpciones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

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
  onResetFilters,
  abrirFormulario,
  mostrarCamposExtras,
  setMostrarCamposExtras,
  soloPresentes,
  soloAusentes,
  horasExtra,
  diasFestivos,
  sinGoceDeSueldo,
  requiereAutorizacion,
  setSoloPresentes,
  setSoloAusentes,
  setHorasExtra,
  setSinGoceDeSueldo,
  setDiasFestivos,
  setRequiereAutorizacion,
}) {
  // Options dinámicas
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

  const estadoAsistenciaOptions = [
    { value: "", label: "Todos los estados" },
    { value: "Presente", label: "Presente" },
    { value: "Ausente", label: "Ausente" },
    { value: "Tardanza", label: "Tardanza" },
  ];

  // Config de filtros
  const filtros = [
    {
      id: "fecha_inicio",
      label: "Fecha Inicio",
      component: "input",
      type: "date",
      value: fechaInicio,
      onChange: (e) => {
        setFechaInicio(e.target.value);
        setPage(1);
      },
    },
    {
      id: "fecha_fin",
      label: "Fecha Fin",
      component: "input",
      type: "date",
      value: fechaFin,
      onChange: (e) => {
        setFechaFin(e.target.value);
        setPage(1);
      },
    },
    {
      id: "empleado",
      label: "Empleado",
      component: "input",
      placeholder: "Buscar por nombre...",
      value: filtroEmpleado,
      onChange: (e) => setFiltroEmpleado(e.target.value),
    },
    {
      id: "departamento",
      label: "Departamento",
      component: "combobox",
      options: departamentoOptions,
      value: filtroDepartamento,
      onChange: (value) => {
        setFiltroDepartamento(value);
        setPage(1);
      },
      placeholder: "Elige un departamento...",
      emptyText: "No se encontraron departamentos.",
    },
    {
      id: "tipo_registro",
      label: "Tipo de Registro",
      component: "combobox",
      options: tipoRegistroOptions,
      value: filtroTipoRegistro,
      onChange: (value) => {
        setFiltroTipoRegistro(value);
        setPage(1);
      },
      placeholder: "Elige un tipo...",
      emptyText: "No se encontraron tipos de registro.",
    },
    {
      id: "estado_asistencia",
      label: "Estado de Asistencia",
      component: "combobox",
      options: estadoAsistenciaOptions,
      value: filtroEstadoAsistencia,
      onChange: (value) => {
        setFiltroEstadoAsistencia(value);
        setPage(1);
      },
      placeholder: "Elige un estado...",
      emptyText: "No se encontraron estados.",
    },
  ];

  return (
    <Card className="border-blue-100 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-blue-700 flex items-center gap-2">
          <Filter className="h-4 w-4" /> Filtros de búsqueda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
      {/* <div className="flex justify-end gap-4">
        <Button
          onClick={abrirFormulario}
          className=" shadow-lg transition-all duration-200 hover:shadow-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar Asistencia Masiva
        </Button>
        <Button
          onClick={onResetFilters}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Limpiar Filtros
        </Button>
      </div> */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtros.map((filtro) => (
            <div key={filtro.id} className="flex flex-col gap-2 w-full">
              <Label htmlFor={filtro.id} className="text-sm font-medium text-gray-700">
                {filtro.label}
              </Label>

              {filtro.component === "input" ? (
                <div className="relative">
                  {filtro.id === "empleado" ? (
                    <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  ) : null}
                  <Input
                    id={filtro.id}
                    type={filtro.type || "text"}
                    placeholder={filtro.placeholder}
                    value={filtro.value}
                    onChange={filtro.onChange}
                    className={filtro.id === "empleado" ? "pl-9" : ""}
                  />
                </div>
              ) : (
                <Combobox
                  name={filtro.id}
                  options={filtro.options}
                  value={filtro.value}
                  onChange={filtro.onChange}
                  placeholder={filtro.placeholder}
                  emptyText={filtro.emptyText}
                />
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-blue-100">
          <div className="text-sm font-semibold text-gray-900 mb-2">Filtros rápidos</div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox checked={soloPresentes} onCheckedChange={(v) => setSoloPresentes(Boolean(v))} />
              <span className="text-sm text-gray-700">Solo presentes</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox checked={soloAusentes} onCheckedChange={(v) => setSoloAusentes(Boolean(v))} />
              <span className="text-sm text-gray-700">Solo ausencias</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox checked={horasExtra} onCheckedChange={(v) => setHorasExtra(Boolean(v))} />
              <span className="text-sm text-gray-700">Con horas extra</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox checked={sinGoceDeSueldo} onCheckedChange={(v) => setSinGoceDeSueldo(Boolean(v))} />
              <span className="text-sm text-gray-700">Sin goce de sueldo</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox checked={diasFestivos} onCheckedChange={(v) => setDiasFestivos(Boolean(v))} />
              <span className="text-sm text-gray-700">Días festivos</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox checked={requiereAutorizacion} onCheckedChange={(v) => setRequiereAutorizacion(Boolean(v))} />
              <span className="text-sm text-gray-700">Requiere autorización</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox checked={mostrarCamposExtras} onCheckedChange={(v) => setMostrarCamposExtras(Boolean(v))} />
              <span className="text-sm text-gray-700">Mostrar todos los campos</span>
            </label>
          </div>
        </div>

        <AgruparOpciones />

        <div className="flex justify-end">
          <Button
            onClick={onResetFilters}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
