"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  MapPin,
  Edit,
  Trash2,
  Building2,
  Users,
  Calendar,
  Save,
  X,
} from "lucide-react";
import { useSnackbar } from "notistack";
import axios from "axios";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import AreaCheckMap from "@/components/AreaCheckMap";
import { Icon } from "@iconify/react";

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

function AreaCard({ area, onEdit, onDelete }) {
  const getTipoBadgeColor = (tipo) => {
    switch (tipo) {
      case "entrada":
        return "bg-green-100 text-green-800 mt-1";
      case "salida":
        return "bg-red-100 text-red-800 mt-1";
      case "ambos":
        return "bg-blue-100 text-blue-800 mt-1";
      default:
        return "bg-gray-100 text-gray-800 mt-1";
    }
  };

  return (
    <Card className="w-full h-full transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-2 ">
              <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  {area.nombre_area}
                </h3>
              </div>
              {/* <Badge className={getTipoBadgeColor(area.tipo)}>
                {area.tipo.charAt(0).toUpperCase() + area.tipo.slice(1)}
              </Badge> */}
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm  sm:grid-cols-2">
              {/* <div className="space-y-1">
                {area.radio_metros ? (
                  <>
                    <p className="text-gray-500">Radio de cobertura</p>
                    <p className="font-medium">{area.radio_metros} metros</p>
                  </>
                ) : null}
              </div> */}
              <div className="space-y-1">
                {area.latitud && area.longitud ? (
                  <>
                    <p className="text-gray-500">Coordenadas</p>
                    <p className="font-mono text-xs">
                      {Number(area.latitud).toFixed(6)},{" "}
                      {Number(area.longitud).toFixed(6)}
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 ">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(area)}
              className="h-9 w-9 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(area)}
              className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Modal({ isOpen, onClose, title, description, children }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-6">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold mb-2 flex">{title}</h2>
              <button
                onClick={onClose}
                className=" text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full p-1 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {description && (
              <p className="text-gray-600 text-sm">{description}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function AlertDialog({ isOpen, onClose, onConfirm, title, description }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Eliminar Área
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EditarSucursalPage() {
  const API_URL = process.env.NEXT_PUBLIC_RUTA_BACKEND;
  const params = useParams();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const id_sucursal = params.id;

  // Estados
  const [nombreSucursal, setNombreSucursal] = useState("");
  const [guardandoSucursal, setGuardandoSucursal] = useState(false);
  const [editandoArea, setEditandoArea] = useState(null);
  const [mostrarFormArea, setMostrarFormArea] = useState(false);
  const [areaAEliminar, setAreaAEliminar] = useState(null);
  const [guardandoArea, setGuardandoArea] = useState(false);
  const [nuevaArea, setNuevaArea] = useState({
    nombre_area: "",
    tipo: "ambos",
    radio_metros: 100,
  });

  // SWR hooks
  const { data: sucursal, mutate } = useSWR(
    `/checador/sucursales/${id_sucursal}`,
    fetcherWithToken
  );

  const { data: areas, mutate: mutateAreas } = useSWR(
    sucursal ? `/checador/empleados/areas?sucursal=${id_sucursal}` : null,
    fetcherWithToken
  );

  // Inicializar nombre de sucursal
  useEffect(() => {
    if (sucursal) {
      setNombreSucursal(sucursal.nombre);
    }
  }, [sucursal]);

  // Normalizar coordenadas de áreas
  // useEffect(() => {
  //   if (areas) {
  //     const areasNormalizadas = areas.map((a) => ({
  //       ...a,
  //       latitud: a.latitud ? Number(a.latitud) : null,
  //       longitud: a.longitud ? Number(a.longitud) : null,
  //     }));
  //     mutateAreas(areasNormalizadas, false);
  //   }
  // }, [areas]);

  // Actualizar nombre de sucursal
  const actualizarSucursal = async () => {
    if (!nombreSucursal.trim()) {
      enqueueSnackbar("El nombre de la sucursal es requerido", {
        variant: "error",
      });
      return;
    }

    setGuardandoSucursal(true);
    try {
      await axios.put(`${API_URL}/checador/sucursales/${id_sucursal}`, {
        nombre: nombreSucursal,
      });
      enqueueSnackbar("Sucursal actualizada exitosamente", {
        variant: "success",
      });
      mutate();
    } catch (error) {
      console.error("Error actualizando sucursal:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Error al actualizar la sucursal",
        { variant: "error" }
      );
    } finally {
      setGuardandoSucursal(false);
    }
  };

  // Guardar área
  const guardarArea = async () => {
    if (!nuevaArea.nombre_area.trim()) {
      enqueueSnackbar("El nombre del área es requerido", {
        variant: "error",
      });
      return;
    }

    if (!nuevaArea.latitud || !nuevaArea.longitud) {
      enqueueSnackbar("Debes seleccionar una ubicación en el mapa", {
        variant: "error",
      });
      return;
    }

    setGuardandoArea(true);
    try {
      const datos = {
        ...nuevaArea,
        id_sucursal: parseInt(id_sucursal),
        latitud: nuevaArea.latitud ? Number(nuevaArea.latitud) : null,
        longitud: nuevaArea.longitud ? Number(nuevaArea.longitud) : null,
      };

      if (editandoArea) {
        await axios.put(
          `${API_URL}/checador/empleados/areas/${editandoArea.id_area}`,
          datos
        );
        enqueueSnackbar("Área actualizada exitosamente", {
          variant: "success",
        });
      } else {
        await axios.post(`${API_URL}/checador/empleados/areas`, datos);
        enqueueSnackbar("Área creada exitosamente", { variant: "success" });
      }

      await mutateAreas();
      cerrarFormularioArea();
    } catch (error) {
      console.error("Error guardando área:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Error al guardar el área",
        { variant: "error" }
      );
    } finally {
      setGuardandoArea(false);
      setNuevaArea({
        nombre_area: "",
        tipo: "ambos",
        radio_metros: 100,
        latitud: null,
        longitud: null,
      });
    }
  };

  // Eliminar área
  const confirmarEliminarArea = async () => {
    if (!areaAEliminar) return;

    try {
      await axios.delete(
        `${API_URL}/checador/empleados/areas/${areaAEliminar.id_area}`
      );
      enqueueSnackbar("Área eliminada exitosamente", { variant: "success" });
      await mutateAreas();
    } catch (error) {
      console.error("Error eliminando área:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Error al eliminar el área",
        { variant: "error" }
      );
    } finally {
      setAreaAEliminar(null);
    }
  };

  // Abrir formulario de nueva área
  const abrirFormularioNuevaArea = () => {
    setEditandoArea(null);
    setNuevaArea({
      nombre_area: "",
      tipo: "ambos",
      radio_metros: 100,
    });
    setMostrarFormArea(true);
  };

  // Abrir formulario de edición
  const abrirFormularioEdicion = (area) => {
    setEditandoArea(area);
    setNuevaArea(area);
    setMostrarFormArea(true);
  };

  // Cerrar formulario
  const cerrarFormularioArea = () => {
    setMostrarFormArea(false);
    setEditandoArea(null);
    setNuevaArea({
      nombre_area: "",
      tipo: "ambos",
      radio_metros: 100,
    });
  };

  // Loading state
  if (!sucursal) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="container mx-auto p-2 space-y-6">
      {/* Header con breadcrumbs mejorado */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {/* <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/panel/catalogos/sucursales")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button> */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push("/panel/catalogos/sucursales")}
          >
            <Icon icon="material-symbols:arrow-back" width={24} height={24} />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              {sucursal.nombre}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información básica */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información de la Sucursal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la sucursal</Label>
              <Input
                id="nombre"
                value={nombreSucursal}
                onChange={(e) => setNombreSucursal(e.target.value)}
                placeholder="Ingresa el nombre de la sucursal"
                className="text-lg"
              />
            </div>
            <Button
              onClick={actualizarSucursal}
              disabled={guardandoSucursal || nombreSucursal === sucursal.nombre}
              className="w-full sm:w-auto"
            >
              {guardandoSucursal ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Actualizar Sucursal
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Áreas de check</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {areas?.length || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">
                    Empleados asignados
                  </span>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {sucursal.empleados_count || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Áreas de Check */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Áreas de Check
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Gestiona las áreas donde los empleados pueden registrar su
                asistencia
              </p>
            </div>
            <Button onClick={abrirFormularioNuevaArea} className="sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Área
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {areas && areas.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {areas.map((area) => (
                <AreaCard
                  key={area.id_area}
                  area={area}
                  onEdit={abrirFormularioEdicion}
                  onDelete={setAreaAEliminar}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <MapPin className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No hay áreas configuradas
              </h3>
              <p className="text-gray-500 mb-4">
                Crea la primera área de check para esta sucursal
              </p>
              <Button onClick={abrirFormularioNuevaArea} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Área
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para crear/editar área */}
      <Modal
        isOpen={mostrarFormArea}
        onClose={cerrarFormularioArea}
        title={editandoArea ? "Editar Área de Check" : "Nueva Área de Check"}
        description={
          editandoArea
            ? "Modifica los datos del área de check"
            : "Define una nueva área donde los empleados podrán registrar su asistencia"
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nombre_area">
              Nombre del área <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre_area"
              value={nuevaArea.nombre_area}
              onChange={(e) =>
                setNuevaArea({
                  ...nuevaArea,
                  nombre_area: e.target.value,
                })
              }
              placeholder="Ej: Recepción Principal, Almacén, Oficinas"
            />
          </div>

          <AreaCheckMap area={nuevaArea} onChange={setNuevaArea} />

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={cerrarFormularioArea}
              disabled={guardandoArea}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={guardarArea} disabled={guardandoArea}>
              {guardandoArea ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editandoArea ? "Actualizar" : "Crear"} Área
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* AlertDialog para confirmar eliminación */}
      <AlertDialog
        isOpen={!!areaAEliminar}
        onClose={() => setAreaAEliminar(null)}
        onConfirm={confirmarEliminarArea}
        title="¿Estás seguro?"
        description={
          areaAEliminar
            ? `Esta acción eliminará permanentemente el área "${areaAEliminar.nombre_area}". Los empleados ya no podrán registrar asistencia en esta ubicación.`
            : ""
        }
      />
    </div>
  );
}
