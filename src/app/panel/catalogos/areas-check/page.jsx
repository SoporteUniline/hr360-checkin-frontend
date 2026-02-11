"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import axios from "axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Plus,
  Save,
  X,
  Trash2,
  Edit,
  Search,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useSnackbar } from "notistack";
import AreaCheckMap from "@/components/AreaCheckMap";
import { useAuth } from "@/context/AuthContext";
import TablePagination from "@/components/TablePagination";
import debounce from "lodash.debounce";
import ModalArea from "@/components/ModalArea";
import AccesosRapidos from "@/components/AccesosRapidos";
import { Combobox } from "@/components/Combobox";

function AreaCard({ area, onEdit, onDelete }) {
  return (
    <Card className="w-full h-full transition-all hover:shadow-md">
      <CardContent className="p-4 flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-5 w-5 text-[#3498db]" />
            <h3 className="font-semibold text-lg leading-tight">
              {area.nombre_area}
            </h3>
          </div>

          {/* 🏢 Muestra la empresa si existe (útil cuando el filtro es "all") */}
          {area.empresa_nombre && (
            <p className="text-xs text-gray-500 mb-2 italic">
              Empresa: {area.empresa_nombre}
            </p>
          )}

          {area.latitud && area.longitud && (
            <p className="text-sm font-mono text-gray-600">
              {Number(area.latitud).toFixed(6)},{" "}
              {Number(area.longitud).toFixed(6)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(area)}
            className="h-9 w-9 p-0 border-[#93c5fd] text-[#2563eb] hover:bg-[#dbeafe] hover:text-[#1e40af]"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(area)}
            className="h-9 w-9 p-0 border-[#fca5a5] text-[#dc2626] hover:bg-[#fee2e2]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Modal({ isOpen, onClose, title, children }) {
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
          {/* Secundario según `Colores.txt` */}
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            // Danger según `Colores.txt`
            className="bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
          >
            Eliminar Área
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AreasCheckPage() {
  const API_URL = process.env.NEXT_PUBLIC_RUTA_BACKEND;
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [empresaActiva, setEmpresaActiva] = useState("all");

  // 🕒 Debounce (para no spamear el servidor)
  const handleSearchChange = debounce((value) => {
    setDebouncedSearch(value);
    setPage(1);
  }, 600);

  const { data, isLoading, mutate } = useSWR(
    dataUser
      ? `${API_URL}/checador/area_check2?id_empresa=${empresaActiva}&search=${debouncedSearch}&page=${page}&limit=${limit}`
      : null,
    fetcherWithToken,
  );

  const areas = data?.data || [];
  const total = data?.total || 1;

  const [areaAEliminar, setAreaAEliminar] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoArea, setEditandoArea] = useState(null);
  const [nuevaArea, setNuevaArea] = useState({
    nombre_area: "",
    latitud: null,
    longitud: null,
  });

  const abrirModalNuevaArea = () => {
    setEditandoArea(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (area) => {
    setEditandoArea(area);
    setTimeout(() => setMostrarModal(true), 0);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEditandoArea(null);
    setEditandoArea({ nombre_area: "", latitud: null, longitud: null });
  };

  const guardarArea = async (formData) => {
    if (!formData.id_empresa && empresaActiva === "all") {
      enqueueSnackbar("Debes seleccionar una empresa para el área", {
        variant: "warning",
      });
      return;
    }

    if (!formData?.nombre_area?.trim()) {
      enqueueSnackbar("El nombre del área es requerido", { variant: "error" });
      return;
    }

    if (!formData.latitud || !formData.longitud) {
      enqueueSnackbar("Debes seleccionar una ubicación en el mapa", {
        variant: "error",
      });
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        ...formData,
        id_empresa: formData.id_empresa || empresaActiva,
        latitud: Number(formData.latitud),
        longitud: Number(formData.longitud),
      };

      if (formData.id_area) {
        await axios.put(
          `${API_URL}/checador/area_check2/${formData.id_area}`,
          datos,
        );
        enqueueSnackbar("Área actualizada exitosamente", {
          variant: "success",
        });
      } else {
        await axios.post(`${API_URL}/checador/area_check2`, datos);
        enqueueSnackbar("Área creada exitosamente", { variant: "success" });
      }

      await mutate();
      cerrarModal();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || "Error guardando área", {
        variant: "error",
      });
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar área
  const confirmarEliminarArea = async () => {
    if (!areaAEliminar) return;

    try {
      await axios.delete(
        `${API_URL}/checador/area_check2/${areaAEliminar.id_area}`,
      );
      enqueueSnackbar("Área eliminada exitosamente", { variant: "success" });
      await mutate();
    } catch (error) {
      // console.error("Error eliminando área:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Error al eliminar el área",
        { variant: "error" },
      );
    } finally {
      setAreaAEliminar(null);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center mb-4">
        {/* Encabezado con colores del sistema (ver `Colores.txt`) */}
        <h1 className="text-2xl font-bold flex items-center gap-2 text-[#2c3e50]">
          <MapPin className="h-6 w-6 text-[#3498db]" />
          Áreas de Check
        </h1>
      </div>

      {/* Búsqueda con contador */}
      {/* <div className="mb-4 flex gap-3 items-center">
        <Input
          className="flex-1"
          placeholder="Buscar área..."
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <Button
          onClick={abrirModalNuevaArea}
          // Botón principal según `Colores.txt`
          className="bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Área
        </Button>
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr_auto] gap-4 items-end">
        <div className="flex flex-col gap-1">
          <Label>Empresa</Label>
          <Combobox
            options={[
              { value: "all", label: "Todas las empresas" },
              ...(dataUser?.empresas_detalle?.map((e) => ({
                value: e.id_empresa,
                label: e.nombre,
              })) || []),
            ]}
            value={empresaActiva}
            onChange={(val) =>
              setEmpresaActiva(val === "all" ? "all" : Number(val))
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Buscar</Label>
          <Input
            placeholder="Buscar por nombre de área..."
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <Button onClick={abrirModalNuevaArea} className="bg-[#37495E] ...">
          <Plus className="h-4 w-4 mr-2" /> Nueva Área
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          {/* Spinner con color INFO (ver `Colores.txt`) */}
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#3498db] mr-4"></div>
          <p className="mt-4 text-gray-600">Cargando áreas...</p>
        </div>
      ) : areas.length > 0 ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,_minmax(250px,_1fr))] gap-4">
            {areas.map((area) => (
              <AreaCard
                key={area.id_area}
                area={area}
                onEdit={abrirModalEditar}
                onDelete={setAreaAEliminar}
              />
            ))}
          </div>

          {/* 🔹 Paginación */}
          <TablePagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      ) : (
        // Cuando no hay áreas o no hay resultados de búsqueda
        <div className="flex flex-col items-center justify-center py-16 px-4">
          {/* Empty state con INFO light (ver `Colores.txt`) */}
          <div className="bg-[#dbeafe] rounded-full p-6 mb-4">
            <MapPin className="h-12 w-12 text-[#3498db]" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {search ? "No se encontraron áreas" : "No hay áreas registradas"}
          </h3>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            {search
              ? `No encontramos áreas que coincidan con "${search}". Intenta con otro término.`
              : "Comienza creando tu primera área de check para que los empleados puedan registrar su asistencia."}
          </p>
          {search ? (
            <Button
              variant="outline"
              onClick={() => setSearch("")}
              className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar búsqueda
            </Button>
          ) : (
            <Button
              onClick={abrirModalNuevaArea}
              className="bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear primera área
            </Button>
          )}
        </div>
      )}

      <ModalArea
        empresas={dataUser?.empresas_detalle}
        id_empresa_defecto={empresaActiva}
        isOpen={mostrarModal}
        onClose={cerrarModal}
        onSave={guardarArea}
        initialData={editandoArea}
        loading={guardando}
      />

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

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
