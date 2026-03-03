// src/app/panel/registro-asistencia/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AsistenciaDataContainer from "./AsistenciaDataContainer";
import AsistenciaCards from "./AsistenciaCards";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import FormularioAsistenciasMasivas from "@/components/FormularioAsistenciasMasivas";
import AccesosRapidos from "@/components/AccesosRapidos";
import { ClipboardCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ControlAsistencia() {
  const [empresaActiva, setEmpresaActiva] = useState(null);
  const idEmpresa = empresaActiva;
  const getInitialFilters = () => ({
    fechaInicio: dayjs().tz("America/Mexico_City").format("YYYY-MM-DD"),
    fechaFin: dayjs().tz("America/Mexico_City").format("YYYY-MM-DD"),
    filtroEmpleado: "",
    filtroDepartamento: "",
    filtroTipoRegistro: "",
    filtroEstadoAsistencia: "",
    page: 1,
    filtroPresentes: false,
    filtroAusentes: false,
    filtroHorasExtra: false,
    filtroSinGoceDeSueldo: false,
    filtroDiasFestivos: false,
    filtroRequiereAutorizacion: false,
  });
  const [fechaInicio, setFechaInicio] = useState(
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD"),
  );
  const [fechaFin, setFechaFin] = useState(
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD"),
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const debouncedFiltroEmpleado = useDebounce(filtroEmpleado, 500);
  const [filtroDepartamento, setFiltroDepartamento] = useState("");
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState("");
  const [filtroEstadoAsistencia, setFiltroEstadoAsistencia] = useState("");
  const [mostrarCamposExtras, setMostrarCamposExtras] = useState(false);
  const [soloPresentes, setSoloPresentes] = useState(false);
  const [soloAusentes, setSoloAusentes] = useState(false);
  const [horasExtra, setHorasExtra] = useState(false);
  const [sinGoceDeSueldo, setSinGoceDeSueldo] = useState(false);
  const [diasFestivos, setDiasFestivos] = useState(false);
  const [requiereAutorizacion, setRequiereAutorizacion] = useState(false);

  const { dataUser } = useAuth();

  useEffect(() => {
    if (dataUser?.empresas?.length > 0 && !empresaActiva) {
      setEmpresaActiva("all");
    }
  }, [dataUser, empresaActiva]);

  const [modoFormulario, setModoFormulario] = useState(false);
  const [values, setValues] = useState(null);

  const abrirFormulario = () => {
    setValues(null);
    setModoFormulario(true);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
  };

  const handleResetFilters = () => {
    const initial = getInitialFilters();
    setEmpresaActiva("all");
    setFechaInicio(initial.fechaInicio);
    setFechaFin(initial.fechaFin);
    setFiltroEmpleado(initial.filtroEmpleado);
    setFiltroDepartamento(initial.filtroDepartamento);
    setFiltroTipoRegistro(initial.filtroTipoRegistro);
    setFiltroEstadoAsistencia(initial.filtroEstadoAsistencia);
    setPage(initial.page);
    setSoloPresentes(initial.filtroPresentes);
    setSoloAusentes(initial.filtroAusentes);
    setHorasExtra(initial.filtroHorasExtra);
    setSinGoceDeSueldo(initial.filtroSinGoceDeSueldo);
    setDiasFestivos(initial.filtroDiasFestivos);
    setRequiereAutorizacion(initial.filtroRequiereAutorizacion);
    setMostrarCamposExtras(false);
  };

  const { ui, data, mutate } = AsistenciaDataContainer({
    idEmpresa,
    empresaActiva,
    fechaInicio,
    fechaFin,
    page,
    limit,
    debouncedFiltroEmpleado,
    filtroDepartamento,
    filtroTipoRegistro,
    filtroEstadoAsistencia,
    setPage,
    onLimitChange: handleLimitChange,
    mostrarCamposExtras,
    abrirFormulario,
    onResetFilters: handleResetFilters,
    soloPresentes,
    soloAusentes,
    horasExtra,
    sinGoceDeSueldo,
    diasFestivos,
    requiereAutorizacion,
  });

  return (
    <div className="space-y-6">
      {/* Header ADAMIA */}
      <div className="bg-linear-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#2563EB] p-2.5 rounded-lg">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Asistencias</h1>
            <p className="text-sm text-gray-600">
              Consulta y gestiona registros de entrada/salida por empleado.
            </p>
          </div>
        </div>
      </div>

      {modoFormulario && (
        <FormularioAsistenciasMasivas
          values={values}
          setModoFormulario={setModoFormulario}
          mutate={mutate}
          idEmpresa={idEmpresa}
        />
      )}

      <AsistenciaCards totals={data} />
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Desde</label>
            <Input
              type="date"
              value={fechaInicio}
              onChange={(event) => {
                setFechaInicio(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Hasta</label>
            <Input
              type="date"
              value={fechaFin}
              onChange={(event) => {
                setFechaFin(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex justify-start lg:justify-end">
            <Button
              onClick={handleResetFilters}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>
        <div className="pt-3 mt-3 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
            <Checkbox
              checked={mostrarCamposExtras}
              onCheckedChange={(value) => setMostrarCamposExtras(Boolean(value))}
            />
            <span className="text-sm text-gray-700">Mostrar todos los campos</span>
          </label>
        </div>
      </div>
      {ui}

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
