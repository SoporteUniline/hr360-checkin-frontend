"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import usePanelEmpleadoData from "@/hooks/usePanelEmpleadoData";
import usePanelEmpleadoDetalle from "@/hooks/usePanelEmpleadoDetalle";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ErrorPage from "@/components/ErrorPage";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import {
  Users,
  FileText,
  Calendar,
  Clock,
  Briefcase,
  Plane,
  Search,
  Loader2,
  Menu,
  FolderOpen,
  UserCircle2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import PanelEmpleadoGeneral from "./components/PanelEmpleadoGeneral";
import PanelEmpleadoPermisos from "./components/PanelEmpleadoPermisos";
import PanelEmpleadoAsistencias from "./components/PanelEmpleadoAsistencias";
import PanelEmpleadoEntradasSalidas from "./components/PanelEmpleadoEntradasSalidas";
import PanelEmpleadoContratos from "./components/PanelEmpleadoContratos";
import PanelEmpleadoVacaciones from "./components/PanelEmpleadoVacaciones";
import PanelEmpleadoDocumentos from "./components/PanelEmpleadoDocumentos";
import useSWR from "swr";
import dayjs from "dayjs";
import { fetcherWithToken } from "@/lib/fetcher";
import { Combobox } from "@/components/Combobox";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";

// Estilo homologado de los triggers de tabs (Adamia): texto gris → azul activo,
// subrayado azul de 2px solo en el tab activo, sin fondos ni sombras.
const TAB_TRIGGER_CLASS =
  "rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2.5 text-[12.5px] font-semibold text-gray-500 shadow-none data-[state=active]:border-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:text-[#2563eb] data-[state=active]:shadow-none";

/**
 * Página principal del Panel de Empleados
 * Muestra un sidebar con lista de empleados y un panel principal con información detallada
 * Relacionado con:
 * - Backend: modules/attendance/controllers/empleadoController.js (cargarTodosDatosCompletos)
 * - Hook: src/hooks/usePanelEmpleadoData.js
 */
export default function PanelEmpleadoPage() {
  const { dataUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unidadActiva, setUnidadActiva] = useState("");
  const { options: unidadOptions, byId: unidadById } = useUnidadesNegocio();
  const unidadSeleccionada = unidadById?.[String(unidadActiva)] || null;
  const idEmpresa = unidadSeleccionada?.id_empresa || "all";
  const sucursalFiltro = unidadSeleccionada?.label || "";

  useEffect(() => {
    if (dataUser?.empresas?.length > 0 && !unidadActiva) {
      setUnidadActiva("all");
    }
  }, [dataUser, unidadActiva]);

  useEffect(() => {
    if (unidadActiva) {
      setBusqueda("");
      setEmpleadoSeleccionado(null);
    }
  }, [unidadActiva]);

  const unidadesOptions = [
    { value: "all", label: "Todas las unidades de negocio" },
    ...unidadOptions,
  ];

  const { data, error, isLoading } = usePanelEmpleadoData(
    idEmpresa,
    dataUser?.empresas || [],
    sucursalFiltro,
  );

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

  /**
   * Festivos (empresa) para cálculo consistente de días hábiles en Permisos del Panel de Empleados.
   * Relación:
   * - Se pasa a `PanelEmpleadoPermisos` (misma regla que módulo Permisos y PDF).
   * - Endpoint compartido: `/checador/holidays/:id_empresa` (ver módulo Permisos).
   */
  const { data: festivosResp } = useSWR(
    idEmpresa
      ? `/checador/holidays/${idEmpresa}?page=1&limit=5000&filter=`
      : null,
    fetcherWithToken,
  );
  const festivosSet = useMemo(() => {
    const list = festivosResp?.festivos || [];
    const set = new Set();
    list.forEach((f) => {
      if (f?.fecha) {
        try {
          set.add(dayjs(f.fecha).format("YYYY-MM-DD"));
        } catch {}
      }
    });
    return set;
  }, [festivosResp]);

  const [busqueda, setBusqueda] = useState("");
  const [tabActivo, setTabActivo] = useState("general");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const empleados = data?.lista_empleados || [];

  // Filtrar empleados por búsqueda
  const empleadosFiltrados = empleados.filter((emp) => {
    const termino = busqueda.toLowerCase();
    return (
      emp.nombre_completo?.toLowerCase().includes(termino) ||
      emp.puesto?.toLowerCase().includes(termino) ||
      emp.departamento?.toLowerCase().includes(termino) ||
      emp.unidad_negocio?.toLowerCase().includes(termino) ||
      emp.empresa?.toLowerCase().includes(termino)
    );
  });

  // Selección con sincronización en URL (?emp=<id>) sin scroll
  const seleccionarEmpleado = (id) => {
    setEmpleadoSeleccionado(id);
    router.replace(`/panel/panel-empleado?emp=${id}`, { scroll: false });
  };

  // Al cargar los datos: si ?emp= es válido se selecciona; si no, el primero
  // (actualizando la URL vía replace en ambos casos).
  useEffect(() => {
    if (empleados.length > 0 && !empleadoSeleccionado) {
      const empParam = searchParams.get("emp");
      const desdeUrl = empParam
        ? empleados.find((e) => String(e.id_empleado) === String(empParam))
        : null;
      const idInicial = desdeUrl
        ? desdeUrl.id_empleado
        : empleados[0].id_empleado;
      setEmpleadoSeleccionado(idInicial);
      router.replace(`/panel/panel-empleado?emp=${idInicial}`, {
        scroll: false,
      });
    }
  }, [empleados, empleadoSeleccionado, searchParams, router]);

  // Cargar detalle del empleado seleccionado bajo demanda
  const { datosEmpleado, isLoading: isLoadingDetalle } =
    usePanelEmpleadoDetalle(empleadoSeleccionado);

  // Empleado seleccionado dentro de la lista ligera (para el estado del header)
  const empleadoActual = empleados.find(
    (e) => e.id_empleado === empleadoSeleccionado,
  );

  // Función para obtener iniciales
  const obtenerIniciales = (nombreCompleto) => {
    if (!nombreCompleto) return "??";
    const partes = nombreCompleto.split(" ");
    if (partes.length >= 2) {
      return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
    }
    return nombreCompleto.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando empleados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorPage message={error?.message || "Error al cargar los datos"} />
    );
  }

  const estadoEmpleado = empleadoActual?.estado || "";
  const estadoEsActivo = estadoEmpleado.toLowerCase() === "activo";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-[#f9fafb]">
      {/* Encabezado estándar Adamia; el hamburger móvil vive en `acciones` */}
      <div className="px-3 pt-3 sm:px-4 sm:pt-4 lg:px-6">
        <EncabezadoPagina
          icono={UserCircle2}
          titulo="Panel de empleado"
          subtitulo="Expediente 360° por persona"
          acciones={
            <Sheet
              modal={false}
              open={sidebarOpen}
              onOpenChange={setSidebarOpen}
            >
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-[280px] flex-col p-0 sm:w-[320px]"
              >
                <VisuallyHidden>
                  <SheetHeader>
                    <SheetTitle>Lista de empleados</SheetTitle>
                  </SheetHeader>
                </VisuallyHidden>

                <SidebarContent
                  empleados={empleados}
                  empleadosFiltrados={empleadosFiltrados}
                  empleadoSeleccionado={empleadoSeleccionado}
                  busqueda={busqueda}
                  setBusqueda={setBusqueda}
                  unidadOptions={unidadesOptions}
                  unidadActiva={unidadActiva}
                  setUnidadActiva={setUnidadActiva}
                  obtenerIniciales={obtenerIniciales}
                  onSelectEmpleado={(id) => {
                    seleccionarEmpleado(id);
                    setTabActivo("general");
                  }}
                  closeSidebar={() => setSidebarOpen(false)}
                />
              </SheetContent>
            </Sheet>
          }
        />
      </div>

      {/* Layout principal */}
      <div className="mt-3 flex flex-1 overflow-hidden sm:mt-4">
        {/* Directorio desktop - oculto en móvil */}
        <aside className="hidden w-64 flex-col border-r border-t border-gray-200 bg-white lg:flex">
          <SidebarContent
            empleados={empleados}
            empleadosFiltrados={empleadosFiltrados}
            empleadoSeleccionado={empleadoSeleccionado}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            unidadOptions={unidadesOptions}
            unidadActiva={unidadActiva}
            setUnidadActiva={setUnidadActiva}
            obtenerIniciales={obtenerIniciales}
            onSelectEmpleado={(id) => {
              seleccionarEmpleado(id);
              setTabActivo("general");
            }}
          />
        </aside>

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 lg:pt-4">
          {isLoadingDetalle ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Cargando información...
                </p>
              </div>
            </div>
          ) : !datosEmpleado ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Users className="mb-3 h-10 w-10 text-gray-300" />
              <h3 className="mb-1 text-sm font-bold text-gray-900">
                Selecciona un empleado
              </h3>
              <p className="text-sm text-gray-500">
                Elige un empleado del directorio para ver su expediente completo
              </p>
            </div>
          ) : (
            <>
              {/* Header del empleado */}
              <div className="mb-4 rounded-[10px] border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {/* Avatar */}
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-lg font-bold text-white">
                      {obtenerIniciales(
                        datosEmpleado.informacion_general?.nombre_completo,
                      )}
                    </div>
                    {/* Nombre y meta */}
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-extrabold tracking-tight text-gray-900">
                        {datosEmpleado.informacion_general?.nombre_completo}
                      </h2>
                      <p className="truncate text-[12.5px] text-gray-500">
                        {datosEmpleado.informacion_general?.puesto ||
                          "Sin asignar"}{" "}
                        ·{" "}
                        {datosEmpleado.informacion_general?.empresa ||
                          "Sin empresa"}
                      </p>
                    </div>
                  </div>
                  {/* Quick facts */}
                  <div className="flex flex-shrink-0 items-center gap-5 sm:gap-6">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Núm
                      </div>
                      <div className="text-[12.5px] font-semibold text-gray-900">
                        EMP-
                        {String(
                          datosEmpleado.informacion_general?.id_empleado || 0,
                        ).padStart(3, "0")}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Ingreso
                      </div>
                      <div className="text-[12.5px] font-semibold text-gray-900">
                        {formatearFecha(
                          datosEmpleado.informacion_general?.fecha_ingreso,
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Estado
                      </div>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                          estadoEsActivo
                            ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      >
                        {estadoEmpleado || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="rounded-[10px] border border-gray-200 bg-white">
                <Tabs value={tabActivo} onValueChange={setTabActivo}>
                  <div className="overflow-x-auto rounded-t-[10px] border-b border-gray-200 bg-white">
                    <TabsList className="h-auto min-w-max rounded-none bg-transparent p-0">
                      <TabsTrigger
                        value="general"
                        className={TAB_TRIGGER_CLASS}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                        General
                      </TabsTrigger>
                      <TabsTrigger
                        value="permisos"
                        className={TAB_TRIGGER_CLASS}
                      >
                        <Calendar className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                        Permisos
                      </TabsTrigger>
                      <TabsTrigger
                        value="asistencias"
                        className={TAB_TRIGGER_CLASS}
                      >
                        <Calendar className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                        Asistencias
                      </TabsTrigger>
                      <TabsTrigger
                        value="entradas"
                        className={TAB_TRIGGER_CLASS}
                      >
                        <Clock className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                        Entradas/Salidas
                      </TabsTrigger>
                      <TabsTrigger
                        value="contratos"
                        className={TAB_TRIGGER_CLASS}
                      >
                        <Briefcase className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                        Contratos
                      </TabsTrigger>
                      <TabsTrigger
                        value="vacaciones"
                        className={TAB_TRIGGER_CLASS}
                      >
                        <Plane className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                        Vacaciones
                      </TabsTrigger>
                      <TabsTrigger
                        value="documentos"
                        className={TAB_TRIGGER_CLASS}
                      >
                        <FolderOpen className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                        Documentos
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-3 sm:p-4 lg:p-5">
                    <TabsContent value="general" className="mt-0">
                      <PanelEmpleadoGeneral datosEmpleado={datosEmpleado} />
                    </TabsContent>
                    <TabsContent value="permisos" className="mt-0">
                      <PanelEmpleadoPermisos
                        datosEmpleado={datosEmpleado}
                        festivosSet={festivosSet}
                      />
                    </TabsContent>
                    <TabsContent value="asistencias" className="mt-0">
                      <PanelEmpleadoAsistencias datosEmpleado={datosEmpleado} />
                    </TabsContent>
                    <TabsContent value="entradas" className="mt-0">
                      <PanelEmpleadoEntradasSalidas
                        datosEmpleado={datosEmpleado}
                      />
                    </TabsContent>
                    <TabsContent value="contratos" className="mt-0">
                      <PanelEmpleadoContratos datosEmpleado={datosEmpleado} />
                    </TabsContent>
                    <TabsContent value="vacaciones" className="mt-0">
                      <PanelEmpleadoVacaciones datosEmpleado={datosEmpleado} />
                    </TabsContent>
                    <TabsContent value="documentos" className="mt-0">
                      <PanelEmpleadoDocumentos datosEmpleado={datosEmpleado} />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Función auxiliar para formatear fechas
 * Relacionado con: src/app/panel/panel-empleado/page.jsx
 */
function formatearFecha(fechaISO) {
  if (!fechaISO || fechaISO === "N/A") return "N/A";

  try {
    const fecha = new Date(fechaISO + "T00:00:00");
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  } catch (e) {
    return fechaISO;
  }
}

// Componente del directorio (reutilizable en desktop y Sheet móvil)
const SidebarContent = ({
  empleados,
  empleadosFiltrados,
  empleadoSeleccionado,
  busqueda,
  setBusqueda,
  unidadOptions,
  unidadActiva,
  setUnidadActiva,
  obtenerIniciales,
  onSelectEmpleado,
  closeSidebar,
}) => (
  <>
    {/* Header */}
    <div className="border-b border-gray-200 bg-white px-3 py-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
          Directorio
        </span>
        <span className="text-[11px] text-gray-400">{empleados.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="[&_button]:h-8 [&_button]:rounded-md [&_button]:text-[12.5px] [&_button]:font-normal">
          <Combobox
            options={unidadOptions}
            value={unidadActiva}
            onChange={(val) => setUnidadActiva(val)}
            placeholder="Seleccionar unidad"
          />
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar empleado..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-8 rounded-md pl-8 text-[12.5px]"
          />
        </div>
      </div>
    </div>

    {/* Lista */}
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="p-2">
        {empleadosFiltrados.map((emp) => {
          const activo = empleadoSeleccionado === emp.id_empleado;

          return (
            <div
              key={emp.id_empleado}
              onClick={() => {
                onSelectEmpleado(emp.id_empleado);
                closeSidebar?.();
              }}
              className={`relative mb-0.5 cursor-pointer rounded-lg px-2.5 py-2 ${
                activo ? "bg-[#f0f5ff]" : "hover:bg-gray-50"
              }`}
            >
              {activo && (
                <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-gradient-to-b from-[#2563eb] to-[#7c3aed]" />
              )}
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    activo
                      ? "bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {obtenerIniciales(emp.nombre_completo)}
                </div>
                <div className="min-w-0">
                  <div
                    className={`truncate text-[12.5px] font-semibold ${
                      activo ? "text-[#1d4ed8]" : "text-gray-800"
                    }`}
                  >
                    {emp.nombre_completo}
                  </div>
                  <div className="truncate text-[10.5px] text-gray-400">
                    {emp.puesto || "Sin asignar"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  </>
);
