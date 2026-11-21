"use client";

// Consentimiento del empleado para usar su rostro al checar (21/11/2026). NO es obligatorio: sin firma, la ficha
// muestra «Consentimiento pendiente» y todo sigue funcionando. Usa la firma digital existente (trazo + foto):
// tipo CONSENTIMIENTO_BIOMETRICO, referencia = id del empleado. Texto en src/lib/legal/documentos.js.
import { useCallback, useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { firmaDigitalAdminApi } from "@/lib/firmaDigitalApi";
import { CONSENTIMIENTO_BIOMETRICO as C } from "@/lib/legal/documentos";
import { estadoConsentimiento } from "@/lib/legal/consentimientoRostro.mjs";

const TIPO = "CONSENTIMIENTO_BIOMETRICO";
const ESTILO = {
  firmado: "border-green-200 bg-green-50 text-green-900",
  esperando: "border-amber-200 bg-amber-50 text-amber-900",
  pendiente: "border-slate-200 bg-slate-50 text-slate-800",
};

async function generarPdf({ nombre, empresa }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = 175;
  let y = 24;
  doc.setFont("helvetica", "bold").setFontSize(15).text(C.titulo, 20, y);
  y += 10;
  doc.setFont("helvetica", "normal").setFontSize(10.5);
  const lineas = [
    `Empresa (responsable de mis datos): ${empresa}`,
    `Empleado: ${nombre}`,
    `Fecha de emisión: ${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}`,
    "",
    ...C.texto,
    "",
    `${C.acepto}. Firmo este documento de forma electrónica.`,
    "",
    `Versión del texto: ${C.version}.`,
  ];
  for (const l of lineas) {
    const partes = l ? doc.splitTextToSize(l, ancho) : [""];
    doc.text(partes, 20, y);
    y += partes.length * 5.5 + (l ? 2 : 0);
  }
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
        nombreArchivo: "consentimiento-rostro.pdf",
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
      <section className={`w-full max-w-md rounded-xl border p-4 text-sm ${ESTILO.pendiente}`} aria-label="Consentimiento del rostro">
        <b>Consentimiento del rostro</b>
        <p className="mt-1">Guarda primero al empleado para generar su consentimiento de uso del rostro.</p>
      </section>
    );
  }

  return (
    <section className={`w-full max-w-md rounded-xl border p-4 text-sm ${ESTILO[estado.tipo]}`} aria-label="Consentimiento del rostro" aria-busy={cargando}>
      <div className="flex items-start justify-between gap-3">
        <b>Consentimiento del rostro</b>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold">{cargando ? "Revisando…" : estado.etiqueta}</span>
      </div>
      {cargando ? null : estado.tipo === "firmado" ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span>{estado.detalle}</span>
          {solicitud?.tiene_documento_firmado ? (
            <button type="button" onClick={verFirmado} className="font-semibold underline underline-offset-2">Ver documento firmado</button>
          ) : null}
        </div>
      ) : estado.tipo === "esperando" ? (
        <div className="mt-2 grid gap-2">
          <p className="m-0">{estado.detalle} Comparte el enlace con el empleado o ábrelo aquí para que firme en esta pantalla.</p>
          {enlace ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copiar} className="rounded-lg bg-white px-3 py-2 font-semibold shadow-sm">Copiar enlace</button>
              <a href={enlace} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white px-3 py-2 font-semibold shadow-sm">Firmar aquí</a>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Firma tu consentimiento de uso del rostro para checar: ${enlace}`)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white px-3 py-2 font-semibold shadow-sm">Enviar por WhatsApp</a>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 grid gap-2">
          <p className="m-0">
            {estado.detalle} No es obligatorio para checar, pero es la constancia de que el empleado aceptó el uso de su rostro (dato sensible).
          </p>
          <button type="button" onClick={generar} disabled={generando} className="justify-self-start rounded-lg bg-[#2c56e8] px-3 py-2 font-semibold text-white disabled:opacity-60">
            {generando ? "Generando…" : "Generar consentimiento para firmar"}
          </button>
        </div>
      )}
    </section>
  );
}
