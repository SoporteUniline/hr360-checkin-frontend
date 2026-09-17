"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";
import { docGeneradosApi } from "@/lib/gestionDocumentalApi";
import { firmaDigitalAdminApi } from "@/lib/firmaDigitalApi";
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
  FileSignature,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
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

  const [solicitudFirma, setSolicitudFirma] = useState(null);
  const [estadoFirma, setEstadoFirma] = useState(null);
  const [consultandoFirma, setConsultandoFirma] = useState(false);
  const [solicitandoFirma, setSolicitandoFirma] = useState(false);
  const [abriendoDocumentoFirmado, setAbriendoDocumentoFirmado] =
    useState(false);
  const [errorFirma, setErrorFirma] = useState("");
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);

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

  useEffect(() => {
    setSolicitudFirma(null);
    setEstadoFirma(null);
    setErrorFirma("");
    setEnlaceCopiado(false);

    if (!viewingDoc?.id_documento || !viewingDoc?.id_empresa) return;

    let alive = true;

    const consultarEstadoFirma = async () => {
      setConsultandoFirma(true);

      try {
        const respuesta = await firmaDigitalAdminApi.obtenerEstadoDocumento({
          idEmpresa: viewingDoc.id_empresa,
          tipoDocumento: "DOCUMENTO_GENERADO",
          referenciaId: viewingDoc.id_documento,
        });

        if (alive) {
          setEstadoFirma(respuesta?.solicitud || null);
        }
      } catch (error) {
        if (alive) {
          setErrorFirma(
            error?.response?.data?.error ||
              "No se pudo consultar el estado de la firma.",
          );
        }
      } finally {
        if (alive) {
          setConsultandoFirma(false);
        }
      }
    };

    consultarEstadoFirma();

    return () => {
      alive = false;
    };
  }, [viewingDoc?.id_documento, viewingDoc?.id_empresa]);

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

  const abrirDocumentoFirmado = async () => {
    if (!estadoFirma?.id || !viewingDoc?.id_empresa) return;

    setAbriendoDocumentoFirmado(true);
    setErrorFirma("");

    try {
      const respuesta = await firmaDigitalAdminApi.obtenerDocumentoFirmado({
        idSolicitud: estadoFirma.id,
        idEmpresa: viewingDoc.id_empresa,
      });

      if (!respuesta?.documento_url) {
        throw new Error("No se recibió la URL del documento firmado.");
      }

      window.open(respuesta.documento_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorFirma(
        error?.response?.data?.error ||
          error?.message ||
          "No se pudo abrir el documento firmado.",
      );
    } finally {
      setAbriendoDocumentoFirmado(false);
    }
  };

  const solicitarFirma = async () => {
    if (
      !viewingDoc?.id_empresa ||
      !viewingDoc?.id_empleado ||
      !viewingDoc?.id_documento ||
      !viewingDoc?.contenido_html
    ) {
      setErrorFirma(
        "No se encontraron los datos necesarios del documento para solicitar la firma.",
      );
      return;
    }

    setSolicitandoFirma(true);
    setErrorFirma("");
    setEnlaceCopiado(false);

    try {
      const nombreArchivo = viewingDoc.nombre_documento || "documento";
      const documento = await htmlToPdf(
        viewingDoc.contenido_html,
        nombreArchivo,
        { download: false },
      );

      const solicitud = await firmaDigitalAdminApi.crearSolicitud({
        idEmpresa: viewingDoc.id_empresa,
        idEmpleado: viewingDoc.id_empleado,
        tipoDocumento: "DOCUMENTO_GENERADO",
        referenciaId: viewingDoc.id_documento,
        documento,
        nombreArchivo: `${nombreArchivo}.pdf`,
        expiracionHoras: 72,
      });

      const urlFirmaCompleta = solicitud?.url
        ? new URL(solicitud.url, window.location.origin).toString()
        : solicitud?.token
          ? `${window.location.origin}/firmar/${encodeURIComponent(
              solicitud.token,
            )}`
          : null;

      setSolicitudFirma({
        ...solicitud,
        url_firma_completa: urlFirmaCompleta,
      });

      setEstadoFirma({
        id: solicitud?.id,
        estatus: "pendiente",
        nombre_firmante:
          solicitud?.firmante?.nombre || viewingDoc.nombre_empleado || "",
        tiene_documento_firmado: false,
      });

      enqueueSnackbar("Solicitud de firma creada correctamente", {
        variant: "success",
      });
    } catch (error) {
      setErrorFirma(
        error?.response?.data?.error ||
          error?.message ||
          "No se pudo crear la solicitud de firma.",
      );
    } finally {
      setSolicitandoFirma(false);
    }
  };

  const copiarEnlaceFirma = async () => {
    if (!solicitudFirma?.url_firma_completa) return;

    try {
      await navigator.clipboard.writeText(solicitudFirma.url_firma_completa);
      setEnlaceCopiado(true);
      setTimeout(() => setEnlaceCopiado(false), 2000);
    } catch {
      setErrorFirma("No se pudo copiar el enlace de firma.");
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
          {(consultandoFirma ||
            estadoFirma ||
            errorFirma) && (
            <div>
              {consultandoFirma ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Consultando estado de firma...
                </div>
              ) : estadoFirma?.estatus === "firmado" ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-emerald-800">
                          Documento firmado
                        </p>
                        <p className="text-sm text-emerald-700">
                          {estadoFirma.nombre_firmante || "El empleado"} completó
                          la firma de este documento.
                        </p>
                      </div>
                    </div>

                    {estadoFirma.tiene_documento_firmado && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={abrirDocumentoFirmado}
                        disabled={abriendoDocumentoFirmado}
                        className="w-full sm:w-auto border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                      >
                        {abriendoDocumentoFirmado ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        {abriendoDocumentoFirmado
                          ? "Abriendo..."
                          : "Ver PDF firmado"}
                      </Button>
                    )}
                  </div>
                </div>
              ) : ["pendiente", "abierto"].includes(estadoFirma?.estatus) ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <FileSignature className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-blue-800">
                        Firma pendiente
                      </p>
                      <p className="text-sm text-blue-700">
                        La solicitud está pendiente de firma por{" "}
                        {estadoFirma.nombre_firmante || "el empleado"}.
                      </p>

                      {solicitudFirma?.url_firma_completa && (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            readOnly
                            value={solicitudFirma.url_firma_completa}
                            className="h-9 min-w-0 flex-1 rounded-md border border-blue-200 bg-white px-3 text-xs text-gray-700 outline-none"
                          />

                          <Button
                            type="button"
                            variant="outline"
                            onClick={copiarEnlaceFirma}
                            className="w-full sm:w-auto border-blue-300 text-blue-700 hover:bg-blue-100"
                          >
                            {enlaceCopiado ? (
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                            ) : (
                              <Copy className="h-4 w-4 mr-2" />
                            )}
                            {enlaceCopiado ? "Copiado" : "Copiar enlace"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : errorFirma ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {errorFirma}
                </div>
              ) : null}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setViewingDoc(null)}>
              Cerrar
            </Button>

            {!consultandoFirma &&
              !errorFirma &&
              !["pendiente", "abierto", "firmado"].includes(
                estadoFirma?.estatus,
              ) && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={solicitarFirma}
                  disabled={solicitandoFirma}
                >
                  {solicitandoFirma ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSignature className="w-4 h-4" />
                  )}
                  {solicitandoFirma ? "Preparando..." : "Solicitar firma"}
                </Button>
              )}

            <Button
              className="bg-[#2563EB] hover:bg-blue-700 text-white gap-2"
              onClick={handleDescargar}
            >
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
