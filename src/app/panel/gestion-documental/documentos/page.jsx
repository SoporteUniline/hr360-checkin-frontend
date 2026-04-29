"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";
import { docGeneradosApi } from "@/lib/gestionDocumentalApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  Eye,
  Trash2,
  Download,
  Plus,
  User,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { htmlToPdf } from "@/lib/htmlToPdf";

/* ─── Constantes ─── */
const ESTATUSES = [
  { value: "borrador", label: "Borrador",  color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { value: "emitido",  label: "Emitido",   color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "firmado",  label: "Firmado",   color: "bg-green-50 text-green-700 border-green-200" },
  { value: "anulado",  label: "Anulado",   color: "bg-red-50 text-red-700 border-red-200" },
];

function getEstatusInfo(e) {
  return ESTATUSES.find((s) => s.value === e) || ESTATUSES[0];
}

/* ─── Fila de documento ─── */
function DocRow({ doc, onView, onDelete }) {
  const est = getEstatusInfo(doc.estatus);
  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="hover:bg-gray-50/80 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 p-1.5 rounded-md shrink-0">
            <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{doc.nombre_documento}</p>
            <p className="text-[11px] font-mono text-gray-400">{doc.folio}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm text-gray-700">{doc.nombre_empleado}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-0.5">
          {doc.nombre_plantilla}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${est.color}`}>
          {est.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          {doc.fecha_creacion}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-[#2563EB]" onClick={() => onView(doc)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => onDelete(doc)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

/* ─── Página ─── */
export default function DocumentosPage() {
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const empresa = dataUser?.empresas?.[0] || "all";
  const [search, setSearch] = useState("");
  const [estatus, setEstatus] = useState("todos");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [viewingDoc, setViewingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);

  const swrKey = `/checador/gestion-documental/documentos?empresa=${empresa}&search=${search}&estatus=${estatus === "todos" ? "" : estatus}&page=${page}&limit=${limit}`;

  const { data, isLoading, error } = useSWR(swrKey, fetcherWithToken, {
    revalidateOnFocus: false,
  });

  const docs = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  /* ─── Ver documento ─── */
  const handleView = async (doc) => {
    try {
      const full = await docGeneradosApi.getById(doc.id_documento);
      setViewingDoc(full);
    } catch {
      enqueueSnackbar("Error al cargar el documento", { variant: "error" });
    }
  };

  /* ─── Eliminar ─── */
  const confirmDelete = async () => {
    if (!deletingDoc) return;
    try {
      await docGeneradosApi.eliminar(deletingDoc.id_documento);
      enqueueSnackbar("Documento eliminado", { variant: "success" });
      mutate(swrKey);
    } catch {
      enqueueSnackbar("Error al eliminar el documento", { variant: "error" });
    } finally {
      setDeletingDoc(null);
    }
  };

  /* ─── Descargar PDF desde modal ─── */
  const handleDescargar = async () => {
    const htmlContent = viewingDoc?.contenido_html;
    if (!htmlContent) return;
    try {
      await htmlToPdf(htmlContent, viewingDoc?.nombre_documento || "documento");
      enqueueSnackbar("PDF descargado correctamente", { variant: "success" });
    } catch (err) {
      console.error("PDF error:", err);
      enqueueSnackbar("Error al generar el PDF", { variant: "error" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos generados</h1>
          <p className="text-sm text-gray-500 mt-0.5">Historial de todos los documentos emitidos</p>
        </div>
        <Button
          className="bg-[#2563EB] hover:bg-blue-700 text-white gap-2 self-start sm:self-auto"
          onClick={() => router.push("/panel/gestion-documental/generar")}
        >
          <Plus className="w-4 h-4" />
          Generar documento
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {ESTATUSES.map((s) => (
          <div key={s.value} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">
              {docs.filter((d) => d.estatus === s.value).length}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar por folio, nombre o empleado..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={estatus} onValueChange={(v) => { setEstatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Todos los estatus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estatus</SelectItem>
            {ESTATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Tabla ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          Error al cargar los documentos
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Documento</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Empleado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plantilla</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estatus</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : docs.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <FileText className="w-8 h-8 text-gray-300" />
                      </div>
                      <p>No hay documentos generados todavía</p>
                      <Button variant="outline" size="sm" className="gap-2 border-[#2563EB] text-[#2563EB]" onClick={() => router.push("/panel/gestion-documental/generar")}>
                        <Plus className="w-4 h-4" /> Generar el primero
                      </Button>
                    </div>
                  </td>
                </tr>
              )
              : (
                <AnimatePresence>
                  {docs.map((doc) => (
                    <DocRow key={doc.id_documento} doc={doc} onView={handleView} onDelete={setDeletingDoc} />
                  ))}
                </AnimatePresence>
              )
            }
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} documentos en total</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span className="px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* ── Modal ver documento ── */}
      <Dialog open={Boolean(viewingDoc)} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2563EB]" />
              {viewingDoc?.nombre_documento}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-3">
              <span className="font-mono text-xs">{viewingDoc?.folio}</span>
              <span className="text-gray-300">•</span>
              <span>{viewingDoc?.nombre_empleado}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border rounded-lg">
            <div
              className="p-8 text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none"
              style={{ fontFamily: "Georgia, serif" }}
              dangerouslySetInnerHTML={{ __html: viewingDoc?.contenido_html || "" }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setViewingDoc(null)}>Cerrar</Button>
            <Button className="bg-[#2563EB] hover:bg-blue-700 text-white gap-2" onClick={handleDescargar}>
              <Download className="w-4 h-4" /> Descargar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar eliminar ── */}
      <AlertDialog open={Boolean(deletingDoc)} onOpenChange={(open) => !open && setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              El documento <strong>{deletingDoc?.nombre_documento}</strong> será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
