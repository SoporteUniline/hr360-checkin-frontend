"use client";

// Consentimiento del empleado para usar su rostro al checar. NO es obligatorio: sin firma, la ficha
// muestra «Consentimiento pendiente» y todo sigue funcionando. Usa la firma digital existente (trazo + foto):
// tipo CONSENTIMIENTO_BIOMETRICO, referencia = id del empleado. Texto en src/lib/legal/documentos.js.
import { useCallback, useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { firmaDigitalAdminApi } from "@/lib/firmaDigitalApi";
import { FileCheck2 } from "lucide-react";
import EvidenciaFirma from "@/components/firma/EvidenciaFirma";
import { estadoConsentimiento } from "@/lib/legal/consentimientoRostro.mjs";
import { dibujarConsentimientoRostro } from "@/lib/legal/consentimientoRostroPdf.mjs";
import { prepararMarcaAdamia } from "@/lib/pdfAdamiaTheme";
import { nombreArchivoPdf } from "@/lib/nombreArchivo.mjs";

const TIPO = "CONSENTIMIENTO_BIOMETRICO";
const ESTILO = {
  firmado: "border-green-200 bg-green-50 text-green-900",
  esperando: "border-amber-200 bg-amber-50 text-amber-900",
  pendiente: "border-slate-200 bg-slate-50 text-slate-800",
};

// Formato homologado ADAMIA (logotipo, encabezado y pie con «Página X de Y»):
// src/lib/legal/consentimientoRostroPdf.mjs.
async function generarPdf({ nombre, empresa }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const { font, logo } = await prepararMarcaAdamia(doc);
  dibujarConsentimientoRostro(doc, { nombre, empresa, font, logo });
  return doc.output("blob");
}

export default function ConsentimientoRostro({ idEmpresa, idEmpleado, nombre, empresa }) {
  const { enqueueSnackbar } = useSnackbar();
  const [solicitud, setSolicitud] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);

  const cargar = useCallback(async () => {
    if (!idEmpresa || !idEmpleado) return setCargando(false);
    setCargando(true);
    try {
      const r = await firmaDigitalAdminApi.obtenerEstadoDocumento({ idEmpresa, tipoDocumento: TIPO, referenciaId: idEmpleado });
      setSolicitud(r?.solicitud ?? null);
    } catch {
      setSolicitud(null);
    } finally {
      setCargando(false);
    }
  }, [idEmpresa, idEmpleado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const estado = estadoConsentimiento(solicitud);
  const enlace = solicitud?.url_firma && typeof window !== "undefined" ? `${window.location.origin}${solicitud.url_firma}` : null;

  const generar = async () => {
    setGenerando(true);
    try {
      const documento = await generarPdf({ nombre: nombre || "Empleado", empresa: empresa || "La empresa" });
      await firmaDigitalAdminApi.crearSolicitud({
        idEmpresa,
        idEmpleado,
        tipoDocumento: TIPO,
        referenciaId: idEmpleado,
        documento,
        nombreArchivo: nombreArchivoPdf({ documento: "Consentimiento rostro", empleado: idEmpleado }),
        expiracionHoras: 720,
      });
      enqueueSnackbar("Consentimiento listo para firmar.", { variant: "success" });
    } catch (e) {
      if (e?.response?.status !== 409) {
        enqueueSnackbar(e?.response?.data?.error || "No se pudo generar el consentimiento.", { variant: "error" });
      }
    } finally {
      setGenerando(false);
      cargar();
    }
  };

  const verFirmado = async () => {
    try {
      const r = await firmaDigitalAdminApi.obtenerDocumentoFirmado({ idSolicitud: solicitud.id, idEmpresa });
      if (r?.documento_url) window.open(r.documento_url, "_blank", "noopener,noreferrer");
    } catch {
      enqueueSnackbar("No se pudo abrir el documento firmado.", { variant: "error" });
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      enqueueSnackbar("Enlace copiado.", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo copiar; selecciona el enlace y cópialo.", { variant: "warning" });
    }
  };

  if (!idEmpleado) {
    return (
      <section className={`w-full rounded-xl border p-4 text-cuerpo ${ESTILO.pendiente}`} aria-label="Consentimiento del rostro">
        <b>Consentimiento del rostro</b>
        <p className="mt-1">Guarda primero al empleado para generar su consentimiento de uso del rostro.</p>
      </section>
    );
  }

  return (
    <section className={`w-full rounded-xl border p-4 text-cuerpo ${ESTILO[estado.tipo]}`} aria-label="Consentimiento del rostro" aria-busy={cargando}>
      <div className="flex items-start justify-between gap-3">
        <b>Consentimiento del rostro</b>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold">{cargando ? "Revisando…" : estado.etiqueta}</span>
      </div>
      {cargando ? null : estado.tipo === "firmado" ? (
        <div className="mt-2 grid gap-3">
          <p className="m-0">{estado.detalle}</p>
          {solicitud?.tiene_documento_firmado ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={verFirmado} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                <FileCheck2 className="size-4 text-brand" aria-hidden="true" /> Ver documento firmado
              </button>
              <EvidenciaFirma idSolicitud={solicitud.id} idEmpresa={idEmpresa} className="min-h-11!" />
            </div>
          ) : null}
        </div>
      ) : estado.tipo === "esperando" ? (
        <div className="mt-2 grid gap-2">
          <p className="m-0">{estado.detalle} Comparte el enlace con el empleado o ábrelo aquí para que firme en esta pantalla.</p>
          {enlace ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copiar} className="inline-flex min-h-11 items-center rounded-lg bg-white px-3 font-semibold shadow-sm">Copiar enlace</button>
              <a href={enlace} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-white px-3 font-semibold shadow-sm">Firmar aquí</a>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Firma tu consentimiento de uso del rostro para checar: ${enlace}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-white px-3 font-semibold shadow-sm">Enviar por WhatsApp</a>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 grid gap-2">
          <p className="m-0">
            {estado.detalle} No es obligatorio para checar, pero es la constancia de que el empleado aceptó el uso de su rostro (dato sensible).
          </p>
          <button type="button" onClick={generar} disabled={generando} className="min-h-11 justify-self-start rounded-lg bg-[#2c56e8] px-3 font-semibold text-white disabled:opacity-60">
            {generando ? "Generando…" : "Generar consentimiento para firmar"}
          </button>
        </div>
      )}
    </section>
  );
}
