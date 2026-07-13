"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import EmpleadosDataContainer from "./EmpleadosDataContainer";
import FormularioEmpleado from "./FormularioEmpleado";
import MobileEmpleadosView from "./MobileEmpleadosView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  UsersRound,
  UserPlus,
  Building2,
  Search,
  RotateCcw,
} from "lucide-react";
import ModalCapacidadAgotada from "@/components/ModalCapacidadAgotada";
import AccesosRapidos from "@/components/AccesosRapidos";
import axios from "@/lib/axios";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { FiltrosGrid, CampoFiltro } from "@/components/filtros/CampoFiltro";
import StatCard from "@/components/StatCard";
import ColumnasSelector, {
  cargarColumnasGuardadas,
} from "@/components/tabla/ColumnasSelector";
import VistasGuardadas from "@/components/tabla/VistasGuardadas";
import { COLUMNAS_EMPLEADOS } from "./EmpleadosTable";

const LS_COLUMNAS_EMPLEADOS = "empleados-columnas-visibles";

export default function RegistroEmpleados() {
  const isMobile = useIsMobile();
  const [modalCapacidadAbierto, setModalCapacidadAbierto] = useState(false);
  const [mensajeCapacidad, setMensajeCapacidad] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [modoFormulario, setModoFormulario] = useState(false);
  const [editar, setEditar] = useState(false);
  const [soloLectura, setSoloLectura] = useState(false);
  const [values, setValues] = useState(null);

  const searchParams = useSearchParams();
  const [filtroNombre, setFiltroNombre] = useState(
    searchParams.get("buscar") || "",
  );
  const debouncedFiltroNombre = useDebounce(filtroNombre, 450);

  // Columnas visibles de la tabla y señal de limpieza para los filtros de
  // encabezado (viven dentro de EmpleadosTable).
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [limpiarFiltrosToken, setLimpiarFiltrosToken] = useState(0);

  // Las columnas guardadas se cargan en cliente (localStorage no existe en SSR)
  useEffect(() => {
    setVisibleColumns(
      cargarColumnasGuardadas(COLUMNAS_EMPLEADOS, LS_COLUMNAS_EMPLEADOS),
    );
  }, []);

  useEffect(() => {
    setLimit(isMobile ? 500 : 10);
  }, [isMobile]);

  const { dataUser } = useAuth();
  const [empresaActiva, setEmpresaActiva] = useState("all");

  useEffect(() => {
    if (dataUser?.empresas_detalle?.length === 1) {
      setEmpresaActiva(String(dataUser.empresas_detalle[0].id_empresa));
    }
  }, [dataUser]);

  // Abrir empleado directo si viene ?id= desde la búsqueda global
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (!idParam) return;
    abrirFormulario({ id_empleado: idParam }, false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const empresaId =
    empresaActiva && empresaActiva !== "all" ? empresaActiva : null;
  const { data: capacidadData } = useSWR(
    empresaId
      ? `/checador/empleados-capacidad/check-capacidad?empresa_id=${empresaId}`
      : null, // null = no fetches
    fetcherWithToken,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const limiteEmpleados = capacidadData?.limite ?? null;

  const idEmpresa = empresaActiva;

  // console.log(dataUser);

  const abrirFormulario = async (
    empleado = null,
    modoEditar = false,
    lectura = false,
  ) => {
    if (!empleado) {
      if (!idEmpresa || idEmpresa === "all") {
        setMensajeCapacidad(
          "Debes seleccionar una empresa específica antes de crear un empleado.",
        );
        setModalCapacidadAbierto(true);
        return;
      }
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados-capacidad/check-capacidad?empresa_id=${idEmpresa}`,
        );

        // console.log(data);

        if (!data.permitido) {
          setMensajeCapacidad(data.message);
          setModalCapacidadAbierto(true);
          return;
        }
      } catch (error) {
        console.error("Error al validar capacidad:", error);
      }
    }

    if (empleado) {
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/${empleado.id_empleado}`,
        );
        empleado = data;
      } catch (error) {
        console.error("Error al obtener empleado:", error);
        return;
      }
    }

    console.log(empleado);

    setValues(empleado);
    setEditar(modoEditar);
    setModoFormulario(true);
    setSoloLectura(lectura);
  };

  const resetFilters = () => {
    setEmpresaActiva("all");
    setPage(1);
  };

  const esMultiEmpresa = dataUser?.empresas_detalle?.length > 1;

  // Limpiar del toolbar: búsqueda + empresa + filtros de encabezado (vía token).
  const limpiarFiltros = () => {
    setFiltroNombre("");
    if (esMultiEmpresa) setEmpresaActiva("all");
    setPage(1);
    setLimpiarFiltrosToken((t) => t + 1);
  };

  // ——— Vistas guardadas: solo el estado visible desde esta página ———
  // (los filtros de encabezado viven en EmpleadosTable y no son liftables
  // con las props/callbacks existentes, por lo que no se serializan).
  const hayFiltrosParaVista = Boolean(
    filtroNombre || (esMultiEmpresa && empresaActiva !== "all"),
  );

  const obtenerEstadoVista = () => ({
    filtroNombre,
    empresaActiva,
    visibleColumns,
  });

  const aplicarEstadoVista = (v) => {
    if (!v) return;
    setFiltroNombre(v.filtroNombre || "");
    if (esMultiEmpresa) setEmpresaActiva(v.empresaActiva || "all");
    if (Array.isArray(v.visibleColumns) && v.visibleColumns.length >= 2) {
      setVisibleColumns(v.visibleColumns);
      try {
        window.localStorage.setItem(
          LS_COLUMNAS_EMPLEADOS,
          JSON.stringify(v.visibleColumns),
        );
      } catch {
        // sin persistencia
      }
    }
    setPage(1);
  };

  const { ui, data, mutate } = EmpleadosDataContainer({
    idEmpresa,
    page,
    limit,
    filtroNombre: debouncedFiltroNombre,
    departamento: "",
    estado: "",
    fechaDesde: "",
    setPage,
    abrirFormulario,
    resetFilters,
    visibleColumns,
    limpiarFiltrosToken,
  });

  if (isMobile && modoFormulario) {
    return (
      <>
        <div className="-m-5 min-h-[calc(100dvh-3.5rem)]">
          <FormularioEmpleado
            key={`formulario-${values?.id_empleado || "nuevo"}`}
            editar={editar}
            values={values}
            page={page}
            limit={limit}
            setModoFormulario={setModoFormulario}
            modoFormulario={modoFormulario}
            soloLectura={soloLectura}
            setEditar={setEditar}
            setSoloLectura={setSoloLectura}
            mutate={mutate}
          />
        </div>
        <ModalCapacidadAgotada
          open={modalCapacidadAbierto}
          onClose={() => setModalCapacidadAbierto(false)}
          mensaje={mensajeCapacidad}
        />
      </>
    );
  }

  if (isMobile) {
    return (
      <>
        <div className="-m-5 h-[calc(100dvh-3.5rem)] overflow-hidden">
          {/* <MobileEmpleadosView
            empleados={data?.data || []}
            abrirFormulario={abrirFormulario}
            isLoading={false}
          /> */}
          <MobileEmpleadosView
            empleados={data?.data || []}
            abrirFormulario={abrirFormulario}
            isLoading={!data}
          />
        </div>
        <ModalCapacidadAgotada
          open={modalCapacidadAbierto}
          onClose={() => setModalCapacidadAbierto(false)}
          mensaje={mensajeCapacidad}
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#F9FAFB] p-6">
        {modoFormulario ? (
          <FormularioEmpleado
            key={`formulario-${values?.id_empleado || "nuevo"}`}
            editar={editar}
            values={values}
            page={page}
            limit={limit}
            setModoFormulario={setModoFormulario}
            modoFormulario={modoFormulario}
            soloLectura={soloLectura}
            setEditar={setEditar}
            setSoloLectura={setSoloLectura}
            mutate={mutate}
          />
        ) : (
          <>
            <div className="mb-6">
              <EncabezadoPagina
                icono={Users}
                titulo="Empleados"
                subtitulo="Plantilla, altas y expedientes"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total empleados"
                value={data?.estadisticas?.total_empleados || 0}
                icon={Users}
              />
              <StatCard
                title="Activos"
                value={data?.estadisticas?.empleados_activos || 0}
                sub={
                  limiteEmpleados != null
                    ? `/ ${limiteEmpleados} · ${
                        limiteEmpleados -
                        (data?.estadisticas?.empleados_activos || 0)
                      } lugar${
                        limiteEmpleados -
                          (data?.estadisticas?.empleados_activos || 0) ===
                        1
                          ? ""
                          : "es"
                      } disponible${
                        limiteEmpleados -
                          (data?.estadisticas?.empleados_activos || 0) ===
                        1
                          ? ""
                          : "s"
                      }`
                    : undefined
                }
                icon={UsersRound}
              />
              <StatCard
                title="Nuevos este mes"
                value={data?.estadisticas?.empleados_nuevos_mes || 0}
                icon={UserPlus}
              />
              <StatCard
                title="Departamentos"
                value={data?.estadisticas?.total_departamentos || 0}
                icon={Building2}
                accent="violet"
              />
            </div>

            {/* Toolbar homologada: búsqueda, unidad, columnas y limpiar */}
            <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <FiltrosGrid columnas={5}>
                <CampoFiltro etiqueta="Buscar">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Nombre del empleado..."
                      className="h-[38px] rounded-md border-gray-200 pl-9 text-[13px]"
                      value={filtroNombre}
                      onChange={(e) => {
                        setFiltroNombre(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </CampoFiltro>

                {esMultiEmpresa && (
                  <CampoFiltro etiqueta="Unidad de negocio">
                    <Select
                      value={empresaActiva}
                      onValueChange={setEmpresaActiva}
                    >
                      <SelectTrigger className="h-[38px] w-full rounded-md border-gray-200 text-[13px] font-medium">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">Todas las empresas</SelectItem>

                        {dataUser.empresas_detalle.map((empresa) => (
                          <SelectItem
                            key={String(empresa.id_empresa)}
                            value={String(empresa.id_empresa)}
                          >
                            {empresa.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CampoFiltro>
                )}

                <CampoFiltro etiqueta="Columnas">
                  <div className="[&_button]:h-[38px] [&_button]:w-full [&_button]:rounded-md [&_button]:border-gray-200 [&_button]:text-[13px] [&_button]:font-medium">
                    {Array.isArray(visibleColumns) ? (
                      <ColumnasSelector
                        columnas={COLUMNAS_EMPLEADOS}
                        visibles={visibleColumns}
                        onChange={setVisibleColumns}
                        storageKey={LS_COLUMNAS_EMPLEADOS}
                      />
                    ) : null}
                  </div>
                </CampoFiltro>

                <CampoFiltro>
                  <Button
                    variant="outline"
                    onClick={limpiarFiltros}
                    className="h-[38px] w-full rounded-md border-gray-200 text-[13px] font-semibold text-gray-700"
                  >
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Limpiar
                  </Button>
                </CampoFiltro>
              </FiltrosGrid>

              <div className="mt-3">
                <VistasGuardadas
                  hayFiltros={hayFiltrosParaVista}
                  obtenerEstado={obtenerEstadoVista}
                  onAplicar={aplicarEstadoVista}
                  onLimpiar={limpiarFiltros}
                  storageKey="empleados-vistas"
                />
              </div>
            </div>
            {ui}

            {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
            <AccesosRapidos />
          </>
        )}
      </div>
      <ModalCapacidadAgotada
        open={modalCapacidadAbierto}
        onClose={() => setModalCapacidadAbierto(false)}
        mensaje={mensajeCapacidad}
      />
    </>
  );
}
