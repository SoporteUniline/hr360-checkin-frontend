"use client";

// Ficha → Checador y acceso → Reconocimiento facial:
// 1) Estado del rostro registrado con fecha y origen («Registrado desde el celular el 23 nov, 5:15 p.m.»), del historial
//    rostro_actualizaciones (el mismo GET y la misma caché SWR que AvisoRostroApp).
// 2) «Probar rostro»: enciende la cámara de la computadora y compara el rostro en vivo con el registrado, con la misma
//    métrica y umbral del checador (coseno ≥ 0.95, src/lib/rostro/comparar.mjs). NO guarda nada y NO toca el formulario
//    de la ficha (no cuenta como cambio sin guardar). Detector y guía en vivo: los del celular (useCapturaRostro).
// Privacidad: no hay foto. El patrón guardado ya llega al navegador con GET /checador/empleados/:id (lo usa la ficha);
// aquí se vuelve a pedir al abrir la prueba para comparar con lo que hay HOY en el servidor (p. ej. recién registrado
// desde el celular), se queda solo en memoria y se descarta al cerrar.
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { ScanFace } from "lucide-react";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCapturaRostro } from "@/components/rostro/useCapturaRostro";
import { compararRostro, descriptorGuardado, textoComparacion } from "@/lib/rostro/comparar.mjs";
import { estadoRostro } from "@/lib/rostro/estadoRostro.mjs";
import { OVALO_FICHA, TONO_GUIA } from "@/lib/rostro/guia.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const primerNombre = (n) => String(n ?? "").trim().split(/\s+/)[0] || "la persona";

export default function ProbarRostro({ idEmpleado, nombre, tieneRostro, sinGuardar, onAbrir }) {
  const { data } = useSWR(idEmpleado ? `/checador/mi-espacio/rostro/empleado/${idEmpleado}` : null, get, { revalidateOnFocus: false, shouldRetryOnError: false });
  const estado = estadoRostro(data?.cambios, tieneRostro && !sinGuardar);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, coincide, porcentaje } | { error }
  const referencia = useRef(null);
  const { videoRef, fase, guia, nivel, listo, aviso, encender, cancelar, leer } = useCapturaRostro({ ovalo: OVALO_FICHA, lecturas: 1 });
  const tono = TONO_GUIA[nivel] ?? TONO_GUIA.info;

  const abrir = () => { onAbrir?.(); setResultado(null); setAbierto(true); };
  const cerrar = useCallback(() => { cancelar(); referencia.current = null; setResultado(null); setAbierto(false); }, [cancelar]);

  // Al abrir: el patrón vigente del servidor y la cámara, a la vez.
  useEffect(() => {
    if (!abierto) return undefined;
    let vivo = true;
    setCargando(true);
    axios.get(`/checador/empleados/${idEmpleado}`)
      .then(({ data: e }) => { if (vivo) referencia.current = descriptorGuardado(e?.descriptor_facial); })
      .catch(() => { if (vivo) referencia.current = null; })
      .finally(() => { if (vivo) setCargando(false); });
    encender();
    return () => { vivo = false; };
  }, [abierto, idEmpleado, encender]);

  const probar = async () => {
    setResultado(null);
    const r = await leer({ volverACamara: true });
    if (!r.ok) return;
    const c = compararRostro(r.descriptor, referencia.current);
    setResultado(c.ok ? c : { error: textoComparacion(c, nombre) });
  };

  if (!estado.registrado) return null;
  const sinReferencia = !cargando && abierto && !referencia.current;
  return (
    <div className="mt-2 grid gap-2" data-probar-rostro>
      {estado.detalle ? <p className="text-xs text-slate-500" data-rostro-detalle>{estado.detalle}</p> : null}
      <button type="button" onClick={abrir}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
        <ScanFace className="size-4" aria-hidden="true" />Probar rostro
      </button>

      <Dialog open={abierto} onOpenChange={(v) => (v ? setAbierto(true) : cerrar())}>
        <DialogContent className="max-h-[92dvh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-md" data-probar-dialogo>
          <DialogTitle className="pr-6 text-lg font-bold">Probar el rostro de {primerNombre(nombre)}</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Compara el rostro en vivo con el registrado, con la misma regla del checador. Es solo una prueba: no se guarda nada.
          </DialogDescription>
          {sinGuardar ? <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">Se compara con el rostro guardado, no con la captura que aún no guardas.</p> : null}
          <div className="grid gap-3">
            <div className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-xl bg-slate-900">
              <video ref={videoRef} muted playsInline autoPlay aria-label="Vista de la cámara para probar el rostro" className="size-full -scale-x-100 object-cover" />
              <span className={`pointer-events-none absolute inset-x-[20%] inset-y-[10%] rounded-[50%] border-[3px] shadow-[0_0_0_999px_rgba(15,23,42,0.35)] transition-colors ${tono.ovalo}`} aria-hidden="true" data-ovalo={nivel} />
            </div>
            <p role="status" aria-live="polite" className={`min-h-11 rounded-lg border px-3 py-2 text-center font-semibold ${tono.caja}`} data-guia={nivel}>
              {fase === "preparando" || fase === "inicio" ? "Preparando la cámara…" : guia}
            </p>
            {sinReferencia ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Aún no hay un rostro guardado para comparar. Regístralo y guarda la ficha.</p> : null}
            {aviso ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{aviso.texto}</p> : null}
            {resultado ? (
              <p role="status" data-resultado={resultado.error ? "error" : resultado.coincide ? "coincide" : "no-coincide"}
                className={`rounded-lg border p-3 text-sm font-semibold ${resultado.coincide ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                {resultado.error ?? textoComparacion(resultado, nombre)}
              </p>
            ) : null}
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <button type="button" onClick={cerrar} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50">Cerrar</button>
              <button type="button" onClick={probar} disabled={!listo || cargando || !referencia.current}
                className="min-h-11 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50">
                {fase === "leyendo" ? "Comparando…" : resultado ? "Probar otra vez" : "Comparar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
