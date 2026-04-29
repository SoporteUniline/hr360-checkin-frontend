"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";
import { plantillasApi } from "@/lib/gestionDocumentalApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  FileStack,
  Briefcase,
  Gavel,
  Users,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";

/* ─── Constantes ─── */
const CATEGORIAS = [
  { value: "Laboral",        label: "Laboral",        icon: Briefcase,  color: "bg-blue-100 text-blue-700" },
  { value: "Administrativo", label: "Administrativo", icon: FileStack,  color: "bg-amber-100 text-amber-700" },
  { value: "Legal",          label: "Legal",           icon: Gavel,      color: "bg-red-100 text-red-700" },
  { value: "RRHH",           label: "RRHH",            icon: Users,      color: "bg-purple-100 text-purple-700" },
  { value: "Otro",           label: "Otro",            icon: FolderOpen, color: "bg-gray-100 text-gray-700" },
];

function getCategoriaInfo(cat) {
  return CATEGORIAS.find((c) => c.value === cat) || CATEGORIAS[4];
}

/* ─── Tarjeta de plantilla ─── */
function PlantillaCard({ plantilla, onEdit, onDelete, onToggle }) {
  const cat = getCategoriaInfo(plantilla.categoria);
  const CatIcon = cat.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-blue-50 p-2.5 rounded-lg shrink-0">
            <FileText className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{plantilla.nombre}</p>
            <p className="text-xs text-gray-400 font-mono">{plantilla.codigo}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-400 hover:text-[#2563EB]"
            onClick={() => onEdit(plantilla)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-400 hover:text-red-500"
            onClick={() => onDelete(plantilla)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-400 hover:text-green-600"
            onClick={() => onToggle(plantilla)}
            title={plantilla.activo ? "Desactivar" : "Activar"}
          >
            {plantilla.activo
              ? <ToggleRight className="w-4 h-4 text-green-500" />
              : <ToggleLeft className="w-4 h-4" />
            }
          </Button>
        </div>
      </div>

      {/* Descripción */}
      {plantilla.descripcion && (
        <p className="text-sm text-gray-500 line-clamp-2">{plantilla.descripcion}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-50">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cat.color}`}>
          <CatIcon className="w-3 h-3" />
          {cat.label}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plantilla.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {plantilla.activo ? "Activa" : "Inactiva"}
        </span>
      </div>
    </motion.div>
  );
}

/* ─── Skeleton ─── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-gray-200 rounded-lg w-10 h-10" />
        <div className="flex-1">
          <div className="bg-gray-200 h-4 rounded w-3/4 mb-1.5" />
          <div className="bg-gray-100 h-3 rounded w-1/3" />
        </div>
      </div>
      <div className="bg-gray-100 h-3 rounded w-full mb-1.5" />
      <div className="bg-gray-100 h-3 rounded w-2/3" />
    </div>
  );
}

/* ─── Página principal ─── */
export default function PlantillasPage() {
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [deletingItem, setDeletingItem] = useState(null);

  const empresa = dataUser?.empresas?.[0] || "all";

  const swrKey = `/checador/gestion-documental/plantillas?empresa=${empresa}&search=${search}&categoria=${categoria === "todas" ? "" : categoria}`;

  const { data, isLoading, error } = useSWR(swrKey, fetcherWithToken, {
    revalidateOnFocus: false,
  });

  const plantillas = data?.data || [];

  /* ─── Acciones ─── */
  const handleEdit = useCallback((plantilla) => {
    router.push(`/panel/gestion-documental/plantillas/editor?id=${plantilla.id_plantilla}`);
  }, [router]);

  const handleDelete = useCallback((plantilla) => {
    setDeletingItem(plantilla);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    try {
      await plantillasApi.eliminar(deletingItem.id_plantilla);
      enqueueSnackbar("Plantilla eliminada", { variant: "success" });
      mutate(swrKey);
    } catch {
      enqueueSnackbar("Error al eliminar la plantilla", { variant: "error" });
    } finally {
      setDeletingItem(null);
    }
  }, [deletingItem, enqueueSnackbar, swrKey]);

  const handleToggle = useCallback(async (plantilla) => {
    try {
      await plantillasApi.toggle(plantilla.id_plantilla, !plantilla.activo);
      enqueueSnackbar(
        plantilla.activo ? "Plantilla desactivada" : "Plantilla activada",
        { variant: "info" },
      );
      mutate(swrKey);
    } catch {
      enqueueSnackbar("Error al actualizar estatus", { variant: "error" });
    }
  }, [enqueueSnackbar, swrKey]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de documentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Crea y gestiona las plantillas con variables dinámicas
          </p>
        </div>
        <Button
          className="bg-[#2563EB] hover:bg-blue-700 text-white gap-2 self-start sm:self-auto"
          onClick={() => router.push("/panel/gestion-documental/plantillas/editor")}
        >
          <Plus className="w-4 h-4" />
          Nueva plantilla
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total plantillas", value: data?.total ?? "—", color: "bg-blue-50 text-[#2563EB]" },
          { label: "Activas", value: plantillas.filter(p => p.activo).length, color: "bg-green-50 text-green-600" },
          { label: "Inactivas", value: plantillas.filter(p => !p.activo).length, color: "bg-gray-50 text-gray-500" },
          { label: "Categorías", value: CATEGORIAS.length, color: "bg-purple-50 text-purple-600" },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color.split(" ")[1]}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {CATEGORIAS.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Grid ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          Error al cargar las plantillas. Intenta de nuevo.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : plantillas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 gap-4"
        >
          <div className="bg-blue-50 p-5 rounded-2xl">
            <FileText className="w-10 h-10 text-[#2563EB]" />
          </div>
          <div className="text-center">
            <p className="text-gray-700 font-semibold">No hay plantillas todavía</p>
            <p className="text-sm text-gray-400 mt-1">Crea tu primera plantilla para comenzar</p>
          </div>
          <Button
            variant="outline"
            className="gap-2 border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
            onClick={() => router.push("/panel/gestion-documental/plantillas/editor")}
          >
            <Plus className="w-4 h-4" />
            Crear plantilla
          </Button>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plantillas.map((plantilla) => (
              <PlantillaCard
                key={plantilla.id_plantilla}
                plantilla={plantilla}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* ── Confirmación eliminar ── */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              La plantilla <strong>{deletingItem?.nombre}</strong> será eliminada de forma permanente.
              Los documentos generados con esta plantilla no se verán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
