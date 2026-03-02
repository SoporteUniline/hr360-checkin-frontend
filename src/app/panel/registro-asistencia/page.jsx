// src/app/panel/registro-asistencia/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AsistenciaFilters from "./AsistenciaFilters";
import AsistenciaDataContainer from "./AsistenciaDataContainer";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import AsistenciaCards from "./AsistenciaCards";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import FormularioAsistenciasMasivas from "@/components/FormularioAsistenciasMasivas";
import AccesosRapidos from "@/components/AccesosRapidos";
import { ClipboardCheck } from "lucide-react";

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
  const [departamentosUnicos, setDepartamentosUnicos] = useState([]);
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState("");
  const [tiposRegistroUnicos, setTiposRegistroUnicos] = useState([]);
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

  const { data: empleados } = useEmpleadosData(idEmpresa);
  const { data: tiposPermiso } = useTiposPermisoData();

  const empleadosOptions =
    empleados?.data?.map((emp) => ({
      value: emp.id_empleado,
      label: `${emp.nombre} ${emp.apellido_paterno ?? ""} ${
        emp.apellido_materno ?? ""
      }`,
    })) || [];

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

  useEffect(() => {
    if (empleados?.data) {
      const uniqueDepartamentos = [
        ...new Set(empleados.data.map((emp) => emp.departamento)),
      ];
      setDepartamentosUnicos(uniqueDepartamentos.filter(Boolean).sort());
    }
  }, [empleados]);

  useEffect(() => {
    console.log(tiposPermiso);
    if (tiposPermiso) {
      const uniqueTipos = tiposPermiso?.tiposPermiso.map((tipo) => ({
        clave: tipo.clave,
        nombre: tipo.nombre,
      }));
      console.log(uniqueTipos);
      const distinctTipos = Array.from(
        new Map(uniqueTipos.map((item) => [item.clave, item])).values(),
      );
      setTiposRegistroUnicos(
        distinctTipos.sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
    }
  }, [tiposPermiso]);

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
      <AsistenciaFilters
        empresaActiva={empresaActiva}
        setEmpresaActiva={setEmpresaActiva}
        empresas={dataUser?.empresas_detalle || []}
        empleadosOptions={empleadosOptions}
        filtroEmpleado={filtroEmpleado}
        setFiltroEmpleado={setFiltroEmpleado}
        fechaInicio={fechaInicio}
        setFechaInicio={setFechaInicio}
        fechaFin={fechaFin}
        setFechaFin={setFechaFin}
        setPage={setPage}
        filtroDepartamento={filtroDepartamento}
        setFiltroDepartamento={setFiltroDepartamento}
        departamentos={departamentosUnicos}
        filtroTipoRegistro={filtroTipoRegistro}
        setFiltroTipoRegistro={setFiltroTipoRegistro}
        tiposRegistro={tiposRegistroUnicos}
        filtroEstadoAsistencia={filtroEstadoAsistencia}
        setFiltroEstadoAsistencia={setFiltroEstadoAsistencia}
        onResetFilters={handleResetFilters}
        abrirFormulario={abrirFormulario}
        mostrarCamposExtras={mostrarCamposExtras}
        setMostrarCamposExtras={setMostrarCamposExtras}
        soloPresentes={soloPresentes}
        setSoloPresentes={setSoloPresentes}
        soloAusentes={soloAusentes}
        setSoloAusentes={setSoloAusentes}
        horasExtra={horasExtra}
        setHorasExtra={setHorasExtra}
        sinGoceDeSueldo={sinGoceDeSueldo}
        setSinGoceDeSueldo={setSinGoceDeSueldo}
        diasFestivos={diasFestivos}
        setDiasFestivos={setDiasFestivos}
        requiereAutorizacion={requiereAutorizacion}
        setRequiereAutorizacion={setRequiereAutorizacion}
      />
      {ui}

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
