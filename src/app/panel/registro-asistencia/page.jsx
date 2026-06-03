// src/app/panel/registro-asistencia/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AsistenciaDataContainer from "./AsistenciaDataContainer";
import AsistenciaCards from "./AsistenciaCards";
import MobileAsistenciaView from "./MobileAsistenciaView";
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
import { useIsMobile } from "@/hooks/use-mobile";
import useDepartamentosData from "@/hooks/useDepartamentosData";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ControlAsistencia() {
  const searchParams = useSearchParams();
  const [empresaActiva, setEmpresaActiva] = useState(null);
  const idEmpresa = empresaActiva;
  const initialDate =
    searchParams.get("fecha") ||
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");
  const getInitialFilters = () => ({
    fechaInicio: initialDate,
    fechaFin: initialDate,
    filtroEmpleado: searchParams.get("empleado") || "",
    filtroDepartamento: [],
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
  const [fechaInicio, setFechaInicio] = useState(initialDate);
  const [fechaFin, setFechaFin] = useState(initialDate);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtroEmpleado, setFiltroEmpleado] = useState(
    searchParams.get("empleado") || "",
  );
  const debouncedFiltroEmpleado = useDebounce(filtroEmpleado, 500);
  const [filtroDepartamento, setFiltroDepartamento] = useState([]);
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState("");
  const [filtroEstadoAsistencia, setFiltroEstadoAsistencia] = useState("");
  const [mostrarCamposExtras, setMostrarCamposExtras] = useState(false);
  const [soloPresentes, setSoloPresentes] = useState(false);
  const [soloAusentes, setSoloAusentes] = useState(false);
  const [horasExtra, setHorasExtra] = useState(false);
  const [sinGoceDeSueldo, setSinGoceDeSueldo] = useState(false);
  const [diasFestivos, setDiasFestivos] = useState(false);
  const [requiereAutorizacion, setRequiereAutorizacion] = useState(false);
  const [filtroRapido, setFiltroRapido] = useState("hoy");

  const { dataUser } = useAuth();
  const isMobile = useIsMobile();
  const { departamentos } = useDepartamentosData(idEmpresa);

  useEffect(() => {
    if (dataUser?.empresas?.length > 0 && !empresaActiva) {
      setEmpresaActiva("all");
    }
  }, [dataUser, empresaActiva]);

  // Use a larger limit on mobile to load all employees for client-side grouping
  useEffect(() => {
    if (isMobile) setLimit(500);
    else setLimit(10);
  }, [isMobile]);

  const [modoFormulario, setModoFormulario] = useState(false);
  const [values, setValues] = useState(null);

  const abrirFormulario = () => {
    setValues(null);
    setModoFormulario(true);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
  };

  const today = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");

  const aplicarFiltroRapido = (tipo) => {
    const hoy = dayjs().tz("America/Mexico_City");

    let inicio = hoy;
    let fin = hoy;

    switch (tipo) {
      case "hoy":
        break;

      case "semana":
        inicio = hoy.startOf("week");
        break;

      case "quinceDias":
        inicio = hoy.subtract(14, "day");
        break;

      case "ultimoMes":
        inicio = hoy.subtract(1, "month");
        break;

      case "semestre":
        inicio = hoy.subtract(6, "month");
        break;

      case "anio":
        inicio = hoy.startOf("year");
        break;

      case "todo":
        setFechaInicio("");
        setFechaFin("");
        setFiltroRapido(tipo);
        setPage(1);
        return;
    }

    setFechaInicio(inicio.format("YYYY-MM-DD"));
    setFechaFin(fin.format("YYYY-MM-DD"));
    setFiltroRapido(tipo);
    setPage(1);
  };

  const handleResetFilters = () => {
    setEmpresaActiva("all");
    setFechaInicio(today);
    setFechaFin(today);
    setFiltroEmpleado("");
    setFiltroDepartamento([]);
    setFiltroTipoRegistro("");
    setFiltroEstadoAsistencia("");
    setPage(1);
    setSoloPresentes(false);
    setSoloAusentes(false);
    setHorasExtra(false);
    setSinGoceDeSueldo(false);
    setDiasFestivos(false);
    setRequiereAutorizacion(false);
    setMostrarCamposExtras(false);
    setFiltroRapido("hoy");
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

  // Mobile view: full-height layout overriding panel padding
  if (isMobile) {
    const registros = data?.registros || [];
    return (
      <>
        {modoFormulario && (
          <FormularioAsistenciasMasivas
            values={values}
            setModoFormulario={setModoFormulario}
            mutate={mutate}
            idEmpresa={idEmpresa}
          />
        )}
        <div className="-m-5 h-[calc(100dvh-3.5rem)] overflow-hidden">
          <MobileAsistenciaView
            registros={registros}
            data={data}
            mutate={mutate}
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            setFechaInicio={setFechaInicio}
            setFechaFin={setFechaFin}
            filtroEmpleado={filtroEmpleado}
            setFiltroEmpleado={(v) => {
              setFiltroEmpleado(v);
              setPage(1);
            }}
            filtroEstadoAsistencia={filtroEstadoAsistencia}
            setFiltroEstadoAsistencia={setFiltroEstadoAsistencia}
            filtroDepartamento={filtroDepartamento}
            setFiltroDepartamento={setFiltroDepartamento}
            soloPresentes={soloPresentes}
            setSoloPresentes={setSoloPresentes}
            page={page}
            setPage={setPage}
            limit={limit}
            setLimit={setLimit}
            empresaActiva={empresaActiva}
            departamentos={departamentos}
            abrirFormulario={abrirFormulario}
            isLoading={!data}
            onResetFilters={handleResetFilters}
            filtroRapido={filtroRapido}
            setFiltroRapido={setFiltroRapido}
          />
        </div>
      </>
    );
  }

  // Desktop view
  return (
    <div className="space-y-6">
      {/* Header */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Empleado
            </label>
            <Input
              type="text"
              placeholder="Buscar empleado..."
              value={filtroEmpleado}
              onChange={(e) => {
                setFiltroEmpleado(e.target.value);
                setPage(1);
              }}
            />
          </div>
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
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["hoy", "Hoy"],
            ["semana", "Esta semana"],
            ["quinceDias", "15 días"],
            ["ultimoMes", "Último mes"],
            ["semestre", "Semestre"],
            ["anio", "Año"],
            ["todo", "Todo"],
          ].map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={filtroRapido === key ? "default" : "outline"}
              onClick={() => aplicarFiltroRapido(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="pt-3 mt-3 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
            <Checkbox
              checked={mostrarCamposExtras}
              onCheckedChange={(value) =>
                setMostrarCamposExtras(Boolean(value))
              }
            />
            <span className="text-sm text-gray-700">
              Mostrar todos los campos
            </span>
          </label>
        </div>
      </div>
      {ui}

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
