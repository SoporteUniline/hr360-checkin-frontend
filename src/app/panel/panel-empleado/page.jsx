"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import usePanelEmpleadoData from "@/hooks/usePanelEmpleadoData";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";
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
  X,
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
import useSWR from "swr";
import dayjs from "dayjs";
import { fetcherWithToken } from "@/lib/fetcher";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

/**
 * Página principal del Panel de Empleados
 * Muestra un sidebar con lista de empleados y un panel principal con información detallada
 * Relacionado con:
 * - Backend: modules/attendance/controllers/empleadoController.js (cargarTodosDatosCompletos)
 * - Hook: src/hooks/usePanelEmpleadoData.js
 */
export default function PanelEmpleadoPage() {
  const { dataUser } = useAuth();
  console.log(dataUser);
  const [empresaActiva, setEmpresaActiva] = useState(null);
  const idEmpresa = empresaActiva;

  useEffect(() => {
    if (dataUser?.empresas?.length > 0 && !empresaActiva) {
      setEmpresaActiva("all");
    }
  }, [dataUser, empresaActiva]);

  useEffect(() => {
    if (empresaActiva) {
      setBusqueda("");
      setEmpleadoSeleccionado(null);
    }
  }, [empresaActiva]);

  const empresasOptions = [
    { value: "all", label: "Todas las empresas" },
    ...(dataUser?.empresas_detalle?.map((empresa) => ({
      value: empresa.id_empresa,
      label: empresa.nombre,
    })) || []),
  ];

  const { data, error, isLoading } = usePanelEmpleadoData(
    empresaActiva,
    dataUser?.empresas || [],
  );

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

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [tabActivo, setTabActivo] = useState("general");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const empleados = data?.lista_empleados || [];
  const datosCompletos = data?.datos_completos || {};

  // Filtrar empleados por búsqueda
  const empleadosFiltrados = empleados.filter((emp) => {
    const termino = busqueda.toLowerCase();
    return (
      emp.nombre_completo?.toLowerCase().includes(termino) ||
      emp.puesto?.toLowerCase().includes(termino) ||
      emp.departamento?.toLowerCase().includes(termino) ||
      emp.empresa?.toLowerCase().includes(termino)
    );
  });

  // Seleccionar el primer empleado al cargar los datos
  useEffect(() => {
    if (empleados.length > 0 && !empleadoSeleccionado) {
      setEmpleadoSeleccionado(empleados[0].id_empleado);
    }
  }, [empleados, empleadoSeleccionado]);

  // Obtener datos del empleado seleccionado
  const datosEmpleado = empleadoSeleccionado
    ? datosCompletos[empleadoSeleccionado]
    : null;

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

  // Componente del sidebar (reutilizable)
  const SidebarContent = ({ onSelectEmpleado, closeSidebar }) => (
    <>
      {/* Header del sidebar - ADAMIA */}
      <div className="p-2 sm:p-3 md:p-4 border-b-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
          <div className="bg-[#2563EB] p-1.5 rounded-lg">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-white" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-gray-900">
            Empleados ({empleados.length})
          </h3>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
          <Input
            placeholder="Buscar empleado..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-7 sm:pl-8 h-8 sm:h-10 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Lista de empleados */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 sm:p-2">
          {empleadosFiltrados.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500">
              No se encontraron empleados
            </div>
          ) : (
            empleadosFiltrados.map((emp) => {
              const esSeleccionado = empleadoSeleccionado === emp.id_empleado;
              return (
                <div
                  key={emp.id_empleado}
                  onClick={() => {
                    onSelectEmpleado(emp.id_empleado);
                    if (closeSidebar) closeSidebar();
                  }}
                  className={`
                    p-2 sm:p-3 mb-1 sm:mb-1.5 rounded-lg cursor-pointer transition-all
                    flex items-center gap-2 sm:gap-3
                    ${
                      esSeleccionado
                        ? "bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] text-white shadow-md"
                        : "hover:bg-blue-50 border border-transparent hover:border-blue-200"
                    }
                  `}
                >
                  {/* Avatar */}
                  <div
                    className={`
                      w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center
                      text-xs sm:text-sm font-bold flex-shrink-0
                      ${
                        esSeleccionado
                          ? "bg-white/20 text-white"
                          : "bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white"
                      }
                    `}
                  >
                    {obtenerIniciales(emp.nombre_completo)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold text-xs sm:text-sm truncate ${
                        esSeleccionado ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {emp.nombre_completo}
                    </div>
                    <div
                      className={`text-[10px] sm:text-xs truncate ${
                        esSeleccionado ? "text-white/80" : "text-gray-500"
                      }`}
                    >
                      {emp.puesto || "Sin asignar"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#F9FAFB]">
      {/* Header - Estilo ADAMIA */}
      <div className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] text-white p-2 sm:p-3 md:p-4 shadow-lg border-b-2 border-[#7C3AED]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 min-w-0 flex-1">
            {/* Botón para abrir sidebar en móvil */}
            <Sheet
              modal={false}
              open={sidebarOpen}
              onOpenChange={setSidebarOpen}
            >
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                >
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] sm:w-[320px] p-0 flex flex-col"
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
                  empresasOptions={empresasOptions}
                  empresaActiva={empresaActiva}
                  setEmpresaActiva={setEmpresaActiva}
                  obtenerIniciales={obtenerIniciales}
                  onSelectEmpleado={(id) => {
                    setEmpleadoSeleccionado(id);
                    setTabActivo("general");
                  }}
                  closeSidebar={() => setSidebarOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <h1 className="text-base sm:text-xl md:text-2xl font-bold flex-shrink-0">
              HR360
            </h1>
            <div className="hidden md:block min-w-0">
              <h2 className="text-sm md:text-base lg:text-lg font-bold truncate">
                Panel de Empleados
              </h2>
              <p className="text-xs opacity-85">
                Sistema de Gestión de Capital Humano
              </p>
            </div>
            <div className="md:hidden min-w-0">
              <h2 className="text-xs sm:text-sm font-bold truncate">
                Panel Empleados
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Desktop - Oculto en móvil */}
        <div className="hidden lg:flex w-80 bg-white border-r border-gray-200 flex-col">
          <SidebarContent
            empleados={empleados}
            empleadosFiltrados={empleadosFiltrados}
            empleadoSeleccionado={empleadoSeleccionado}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            empresasOptions={empresasOptions}
            empresaActiva={empresaActiva}
            setEmpresaActiva={setEmpresaActiva}
            obtenerIniciales={obtenerIniciales}
            onSelectEmpleado={(id) => {
              setEmpleadoSeleccionado(id);
              setTabActivo("general");
            }}
          />
        </div>

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-6">
          {!datosEmpleado ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-6xl mb-4">👈</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Selecciona un empleado
              </h3>
              <p className="text-sm text-gray-500">
                Elige un empleado del panel izquierdo para ver su información
                completa
              </p>
            </div>
          ) : (
            <>
              {/* Header del empleado */}
              <Card className="mb-3 sm:mb-4 md:mb-6">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 items-center sm:items-start">
                    {/* Avatar grande - ADAMIA */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white shadow-lg flex-shrink-0">
                      {obtenerIniciales(
                        datosEmpleado.informacion_general?.nombre_completo,
                      )}
                    </div>
                    {/* Información */}
                    <div className="flex-1 w-full text-center sm:text-left min-w-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 break-words">
                        {datosEmpleado.informacion_general?.nombre_completo}
                      </h2>
                      <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-3 sm:mb-4 break-words">
                        {datosEmpleado.informacion_general?.puesto ||
                          "Sin asignar"}{" "}
                        •{" "}
                        {datosEmpleado.informacion_general?.empresa ||
                          "Sin empresa"}
                      </p>
                      {/* Detalles rápidos */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                        <div className="min-w-0">
                          <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                            ID Empleado
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-gray-900 break-all">
                            EMP-
                            {String(
                              datosEmpleado.informacion_general?.id_empleado ||
                                0,
                            ).padStart(3, "0")}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                            Correo
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-gray-900 break-all">
                            {datosEmpleado.informacion_general
                              ?.email_corporativo || "N/A"}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                            Teléfono
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-gray-900 break-all">
                            {datosEmpleado.informacion_general?.telefono ||
                              "N/A"}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                            Fecha de Ingreso
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-gray-900">
                            {formatearFecha(
                              datosEmpleado.informacion_general?.fecha_ingreso,
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs - ADAMIA */}
              <Card>
                <Tabs value={tabActivo} onValueChange={setTabActivo}>
                  <div className="border-b-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white overflow-x-auto">
                    <TabsList className="bg-transparent h-auto p-0 min-w-max">
                      <TabsTrigger
                        value="general"
                        className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:text-[#2563EB] text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 font-medium"
                      >
                        <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2 flex-shrink-0" />
                        <span className="hidden md:inline">
                          Información General
                        </span>
                        <span className="md:hidden">General</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="permisos"
                        className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:text-[#2563EB] text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 font-medium"
                      >
                        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2 flex-shrink-0" />
                        Permisos
                      </TabsTrigger>
                      <TabsTrigger
                        value="asistencias"
                        className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:text-[#2563EB] text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 font-medium"
                      >
                        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2 flex-shrink-0" />
                        Asistencias
                      </TabsTrigger>
                      <TabsTrigger
                        value="entradas"
                        className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:text-[#2563EB] text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 font-medium"
                      >
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2 flex-shrink-0" />
                        <span className="hidden sm:inline">
                          Entradas/Salidas
                        </span>
                        <span className="sm:hidden">E/S</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="contratos"
                        className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:text-[#2563EB] text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 font-medium"
                      >
                        <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2 flex-shrink-0" />
                        Contratos
                      </TabsTrigger>
                      <TabsTrigger
                        value="vacaciones"
                        className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:text-[#2563EB] text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 font-medium"
                      >
                        <Plane className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2 flex-shrink-0" />
                        Vacaciones
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-2 sm:p-3 md:p-4 lg:p-6">
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
                  </div>
                </Tabs>
              </Card>
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

// Componente del sidebar (reutilizable)
const SidebarContent = ({
  empleados,
  empleadosFiltrados,
  empleadoSeleccionado,
  busqueda,
  setBusqueda,
  empresasOptions,
  empresaActiva,
  setEmpresaActiva,
  obtenerIniciales,
  onSelectEmpleado,
  closeSidebar,
}) => (
  <>
    {/* Header */}
    <div className="p-2 sm:p-3 md:p-4 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4" />
        <h3 className="font-bold text-sm">Empleados ({empleados.length})</h3>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Empresa</Label>
        <Combobox
          options={empresasOptions}
          value={empresaActiva}
          onChange={(val) =>
            setEmpresaActiva(val === "all" ? "all" : Number(val))
          }
          placeholder="Seleccionar empresa"
        />

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar empleado..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8"
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
              className={`p-3 mb-1 rounded-lg cursor-pointer ${
                activo ? "bg-slate-700 text-white" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                      w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center
                      text-xs sm:text-sm font-bold flex-shrink-0
                      ${
                        activo
                          ? "bg-white/20 text-white"
                          : "bg-gradient-to-br from-slate-600 to-blue-500 text-white"
                      }
                    `}
                >
                  {obtenerIniciales(emp.nombre_completo)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {emp.nombre_completo}
                  </div>
                  <div className="text-xs opacity-70 truncate">
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
