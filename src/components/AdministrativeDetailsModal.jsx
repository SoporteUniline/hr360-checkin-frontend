"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { twMerge } from "tailwind-merge";
import { CardCompact } from "./CardCompact";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";
import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { administrativeMinutesApi } from "@/lib/administrativeMinutesApi";
import {
  createPdfContext,
  drawHeaderBox,
  drawKeyValueBox,
  drawMultilineBox,
  drawSignaturesAndFooter,
} from "@/lib/pdfUnifiedLayout";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, AlertTriangle } from "lucide-react";

dayjs.locale("es");

export const AdministrativeDetailsModal = ({
  open,
  onClose,
  acta,
  /**
   * Callback opcional para refrescar el listado (SWR mutate) cuando se cambia el estatus.
   * Relación: `src/app/panel/actas-administrativas/page.jsx` -> `useAdministrativeMinutes().mutate`
   */
  onEstatusUpdated,
}) => {
  const { dataUser } = useAuth();
  console.log(dataUser);
  const { enqueueSnackbar } = useSnackbar();
  const idEmpresa = acta?.id_empresa;

  /**
   * Datos de empresa para marca/imagen en el PDF (formato unificado).
   * Relación: mismo patrón usado en:
   * - `src/app/panel/permisos/PermisoViewDialog.jsx`
   * - `src/app/panel/finiquitos-y-liquidaciones/FiniquitoViewDialog.jsx`
   */
  const { data: empresaData } = useSWR(
    idEmpresa ? `/empresas/${idEmpresa}` : null,
    fetcherWithToken,
    swr_config,
  );

  /**
   * Logo precargado como DataURL (con fallback a `/assets/logo.png`).
   * Relación: el logo se sube/edita en `src/app/panel/cuenta/Empresa/ImagenEmpresa.jsx`.
   */
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const companyUrl = empresaData?.url_imagen;
      const companyDataUrl = companyUrl
        ? await fetchImageAsDataUrl(companyUrl)
        : null;
      const fallbackDataUrl = companyDataUrl
        ? null
        : await fetchImageAsDataUrl("/assets/logo.png");
      if (alive) setLogoDataUrl(companyDataUrl || fallbackDataUrl || null);
    };
    run();
    return () => {
      alive = false;
    };
  }, [empresaData?.url_imagen]);

  /**
   * IMPORTANTE (React hooks):
   * - NO se debe hacer `return null` antes de hooks, porque `acta` puede cambiar de null → objeto
   *   y eso rompe el orden de hooks (error interno en React/Next).
   * - Relación: mismo comentario ya aplicado en `src/app/panel/permisos/PermisoViewDialog.jsx`.
   */
  /**
   * Estado local del estatus para reflejar el cambio instantáneamente en el UI.
   * Relación:
   * - La fuente original viene de `useAdministrativeMinutes` (listado).
   * - Al cambiar estatus usamos `administrativeMinutesApi.actualizarEstatus` y actualizamos este estado.
   */
  const [estatusLocal, setEstatusLocal] = useState(acta?.estatus);
  const [openEstatusDialog, setOpenEstatusDialog] = useState(false);
  const [estatusNuevo, setEstatusNuevo] = useState(
    String(acta?.estatus || "").toLowerCase(),
  );
  const [savingEstatus, setSavingEstatus] = useState(false);

  useEffect(() => {
    // Cuando cambia el acta (por abrir otra), sincronizamos estado local.
    setEstatusLocal(acta?.estatus);
    setEstatusNuevo(String(acta?.estatus || "").toLowerCase());
  }, [acta?.id_acta, acta?.estatus]);

  // Mantener el guard clause DESPUÉS de TODOS los hooks (para no romper el orden).
  if (!acta) return null;

  const estatusOptions = [
    { value: "elaborada", label: "Elaborada" },
    { value: "notificada", label: "Notificada" },
    { value: "cerrada", label: "Cerrada" },
  ];

  const badgeClassByEstatus = (estatus) => {
    const e = String(estatus || "").toLowerCase();
    return `capitalize px-3 py-1 rounded-2xl text-xs font-semibold ${
      e === "elaborada"
        ? "bg-blue-200 text-blue-800"
        : e === "cerrada"
        ? "bg-red-200 text-red-800"
        : e === "notificada"
        ? "bg-emerald-200 text-emerald-800"
        : "bg-purple-200 text-purple-800"
    }`;
  };

  const onGuardarEstatus = async () => {
    try {
      if (!idEmpresa) {
        enqueueSnackbar("No se encontró la empresa en sesión (id_empresa).", {
          variant: "error",
        });
        return;
      }
      if (!acta?.id_acta) {
        enqueueSnackbar("No se encontró el ID del acta.", { variant: "error" });
        return;
      }

      setSavingEstatus(true);
      const resp = await administrativeMinutesApi.actualizarEstatus(
        acta.id_acta,
        {
          id_empresa: idEmpresa,
          estatus: estatusNuevo,
        },
      );

      setEstatusLocal(resp?.estatus || estatusNuevo);
      enqueueSnackbar("Estatus actualizado correctamente", {
        variant: "success",
      });
      setOpenEstatusDialog(false);

      // Refrescar listado (si el padre lo manda), para que el cambio se vea en la tabla también.
      await onEstatusUpdated?.();
    } catch (error) {
      console.error("Error al actualizar estatus del acta:", error);
      enqueueSnackbar(
        error?.response?.data?.error ||
          "Hubo un error al actualizar el estatus del acta",
        { variant: "error" },
      );
    } finally {
      setSavingEstatus(false);
    }
  };

  const formatSancion = (str) => {
    if (!str) return "";
    return str.replace(/_/g, " ").toUpperCase();
  };

  /**
   * Descarga PDF con el mismo formato visual que Permisos (cajas/encabezado/firmas).
   * Implementación:
   * - Usa `src/lib/pdfUnifiedLayout.js` (que replica el estilo de Permisos).
   * - Incluye marca/empresa (logo) si existe.
   */
  const descargarPDFActaFormatoPermisos = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const ctx = createPdfContext({ doc });

    const companyName =
      empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa || "";
    const empleadoName = `${acta.nombre_empleado || ""} ${
      acta.apellido_paterno_empleado || ""
    } ${acta.apellido_materno_empleado || ""}`
      .replace(/\s+/g, " ")
      .trim();

    drawHeaderBox(ctx, {
      title: "Acta administrativa",
      linesLeft: [
        `Folio: ${acta.folio || "—"}`,
        `Empleado: ${empleadoName || "—"}`,
        `Fecha incidente: ${
          acta.fecha_incidente
            ? dayjs(acta.fecha_incidente).format("DD/MM/YYYY")
            : "—"
        }`,
      ],
      kpiLabel: "Estatus",
      kpiValue: String(acta.estatus || "—").toUpperCase(),
      companyName,
      logoDataUrl,
    });

    drawKeyValueBox(ctx, {
      title: "Información general",
      rows: [
        ["Tipo de acta", acta.nombre_tipo_acta || "—"],
        ["Gravedad", String(acta.gravedad_tipo || "—").toUpperCase()],
        ["Hora incidente", acta.hora_incidente || "—"],
        ["Lugar incidente", acta.lugar_incidente || "—"],
        ["Sanción", formatSancion(acta.tipo_sancion) || "—"],
        ["Acepta hechos", acta.acepta_hechos ? "Sí" : "No"],
        ["Reincidencia", acta.es_reincidencia ? "Sí" : "No"],
      ],
    });

    drawMultilineBox(ctx, {
      title: "Descripción de los hechos",
      text: acta.descripcion_hechos || "—",
    });

    drawMultilineBox(ctx, {
      title: "Testigos",
      text: acta.testigos || "—",
    });

    drawMultilineBox(ctx, {
      title: "Descargo del trabajador",
      text: acta.descargo_trabajador || "—",
    });

    drawKeyValueBox(ctx, {
      title: "Información administrativa",
      rows: [
        ["Elabora", acta.nombre_quien_elabora || "—"],
        ["Cargo elabora", acta.nombre_cargo_elabora || "—"],
        [
          "Fecha creación",
          acta.fecha_creacion
            ? dayjs(acta.fecha_creacion).format("DD/MM/YYYY HH:mm")
            : "—",
        ],
      ],
    });

    drawSignaturesAndFooter(doc, {
      empleadoName: empleadoName || "—",
      empresaLabel: companyName || "Uniline Innovacion en la Nube",
      footerLeft: "Sistema HR360",
      // En Actas: firmas solo en la última página (evita duplicarlas si el PDF es de 2+ hojas).
      signaturesOn: "last",
    });

    const nombreArchivo = `ACTA_ADMINISTRATIVA_${String(
      acta.folio || "FOLIO",
    ).replace(/\s+/g, "_")}_${String(empleadoName || "Empleado").replace(
      /\s+/g,
      "_",
    )}.pdf`;
    doc.save(nombreArchivo);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={twMerge(
          "max-w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[85vh] overflow-y-auto p-0",
        )}
      >
        {/* Header - Diseño ADAMIA (patrón Contratos) */}
        <DialogHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <DialogTitle className="text-white">
              📄 Acta {acta.folio || acta.id_acta}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <CardCompact
            title="📄 Información General"
            className="bg-blue-50 border-l-blue-500"
          >
            <div className="flex justify-between pb-1 border-b-1">
              <p className="text-gray-500">Empresa:</p>
              <p className="font-semibold">{acta?.nombre_empresa || "—"}</p>
            </div>

            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Folio:</p>
              <p className="font-semibold">{acta.folio}</p>
            </div>

            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Empleado:</p>
              <p className="font-semibold">
                {acta.nombre_empleado} {acta.apellido_paterno_empleado}{" "}
                {acta.apellido_materno_empleado}
              </p>
            </div>

            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Tipo de acta:</p>
              <p className="font-semibold">{acta.nombre_tipo_acta}</p>
            </div>

            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Gravedad:</p>
              <span
                className={twMerge(
                  "px-3 py-1 rounded-2xl text-xs font-semibold",
                  acta.gravedad_tipo === "grave"
                    ? "bg-red-200 text-red-800"
                    : "bg-yellow-100 text-yellow-800",
                )}
              >
                {acta.gravedad_tipo?.toUpperCase()}
              </span>
            </div>
          </CardCompact>

          <CardCompact
            title="📅 Detalles del Incidente"
            className="bg-green-50 border-l-green-500"
          >
            <div className="flex justify-between pb-1 border-b-1">
              <p className="text-gray-500">Fecha:</p>
              <p className="font-semibold">
                {dayjs(acta.fecha_incidente).format("DD/MM/YYYY")}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Hora:</p>
              <p className="font-semibold">{acta.hora_incidente}</p>
            </div>
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Lugar:</p>
              <p className="font-semibold">
                {acta.lugar_incidente
                  ? acta.lugar_incidente
                  : "No especificado"}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Descripción:</p>
              <p className="font-semibold">{acta.descripcion_hechos}</p>
            </div>
          </CardCompact>

          <CardCompact
            title="⚠️ Sanción"
            className="bg-yellow-50 border-l-yellow-500"
          >
            <div className="flex justify-between pb-1 border-b-1">
              <p className="text-gray-500">Tipo:</p>
              <p className="font-semibold">
                {formatSancion(acta.tipo_sancion)}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Días de suspensión:</p>
              <p className="font-semibold">{acta.dias_suspension}</p>
            </div>
          </CardCompact>

          <CardCompact
            title="💬 Descargo del Trabajador"
            className="bg-purple-50 border-l-purple-500"
          >
            {acta.descargo_trabajador && (
              <div className="pb-3">{acta.descargo_trabajador}</div>
            )}
            <div className="flex justify-between">
              <p className="text-gray-500">Acepta los hechos:</p>
              <p className="font-semibold">
                {acta.acepta_hechos ? "✅ Sí" : "✖️ No"}
              </p>
            </div>
          </CardCompact>
          <CardCompact
            title="👤 Información Administrativa"
            className="bg-teal-50 border-l-teal-500"
          >
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Elabora:</p>
              <p className="font-semibold">{acta.nombre_quien_elabora}</p>
            </div>
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Estatus:</p>
              <div className="flex items-center gap-2">
                <span className={badgeClassByEstatus(estatusLocal)}>
                  {estatusLocal}
                </span>

                {/* Botón rápido: cambiar estatus sin entrar a "Editar". */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-blue-200 text-[#2563EB] hover:bg-blue-50"
                  onClick={() => {
                    setEstatusNuevo(String(estatusLocal || "").toLowerCase());
                    setOpenEstatusDialog(true);
                  }}
                  disabled={savingEstatus}
                >
                  Cambiar estatus
                </Button>
              </div>
            </div>
            <div className="flex justify-between pt-2 pb-2 border-b-1">
              <p className="text-gray-500">Reincidencia:</p>
              <p className="font-semibold">
                {acta.es_reincidencia ? "⚠️ SÍ" : "🪪 NO"}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Fecha de creación:</p>
              <p className="font-semibold">
                {dayjs(acta.fecha_creacion).format("DD/MM/YYYY HH:mm")}
              </p>
            </div>
          </CardCompact>
        </div>

        {/* Footer de acciones: cerrar + descargar PDF.
            Relación: patrón igual a `PermisoViewDialog` y `FiniquitoViewDialog`. */}
        <div className="bg-gray-50 p-4 flex flex-col-reverse sm:flex-row justify-end gap-2 rounded-b-lg">
          <Button
            variant="outline"
            onClick={() => onClose(false)}
            className="w-full sm:w-auto border-gray-300"
          >
            Cerrar
          </Button>
          <Button
            onClick={descargarPDFActaFormatoPermisos}
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm"
          >
            📄 Descargar PDF
          </Button>
        </div>

        {/* Diálogo de cambio de estatus (confirmación) */}
        <AlertDialog
          open={openEstatusDialog}
          onOpenChange={setOpenEstatusDialog}
        >
          <AlertDialogContent className="sm:max-w-[425px] p-0">
            <AlertDialogHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                <AlertDialogTitle className="text-white">
                  Cambiar estatus
                </AlertDialogTitle>
              </div>
            </AlertDialogHeader>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md">
                <AlertDialogDescription className="text-sm">
                  Selecciona el nuevo estatus para el acta{" "}
                  <span className="font-semibold">{acta.folio}</span>.
                </AlertDialogDescription>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Nuevo estatus
                </p>
                <Select value={estatusNuevo} onValueChange={setEstatusNuevo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estatus" />
                  </SelectTrigger>
                  <SelectContent>
                    {estatusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AlertDialogFooter className="bg-gray-50 p-4 flex justify-end gap-2 rounded-b-lg">
              <AlertDialogCancel
                className="border-gray-300"
                disabled={savingEstatus}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onGuardarEstatus}
                disabled={savingEstatus || !estatusNuevo}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm"
              >
                {savingEstatus ? "Guardando..." : "Guardar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
