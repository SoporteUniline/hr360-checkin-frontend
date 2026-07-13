"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import axios from "axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Plus,
  Save,
  X,
  Trash2,
  Pencil,
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
import { CampoFiltro } from "@/components/filtros/CampoFiltro";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";

function AreaCard({ area, onEdit, onDelete }) {
  return (
    <Card className="w-full h-full transition-all hover:shadow-md">
      <CardContent className="p-4 flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-[#2563EB]" />
            <h3 className="font-semibold text-base text-gray-900">
              {area.nombre_area}
            </h3>
          </div>

          {/* 🏢 Muestra la empresa si existe (útil cuando el filtro es "all") */}
          {area.empresa_nombre && (
            <p className="text-xs text-gray-500 mb-2 italic">
              Unidad de negocio:{" "}
              {area.unidad_negocio || area.sucursal || area.empresa_nombre}
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
            className="h-9 w-9 p-0 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(area)}
            className="h-9 w-9 p-0 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
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
        className="bg-white rounded-xl overflow-hidden max-w-md w-full border border-gray-100 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 bg-linear-to-r from-red-600 to-red-700 text-white">
          <h3 className="text-base font-bold">{title}</h3>
          <p className="text-sm text-red-100 mt-1">
            Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-700">{description}</p>
        </div>
        <div className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button onClick={onConfirm} variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Eliminar
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
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const initialNombre = searchParams.get("nombre") || "";
  const [search, setSearch] = useState(initialNombre);
  const [debouncedSearch, setDebouncedSearch] = useState(initialNombre);

  const [unidadActiva, setUnidadActiva] = useState("all");
  const { options: unidadOptions, byId: unidadById } = useUnidadesNegocio();
  const empresaActiva =
    unidadActiva === "all"
      ? "all"
      : String(unidadById[unidadActiva]?.id_empresa || "all");

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
      enqueueSnackbar("Debes seleccionar una unidad de negocio para el área", {
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
    <div className="space-y-6">
      {/* Encabezado compacto Adamia */}
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-[0_8px_18px_rgba(37,99,235,0.3)]">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
                Áreas de Check
              </h1>
              <p className="text-[12.5px] text-gray-500">
                Administra áreas y radio permitido para registro.
              </p>
            </div>
          </div>
          <Button
            onClick={abrirModalNuevaArea}
            className="h-[38px] w-full gap-2 rounded-md bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.32)] hover:opacity-95 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nueva área
          </Button>
        </div>
        <div className="mt-3 h-[2.5px] rounded bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />
      </div>

      {/* Filtros homologados */}
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-2.5 md:grid-cols-[250px_1fr_auto]">
          <CampoFiltro etiqueta="Unidad de negocio">
            <div className="[&_button]:h-[38px] [&_button]:w-full [&_button]:rounded-md [&_button]:border-gray-200 [&_button]:text-[13px] [&_button]:font-medium">
              <Combobox
                options={[
                  { value: "all", label: "Todas las unidades de negocio" },
                  ...unidadOptions,
                ]}
                value={unidadActiva}
                onChange={(val) => setUnidadActiva(val || "all")}
              />
            </div>
          </CampoFiltro>
          <CampoFiltro etiqueta="Buscar">
            <Input
              className="h-[38px] rounded-md border-gray-200 bg-white text-[13px]"
              placeholder="Buscar por nombre de área..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                handleSearchChange(e.target.value);
              }}
            />
          </CampoFiltro>
          <div className="flex md:justify-end">
            <Button
              onClick={abrirModalNuevaArea}
              className="h-[38px] w-full gap-2 rounded-md bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.32)] hover:opacity-95 md:w-auto"
            >
              <Plus className="h-4 w-4" />
              Agregar nueva área
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#2563EB]"></div>
          <p className="mt-4 text-gray-600">Cargando áreas...</p>
        </div>
      ) : areas.length > 0 ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
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
          <div className="bg-blue-50 rounded-full p-6 mb-4">
            <MapPin className="h-12 w-12 text-[#2563EB]" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">
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
              onClick={() => {
                setSearch("");
                handleSearchChange("");
              }}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar búsqueda
            </Button>
          ) : (
            <Button
              onClick={abrirModalNuevaArea}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
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
