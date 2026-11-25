"use client";

// «Credencial y QR» del encabezado de la ficha: muestra el QR de acceso del empleado (su «Código de empleado», el
// mismo que lee el checador) y la credencial CR80 frente/vuelta, con descarga en PDF a tamaño tarjeta y PNG a 600 dpi.
// Nunca lleva el PIN de firma: RH no lo ve.
import { useEffect, useMemo, useState } from "react";
import { Download, FileDown, QrCode } from "lucide-react";
import { useSnackbar } from "notistack";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { datosCredencial, DPI_DESCARGA } from "@/lib/empleado/credencial.mjs";
import { nombreArchivoPdf } from "@/lib/nombreArchivo.mjs";

const DPI_VISTA = 300;

export default function BotonCredencial({ empleado, empresa, foto, hayCambios = false, className = "" }) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState(null); // { frente, vuelta } como data URL
  const [ocupado, setOcupado] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  const datos = useMemo(() => datosCredencial({ empleado, empresa }), [empleado, empresa]);
  const clave = JSON.stringify(datos) + String(foto || "");

  useEffect(() => {
    if (!abierto) return undefined;
    let vigente = true;
    setVista(null);
    (async () => {
      try {
        const { cargarFoto, generarLados } = await import("@/lib/empleado/credencialCanvas");
        const img = await cargarFoto(foto);
        const lados = await generarLados(datos, { dpi: DPI_VISTA, foto: img });
        if (vigente) setVista({ frente: lados.frente.toDataURL("image/png"), vuelta: lados.vuelta.toDataURL("image/png") });
      } catch (e) {
        console.error("Credencial:", e);
        if (vigente) setVista({ error: true });
      }
    })();
    return () => { vigente = false; };
    // `clave` resume datos y foto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, clave]);

  const descargar = async (tipo) => {
    setOcupado(tipo);
    try {
      const { cargarFoto, generarLados, crearPdf, descargarPng } = await import("@/lib/empleado/credencialCanvas");
      const img = await cargarFoto(foto);
      if (tipo === "pdf") {
        // A sangre (sin esquinas transparentes): la impresora de tarjetas o el corte dan la esquina redonda.
        const lados = await generarLados(datos, { dpi: DPI_DESCARGA, foto: img, redondear: false });
        const doc = await crearPdf(lados);
        doc.save(nombreArchivoPdf({ documento: "Credencial", empleado }));
      } else {
        const lados = await generarLados(datos, { dpi: DPI_DESCARGA, foto: img });
        await descargarPng(lados[tipo], nombreArchivoPdf({ documento: `Credencial ${tipo}`, empleado, extension: "png" }), DPI_DESCARGA);
      }
    } catch (e) {
      console.error("Credencial:", e);
      enqueueSnackbar("No se pudo generar la credencial. Intenta de nuevo.", { variant: "error" });
    } finally {
      setOcupado("");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setAbierto(true)}
        className={`min-h-11 rounded-[10px] border-slate-300 px-3.5 text-sm font-semibold text-slate-800 sm:min-h-10 ${className}`}
        data-boton-credencial
      >
        <QrCode className="size-[18px]" aria-hidden="true" />
        Credencial y QR
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6 [&>button:last-child]:right-2 [&>button:last-child]:top-2 [&>button:last-child]:flex [&>button:last-child]:size-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle>Credencial y QR</DialogTitle>
            <DialogDescription className="text-[13px] sm:text-sm">
              Tamaño tarjeta (CR80, 54 × 86 mm). El QR es su código de empleado: el mismo que lee el reloj checador.
            </DialogDescription>
          </DialogHeader>

          {hayCambios && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              Hay cambios sin guardar: la credencial muestra lo que ves en la ficha. Guarda antes de imprimir para que el código coincida con el checador.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:px-6" aria-busy={!vista}>
            {["frente", "vuelta"].map((lado) => (
              <figure key={lado} className="flex min-w-0 flex-col items-center gap-2">
                <div className="aspect-[53.98/85.6] w-full max-w-[220px] overflow-hidden rounded-[14px] bg-slate-100 shadow-[0_12px_28px_rgba(15,23,42,0.18)]">
                  {vista?.[lado] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagen del canvas (data URL), no un recurso a optimizar
                    <img src={vista[lado]} alt={lado === "frente" ? "Frente de la credencial" : "Vuelta de la credencial con el código QR"} className="size-full" data-credencial={lado} />
                  ) : (
                    <div className="flex size-full items-center justify-center p-3 text-center text-[13px] text-slate-500">
                      {vista?.error ? "No se pudo dibujar" : "Preparando…"}
                    </div>
                  )}
                </div>
                <figcaption className="text-[13px] text-slate-600">{lado === "frente" ? "Frente" : "Vuelta"}</figcaption>
              </figure>
            ))}
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <p className="text-[13px] text-slate-600">Código de acceso</p>
            <p className="font-mono text-lg font-bold tracking-wider text-slate-900">{datos.codigoTexto || "Sin código asignado"}</p>
            {!datos.codigo && <p className="text-[13px] text-slate-600">Asígnalo en «Checador y acceso» para que la credencial lleve QR.</p>}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button type="button" variant="outline" className="min-h-11 text-sm" disabled={Boolean(ocupado)} onClick={() => descargar("frente")}>
              <Download aria-hidden="true" /> {ocupado === "frente" ? "Generando…" : "PNG frente"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11 text-sm" disabled={Boolean(ocupado)} onClick={() => descargar("vuelta")}>
              <Download aria-hidden="true" /> {ocupado === "vuelta" ? "Generando…" : "PNG vuelta"}
            </Button>
            <Button type="button" className="min-h-11 bg-brand text-sm font-semibold text-white hover:bg-blue-700" disabled={Boolean(ocupado)} onClick={() => descargar("pdf")}>
              <FileDown aria-hidden="true" /> {ocupado === "pdf" ? "Generando…" : "Descargar PDF"}
            </Button>
          </div>
          <p className="text-[13px] text-slate-500">
            PDF: 2 páginas de 54 × 86 mm (frente y vuelta) para impresora de tarjetas o imprenta; imprime al 100 %, sin ajustar a la hoja. PNG: 600 dpi.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
