"use client";

import { useEffect, useRef, useState } from "react";
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
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Upload,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ImportarEmpleadosDialog from "./ImportarEmpleadosDialog";

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
  const [sincronizandoEmpleados, setSincronizandoEmpleados] = useState(false);
  const [modalImportacionAbierto, setModalImportacionAbierto] = useState(false);
  const [modalSincronizacionAbierto, setModalSincronizacionAbierto] =
    useState(false);
  const [modalResultadoAbierto, setModalResultadoAbierto] = useState(false);
  const [resultadoSincronizacion, setResultadoSincronizacion] = useState(null);
  const [errorSincronizacion, setErrorSincronizacion] = useState("");
  const [refreshSincronizacionToken, setRefreshSincronizacionToken] =
    useState(0);
  const searchParams = useSearchParams();
  const [filtroNombre, setFiltroNombre] = useState(
    searchParams.get("buscar") || "",
  );
  const debouncedFiltroNombre = useDebounce(filtroNombre, 450);

  const refreshSincronizacionIntervalRef = useRef(null);

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

  useEffect(() => {
    return () => {
      if (refreshSincronizacionIntervalRef.current) {
        clearInterval(refreshSincronizacionIntervalRef.current);
      }
    };
  }, []);

  // Abrir empleado directo si viene ?id= desde la búsqueda global
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (!idParam) return;
    // modo=editar abre en edición; por defecto, solo lectura.
    const editarParam = searchParams.get("modo") === "editar";
    abrirFormulario({ id_empleado: idParam }, editarParam, !editarParam);
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

  const abrirModalSincronizacion = () => {
    if (!idEmpresa || idEmpresa === "all") {
      setErrorSincronizacion(
        "Selecciona una empresa específica antes de sincronizar los empleados.",
      );
      setResultadoSincronizacion(null);
      setModalResultadoAbierto(true);
      return;
    }

    setModalSincronizacionAbierto(true);
  };

  const sincronizarEmpleadosConReloj = async () => {
    try {
      setSincronizandoEmpleados(true);
      setErrorSincronizacion("");
      setResultadoSincronizacion(null);

      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/sincronizar-empresa/${idEmpresa}`,
      );

      const resultado = data?.resultado;

      if (!data?.ok || !resultado) {
        throw new Error(
          data?.mensaje || "No se pudo iniciar la sincronización.",
        );
      }

      setResultadoSincronizacion(resultado);
      setModalSincronizacionAbierto(false);
      setModalResultadoAbierto(true);
      iniciarRefrescoSincronizacion();
    } catch (error) {
      console.error("Error al sincronizar empleados con el reloj:", error);

      const mensaje =
        error?.response?.data?.error ||
        error?.response?.data?.mensaje ||
        error?.message ||
        "No se pudo sincronizar a los empleados.";

      setErrorSincronizacion(mensaje);
      setModalSincronizacionAbierto(false);
      setModalResultadoAbierto(true);
    } finally {
      setSincronizandoEmpleados(false);
    }
  };
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

  const iniciarRefrescoSincronizacion = () => {
    const refrescar = () => {
      mutate();
      setRefreshSincronizacionToken((token) => token + 1);
    };

    refrescar();

    if (refreshSincronizacionIntervalRef.current) {
      clearInterval(refreshSincronizacionIntervalRef.current);
    }

    let refrescosRealizados = 0;
    const maxRefrescos = 12;

    refreshSincronizacionIntervalRef.current = setInterval(() => {
      refrescar();

      refrescosRealizados += 1;

      if (refrescosRealizados >= maxRefrescos) {
        clearInterval(refreshSincronizacionIntervalRef.current);
        refreshSincronizacionIntervalRef.current = null;
      }
    }, 5000);
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
    refreshSincronizacionToken,
    onEmployeeChanged: iniciarRefrescoSincronizacion,
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

            <div className="mb-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalImportacionAbierto(true)}
                disabled={!idEmpresa || idEmpresa === "all"}
                title={
                  idEmpresa === "all"
                    ? "Selecciona una empresa específica para importar empleados"
                    : "Importar empleados desde Excel"
                }
                className="h-9.5 rounded-md border-emerald-200 bg-white px-4 text-[13px] font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar empleados
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={abrirModalSincronizacion}
                disabled={
                  sincronizandoEmpleados || !idEmpresa || idEmpresa === "all"
                }
                title={
                  idEmpresa === "all"
                    ? "Selecciona una empresa específica para sincronizar"
                    : "Sincronizar empleados activos con los relojes checadores"
                }
                className="h-9.5 rounded-md border-indigo-200 bg-white px-4 text-[13px] font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    sincronizandoEmpleados ? "animate-spin" : ""
                  }`}
                />

                {sincronizandoEmpleados
                  ? "Sincronizando..."
                  : "Sincronizar con reloj"}
              </Button>
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
      <Dialog
        open={modalSincronizacionAbierto}
        onOpenChange={(open) => {
          if (!sincronizandoEmpleados) {
            setModalSincronizacionAbierto(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50">
              <RefreshCw className="h-5 w-5 text-indigo-600" />
            </div>

            <DialogTitle>Sincronizar empleados con el reloj</DialogTitle>

            <DialogDescription className="text-left">
              Se enviarán los empleados activos con NIP a los relojes checadores
              activos de la empresa seleccionada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Se crearán los usuarios que todavía no existan.</span>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Se actualizarán los nombres de los usuarios existentes.
              </span>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Se conservarán las huellas, rostros, tarjetas y contraseñas.
              </span>
            </div>

            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>No se eliminarán usuarios existentes del dispositivo.</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalSincronizacionAbierto(false)}
              disabled={sincronizandoEmpleados}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={sincronizarEmpleadosConReloj}
              disabled={sincronizandoEmpleados}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  sincronizandoEmpleados ? "animate-spin" : ""
                }`}
              />

              {sincronizandoEmpleados
                ? "Sincronizando..."
                : "Sincronizar empleados"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalResultadoAbierto}
        onOpenChange={setModalResultadoAbierto}
      >
        <DialogContent className="sm:max-w-[500px]">
          {errorSincronizacion ? (
            <>
              <DialogHeader>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>

                <DialogTitle>No se pudo sincronizar</DialogTitle>

                <DialogDescription className="text-left">
                  {errorSincronizacion}
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => setModalResultadoAbierto(false)}
                >
                  Entendido
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>

                <DialogTitle>Sincronización solicitada</DialogTitle>

                <DialogDescription className="text-left">
                  Los comandos fueron enviados a la cola y el reloj comenzará a
                  procesarlos gradualmente.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Encontrados</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {resultadoSincronizacion?.empleadosEncontrados ?? 0}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Procesados</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {resultadoSincronizacion?.empleadosProcesados ?? 0}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Comandos creados</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {resultadoSincronizacion?.comandosCreados ?? 0}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Sin NIP</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {resultadoSincronizacion?.empleadosSinNip ?? 0}
                  </p>
                </div>
              </div>

              {(resultadoSincronizacion?.comandosOmitidos > 0 ||
                resultadoSincronizacion?.errores?.length > 0) && (
                <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
                  {resultadoSincronizacion?.comandosOmitidos > 0 && (
                    <p>
                      Comandos omitidos:{" "}
                      <strong>
                        {resultadoSincronizacion.comandosOmitidos}
                      </strong>
                    </p>
                  )}

                  {resultadoSincronizacion?.errores?.length > 0 && (
                    <p>
                      Errores registrados:{" "}
                      <strong>{resultadoSincronizacion.errores.length}</strong>
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  El proceso continuará en segundo plano mientras el reloj
                  permanezca conectado.
                </span>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => setModalResultadoAbierto(false)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Listo
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ImportarEmpleadosDialog
        open={modalImportacionAbierto}
        onOpenChange={setModalImportacionAbierto}
        idEmpresa={idEmpresa}
        onImported={async () => {
          await mutate();
          setRefreshSincronizacionToken((token) => token + 1);
        }}
      />
    </>
  );
}
