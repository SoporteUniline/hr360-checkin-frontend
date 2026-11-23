"use client";

// Ficha → Checador y acceso → Reconocimiento facial (05/12/2026, pedido del dueño): «Continuar desde el celular».
// RH genera un enlace de UN solo uso (15 min) para que ESA persona registre su rostro con la cámara de su celular. Se
// muestra un QR (dibujado aquí: el enlace no se manda a servicios externos) y el enlace para copiar. Mientras el diálogo
// está abierto se consulta el estado cada 2.5 s; al detectar «usado» se cierra y avisa. Backend:
// /checador/rostro-celular (docs/rostro-desde-celular.md del backend). Reglas puras: src/lib/rostro/enlaceCelular.mjs.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import { Copy, RefreshCw, Smartphone } from "lucide-react";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cuentaRegresiva, dominioEnlace, INTERVALO_ESTADO_MS, mensajeListo, primerNombre, segundosHasta, trasEstado, trazoQr, urlEnlaceRostro, venceEn } from "@/lib/rostro/enlaceCelular.mjs";

function CodigoQr({ texto }) {
  const { tamano, d } = useMemo(() => trazoQr(texto), [texto]);
  return (
    <svg viewBox={`0 0 ${tamano} ${tamano}`} role="img" aria-label="Código QR del enlace para registrar el rostro" className="block size-full" shapeRendering="crispEdges" data-qr>
      <rect width={tamano} height={tamano} fill="#fff" />
      <path d={d} fill="#0f172a" />
    </svg>
  );
}

export default function RostroCelular({ idEmpleado, nombre, onRegistrado, onAbrir }) {
  const { enqueueSnackbar } = useSnackbar();
  const [abierto, setAbierto] = useState(false);
  const [enlace, setEnlace] = useState(null); // { id, url, vence }
  const [generando, setGenerando] = useState(false);
  const [vencido, setVencido] = useState(false);
  const [sinMigracion, setSinMigracion] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const ruta = `/checador/rostro-celular/empleado/${idEmpleado}/enlaces`;
  const quien = primerNombre(nombre);
  const avisado = useRef(null);
  // La ficha se vuelve a dibujar a cada rato (la cámara de la computadora): lo que cambia por render va en una
  // referencia para que la consulta del estado no se reinicie y llegue a correr.
  const alListo = useRef(null);
  alListo.current = () => { enqueueSnackbar(mensajeListo(nombre), { variant: "success" }); onRegistrado?.(); };

  const generar = useCallback(async () => {
    setGenerando(true);
    try {
      const { data } = await axios.post(ruta);
      const dominio = dominioEnlace(process.env.NEXT_PUBLIC_RUTA_DOMAIN, window.location.origin);
      setEnlace({ id: data.id, url: urlEnlaceRostro(dominio, data.token), vence: venceEn(data.segundos) });
      setVencido(false);
      setAhora(Date.now());
      setAbierto(true);
      onAbrir?.(); // la ficha apaga la cámara de la computadora: la persona usará la de su celular
    } catch (e) {
      if (e?.response?.data?.codigo === "SIN_MIGRACION") setSinMigracion(true);
      else enqueueSnackbar(e?.response?.data?.error ?? "No se pudo generar el enlace. Intenta de nuevo.", { variant: "error" });
    } finally {
      setGenerando(false);
    }
  }, [ruta, enqueueSnackbar, onAbrir]);

  // Cuenta regresiva (cada segundo) mientras el diálogo está abierto.
  useEffect(() => {
    if (!abierto || !enlace || vencido) return undefined;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [abierto, enlace, vencido]);
  const restantes = enlace ? segundosHasta(enlace.vence, ahora) : 0;
  useEffect(() => { if (enlace && abierto && restantes === 0) setVencido(true); }, [enlace, abierto, restantes]);

  // Consulta del estado: una petición a la vez, cada 2.5 s, solo con el diálogo abierto.
  useEffect(() => {
    if (!abierto || !enlace || vencido) return undefined;
    let activo = true;
    let t;
    const consultar = async () => {
      try {
        const { data } = await axios.get(`${ruta}/${enlace.id}`);
        if (!activo) return;
        const r = trasEstado(data?.estado);
        if (r.resultado === "usado") {
          if (avisado.current === enlace.id) return;
          avisado.current = enlace.id;
          setAbierto(false);
          alListo.current();
          return;
        }
        if (r.resultado === "expirado") { setVencido(true); return; }
      } catch {
        // Un tropiezo de red no cierra nada: se vuelve a intentar en el siguiente turno.
      }
      if (activo) t = setTimeout(consultar, INTERVALO_ESTADO_MS);
    };
    t = setTimeout(consultar, INTERVALO_ESTADO_MS);
    return () => { activo = false; clearTimeout(t); };
  }, [abierto, enlace, vencido, ruta]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace.url);
      enqueueSnackbar("Enlace copiado.", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo copiar; selecciona el enlace y cópialo.", { variant: "warning" });
    }
  };

  if (sinMigracion) {
    return (
      <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        «Continuar desde el celular» aún no está disponible (falta una actualización del sistema). Puedes registrar el rostro con la cámara de esta computadora.
      </p>
    );
  }

  return (
    <>
      <button type="button" onClick={generar} disabled={generando}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#2563EB] bg-white px-4 text-sm font-semibold text-[#2563EB] hover:bg-blue-50 disabled:opacity-60">
        <Smartphone className="size-4" aria-hidden="true" />{generando ? "Generando enlace…" : "Continuar desde el celular"}
      </button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[92dvh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-md" data-rostro-celular>
          <DialogTitle className="pr-6 text-lg font-bold">Registrar el rostro desde el celular</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Pide a {quien} que escanee este código con la cámara de su celular. Ahí acepta el aviso y toma su rostro. Esta pantalla se actualiza sola.
          </DialogDescription>
          {enlace ? (
            <div className="grid gap-4">
              <div className={`relative mx-auto aspect-square w-full max-w-[17rem] rounded-xl border border-slate-200 bg-white p-2 ${vencido ? "opacity-20" : ""}`}>
                <CodigoQr texto={enlace.url} />
              </div>
              {vencido ? (
                <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">El enlace venció. Genera otro para continuar.</p>
              ) : (
                <p className="text-center text-sm text-slate-600" aria-live="off">
                  Vence en <b className="font-semibold tabular-nums text-slate-900" data-cuenta>{cuentaRegresiva(restantes)}</b> · sirve una sola vez
                </p>
              )}
              <div className="grid gap-1.5">
                <label htmlFor="enlace-rostro" className="text-xs font-medium text-slate-500">O comparte el enlace</label>
                <div className="flex min-w-0 gap-2">
                  <input id="enlace-rostro" readOnly value={enlace.url} onFocus={(e) => e.target.select()}
                    className="min-h-11 min-w-0 flex-1 truncate rounded-lg border border-slate-300 bg-slate-50 px-3 font-mono text-xs text-slate-700" />
                  <button type="button" onClick={copiar} disabled={vencido} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
                    <Copy className="size-4" aria-hidden="true" />Copiar
                  </button>
                </div>
              </div>
              <p role="status" className="sr-only">{vencido ? "El enlace venció." : `Esperando a que ${quien} registre su rostro.`}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  {!vencido ? <span className="size-2 animate-pulse rounded-full bg-[#2563EB] motion-reduce:animate-none" aria-hidden="true" /> : null}
                  {vencido ? "Sin enlace vigente" : "Esperando el registro…"}
                </span>
                <button type="button" onClick={generar} disabled={generando}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold disabled:opacity-60 ${vencido ? "bg-[#2563EB] text-white hover:bg-[#1d4ed8]" : "border border-slate-300 text-slate-800 hover:bg-slate-50"}`}>
                  <RefreshCw className="size-4" aria-hidden="true" />{generando ? "Generando…" : "Generar otro"}
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
