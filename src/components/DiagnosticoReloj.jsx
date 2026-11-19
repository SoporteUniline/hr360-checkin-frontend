"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { diagnosticoActivo, fijarDiagnostico, instalarDiagnostico } from "@/lib/diagnostico-reloj";

const seg = (ms) => (ms == null ? "…" : `${(ms / 1000).toFixed(1)} s`);
const esPantallaReloj = (p) =>
  !!p && (p.includes("reloj") || p === "/seleccionar-reloj");

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

// Panel flotante del modo diagnóstico. Solo existe si el diagnóstico está activo.
export default function DiagnosticoReloj() {
  const pathname = usePathname();
  const [api, setApi] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [, setTick] = useState(0);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (diagnosticoActivo()) setApi(instalarDiagnostico());
  }, []);

  useEffect(() => {
    if (!api) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [api]);

  if (!api) return null;
  const actual = api.actual();
  if (!actual && !esPantallaReloj(pathname)) return null;

  const historial = api.historial();
  const ultimo = actual || historial[0] || null;
  const vivo = actual ? seg(api.ahora() - (actual.contexto?.ms_desde_carga_app ?? api.ahora())) : null;
  const decir = (t) => { setAviso(t); setTimeout(() => setAviso(""), 2500); };

  const compartir = async () => {
    const texto = api.texto(ultimo);
    try {
      if (navigator.share) { await navigator.share({ title: "Diagnóstico reloj", text: texto }); return; }
    } catch { /* cancelado */ }
    decir((await copiar(texto)) ? "Reporte copiado" : "No se pudo copiar");
  };

  return (
    <div
      className="fixed z-[9999] right-3 text-left"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)", maxWidth: "calc(100vw - 24px)" }}
    >
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rounded-full bg-slate-900/90 px-4 py-2 text-xs font-bold text-white shadow-lg"
        >
          Diagnóstico {actual ? `· midiendo ${vivo}` : ultimo ? `· último ${seg(ultimo.total_ms)}` : ""}
        </button>
      ) : (
        <div className="w-[min(380px,calc(100vw-24px))] max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-2xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <b className="text-sm text-slate-900">Diagnóstico del reloj</b>
            <button type="button" onClick={() => setAbierto(false)} className="rounded-lg px-2 py-1 text-slate-500" aria-label="Cerrar">✕</button>
          </div>

          {ultimo ? (
            <>
              <div className="mb-2 rounded-lg bg-slate-50 p-2">
                <div><b>{actual ? "Midiendo ahora" : ultimo.resultado}</b> · total {seg(ultimo.total_ms)}</div>
                <div>Cuello de botella: <b className="text-rose-600">{ultimo.cuello_de_botella || "—"}</b></div>
              </div>
              <table className="w-full">
                <tbody>
                  {ultimo.fases.map((f) => (
                    <tr key={f.fase} className={f.fase === ultimo.cuello_de_botella ? "font-bold text-rose-600" : ""}>
                      <td className="py-0.5 pr-2">{f.fase}</td>
                      <td className="py-0.5 text-right tabular-nums">{f.incompleta ? "en curso" : seg(f.ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ultimo.contadores?.analisis && (
                <p className="mt-2">
                  Análisis de cuadros: {ultimo.contadores.analisis.veces} · prom. {ultimo.contadores.analisis.promedio_ms} ms · máx. {ultimo.contadores.analisis.max_ms} ms
                </p>
              )}
            </>
          ) : (
            <p>Abre la cámara de reconocimiento facial para medir.</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={compartir} className="rounded-lg bg-blue-600 px-3 py-2 font-bold text-white">Compartir reporte</button>
            <button type="button" onClick={async () => decir((await copiar(JSON.stringify(historial, null, 2))) ? "Historial copiado" : "No se pudo copiar")} className="rounded-lg border border-slate-200 px-3 py-2 font-bold">Copiar todo (JSON)</button>
            <button type="button" onClick={() => { api.borrar(); decir("Historial borrado"); }} className="rounded-lg border border-slate-200 px-3 py-2 font-bold">Borrar</button>
            <button type="button" onClick={() => { fijarDiagnostico(false); window.location.reload(); }} className="rounded-lg border border-slate-200 px-3 py-2 font-bold">Apagar</button>
          </div>
          {aviso && <p className="mt-2 font-bold text-emerald-700" role="status">{aviso}</p>}

          {historial.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-2">
              <b>Últimas mediciones (guardadas en este equipo)</b>
              <ul className="mt-1 space-y-1">
                {historial.slice(0, 10).map((r) => (
                  <li key={r.id} className="flex justify-between gap-2">
                    <span className="truncate">{new Date(r.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short", hourCycle: "h12" })} · {r.resultado}</span>
                    <span className="shrink-0 tabular-nums">{seg(r.total_ms)} {r.enviado ? "✓" : "⏳"}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-slate-400">✓ enviado al servidor · ⏳ pendiente de enviar</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
