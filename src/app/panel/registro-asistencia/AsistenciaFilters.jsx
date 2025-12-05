// src/app/panel/registro-asistencia/AsistenciaFilters.jsx
import { Combobox } from "@/components/Combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw } from "lucide-react"; // Icono para resetear
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import AgruparOpciones from "@/components/AgruparOpciones";

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
    <div className="space-y-4">
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
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtros.map((filtro) => (
            <div key={filtro.id} className="flex flex-col gap-2 w-full">
              <Label htmlFor={filtro.id}>{filtro.label}</Label>

              {filtro.component === "input" ? (
                <Input
                  id={filtro.id}
                  type={filtro.type || "text"}
                  placeholder={filtro.placeholder}
                  value={filtro.value}
                  onChange={filtro.onChange}
                />
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
        <div className="mb-6">
          <hr className="mt-4 mb-2" />
          <p className="mb-2 font-semibold">Filtros rápidos:</p>
          <div className="grid gap-3 mt-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="checkPresentes"
                checked={soloPresentes}
                onChange={(e) => setSoloPresentes(e.target.checked)}
              />
              <label htmlFor="checkPresentes" className="cursor-pointer">
                Solo Presentes
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="checkAusentes"
                checked={soloAusentes}
                onChange={(e) => setSoloAusentes(e.target.checked)}
              />
              <label htmlFor="checkAusentes" className="cursor-pointer">
                Solo Ausencias
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="checkHrsExtra"
                checked={horasExtra}
                onChange={(e) => setHorasExtra(e.target.checked)}
              />
              <label htmlFor="checkHrsExtra" className="cursor-pointer">
                Con Horas Extra
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="checkSinGoceDeSueldo"
                checked={sinGoceDeSueldo}
                onChange={(e) => setSinGoceDeSueldo(e.target.checked)}
              />
              <label htmlFor="checkSinGoceDeSueldo" className="cursor-pointer">
                Sin goce de sueldo
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="checkDiasFestivos"
                checked={diasFestivos}
                onChange={(e) => setDiasFestivos(e.target.checked)}
              />
              <label htmlFor="checkDiasFestivos" className="cursor-pointer">
                Días festivos
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="checkRequiereAutorizacion"
                checked={requiereAutorizacion}
                onChange={(e) => setRequiereAutorizacion(e.target.checked)}
              />
              <label
                htmlFor="checkRequiereAutorizacion"
                className="cursor-pointer"
              >
                Requiere autorización
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="toggleCamposExtras"
                checked={mostrarCamposExtras}
                onChange={(e) => setMostrarCamposExtras(e.target.checked)}
              />
              <label htmlFor="toggleCamposExtras">
                Mostrar todos los campos
              </label>
            </div>
          </div>
        </div>
        <AgruparOpciones />
      </div>
    </div>
  );
}
