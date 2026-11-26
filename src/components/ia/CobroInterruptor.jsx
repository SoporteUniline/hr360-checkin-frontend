"use client";

// Interruptor del cobro de Adamia AI (25/12/2026) · tarjeta arriba de /dashboard/creditos-ia. El dueño (administrador de
// ADAMIA) enciende o apaga el cobro sin depender de la variable del servidor. El servidor decide (services/ia/interruptorCobro):
// IA_COBRO_CREDITOS=false lo apaga siempre (freno de emergencia), =true lo enciende, sin ella manda este panel.
// Encender: el servidor manda advertencias (sin tipo de cambio bloquea; empresas sin bienvenida; webhook de Stripe) y exige
// escribir ENCENDER y un motivo. Cada cambio queda en la bitácora (historial abajo).
import { useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { CircleAlert, History, Info, Loader2, Power, PowerOff, TriangleAlert } from "lucide-react";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CONFIRMACION_ENCENDER, advertenciasOrdenadas, cuerpoCobro, descripcionCambioCobro, estadoCobro, puedeConfirmarCobro,
} from "@/lib/ia/creditos.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const errorDe = (e, d) => e?.response?.data?.error || d;
const caja = "rounded-2xl border border-slate-200 bg-white p-4 sm:p-5";
const boton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-60";
const fecha = (f) => {
  if (!f) return "";
  const t = String(f);
  const d = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(t) ? t : `${t.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? t : d.toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const NIVEL = {
  bloquea: { caja: "border-red-200 bg-red-50 text-red-800", Icono: CircleAlert, etiqueta: "Bloquea" },
  advierte: { caja: "border-amber-200 bg-amber-50 text-amber-800", Icono: TriangleAlert, etiqueta: "Atención" },
  recordatorio: { caja: "border-blue-200 bg-blue-50 text-blue-800", Icono: Info, etiqueta: "Recordatorio" },
};

function Advertencias({ lista }) {
  const orden = advertenciasOrdenadas(lista);
  if (!orden.length) return null;
  return (
    <ul className="space-y-2" data-advertencias-cobro>
      {orden.map((a) => {
        const n = NIVEL[a.nivel] ?? NIVEL.recordatorio;
        return (
          <li key={a.codigo} className={`flex items-start gap-2 rounded-lg border p-2.5 text-[13px] ${n.caja}`} data-nivel={a.nivel}>
            <n.Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="min-w-0 break-words"><span className="font-semibold">{n.etiqueta}: </span>{a.texto}</p>
          </li>
        );
      })}
    </ul>
  );
}

function DialogoCobro({ activo, advertencias: inicial, alCerrar, alTerminar }) {
  const [motivo, setMotivo] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [advertencias, setAdvertencias] = useState(inicial ?? []);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const bloqueado = activo && advertencias.some((a) => a.nivel === "bloquea");
  const listo = puedeConfirmarCobro({ activo, confirmar, motivo, bloqueado });
  const enviar = async (e) => {
    e.preventDefault();
    if (!listo || enviando) return;
    setEnviando(true); setError("");
    try {
      const { data } = await axios.put("/checador/ia/admin/cobro", cuerpoCobro({ activo, confirmar, motivo }));
      await alTerminar(data);
    } catch (err) {
      setError(errorDe(err, "No se pudo cambiar el cobro."));
      if (Array.isArray(err?.response?.data?.advertencias)) setAdvertencias(err.response.data.advertencias);
    } finally { setEnviando(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !enviando) alCerrar(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg" data-dialogo-cobro>
        <DialogHeader>
          <DialogTitle>{activo ? "Encender el cobro de Adamia AI" : "Apagar el cobro de Adamia AI"}</DialogTitle>
          <DialogDescription>
            {activo ? "Desde ese momento cada consulta del panel descuenta créditos y, sin saldo, la IA se bloquea. Revisa las advertencias."
              : "Las consultas dejan de descontar créditos y no se bloquea a nadie por saldo. Los saldos se conservan."}
          </DialogDescription>
        </DialogHeader>
        <form id="form-cobro" onSubmit={enviar} className="space-y-3">
          {activo ? <Advertencias lista={advertencias} /> : null}
          <label className="block text-[12.5px] font-semibold text-slate-700">Motivo (queda en la bitácora)
            <textarea value={motivo} maxLength={300} rows={2} onChange={(e) => setMotivo(e.target.value)}
              placeholder={activo ? "Arranque del cobro aprobado" : "Pausa por revisión de precios"}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
          </label>
          {activo ? (
            <label className="block text-[12.5px] font-semibold text-slate-700">Escribe {CONFIRMACION_ENCENDER} para confirmar
              <input value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                disabled={bloqueado} className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm uppercase tracking-wide focus:border-brand focus:outline-none disabled:bg-slate-100" />
            </label>
          ) : null}
          {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
        </form>
        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" className={`${boton} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} disabled={enviando} onClick={alCerrar}>Cancelar</button>
          <button type="submit" form="form-cobro" disabled={!listo || enviando}
            className={`${boton} text-white ${activo ? "bg-emerald-700 hover:bg-emerald-800" : "bg-red-700 hover:bg-red-800"}`}>
            {enviando ? <Loader2 className="size-4 animate-spin" /> : activo ? <Power className="size-4" /> : <PowerOff className="size-4" />}
            {activo ? "Encender el cobro" : "Apagar el cobro"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CobroInterruptor({ alCambiar }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, error, mutate } = useSWR("/checador/ia/admin/cobro", get, { shouldRetryOnError: false });
  const [dialogo, setDialogo] = useState(null);
  if (error) {
    return <section aria-labelledby="titulo-cobro" className={caja}><h2 id="titulo-cobro" className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><Power className="size-4 text-brand" /> Cobro de Adamia AI</h2>
      <p role="alert" className="mt-2 text-[13px] text-amber-800">{errorDe(error, "No se pudo cargar el estado del cobro.")}</p></section>;
  }
  if (!data) return <section aria-labelledby="titulo-cobro" className={caja}><h2 id="titulo-cobro" className="text-[15px] font-bold text-slate-900">Cobro de Adamia AI</h2><p role="status" className="mt-1 text-[13px] text-slate-500">Cargando…</p></section>;
  const e = estadoCobro(data);
  const encendido = data.efectivo;
  const accion = !data.panel; // el botón cambia el valor del PANEL (true = encender)
  const alTerminar = async (r) => {
    setDialogo(null);
    enqueueSnackbar(r.sin_cambio ? "No hubo cambio: ya estaba así." : `Cobro ${r.panel ? "encendido" : "apagado"} en el panel.${r.panel !== r.efectivo ? " La variable del servidor manda: el efectivo no cambió." : ""}`,
      { variant: r.panel === r.efectivo ? "success" : "warning" });
    await mutate();
    await alCambiar?.();
  };
  return (
    <section aria-labelledby="titulo-cobro" className={`${caja} ${encendido ? "border-emerald-300" : ""}`} data-cobro-interruptor={e.tono}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="titulo-cobro" className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><Power className="size-4 text-brand" /> Cobro de Adamia AI</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span data-estado-cobro className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold ${encendido ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
              <span className={`size-2 rounded-full ${encendido ? "bg-emerald-600" : "bg-slate-400"}`} aria-hidden /> {e.etiqueta}
            </span>
            {e.forzado ? <span className="text-[12.5px] text-slate-500">En el panel: {data.panel ? "encendido" : "apagado"}</span> : null}
          </p>
          <p className="mt-1.5 text-[13px] text-slate-600">
            {encendido ? "El uso del panel descuenta créditos y, sin saldo, la IA se bloquea."
              : "Se mide todo, pero no se descuenta ni se bloquea. El cliente ve «Gratis por ahora: el cobro de Adamia AI aún no está activo»."}
          </p>
        </div>
        <button type="button" disabled={!data.migracion} onClick={async () => { await mutate(); setDialogo({ activo: accion }); }}
          className={`${boton} w-full sm:w-auto ${accion ? "bg-emerald-700 text-white hover:bg-emerald-800" : "border border-red-300 bg-white text-red-700 hover:bg-red-50"}`}>
          {accion ? <Power className="size-4" /> : <PowerOff className="size-4" />} {accion ? "Encender cobro" : "Apagar cobro"}
        </button>
      </div>
      {e.nota ? <p role="status" data-nota-variable className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[13px] text-amber-800"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{e.nota}</p> : null}
      {!data.migracion ? <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[13px] text-amber-800">Falta preparar la base de datos del interruptor (migración 20261225). Mientras, solo la variable del servidor lo enciende.</p> : null}
      {data.cambio ? <p className="mt-2 break-words text-[12.5px] text-slate-500" data-ultimo-cambio>Último cambio: {fecha(data.cambio.en)}{data.cambio.por ? ` · ${data.cambio.por}` : ""}{data.cambio.motivo ? ` · «${data.cambio.motivo}»` : ""}</p> : null}
      {data.historial?.length ? (
        <details className="mt-2 text-[12.5px] text-slate-600">
          <summary className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 font-semibold text-slate-700 sm:min-h-0"><History className="size-3.5" aria-hidden /> Historial de cambios ({data.historial.length})</summary>
          <ul className="mt-1 divide-y divide-slate-100" data-historial-cobro>
            {data.historial.map((h) => <li key={h.id} className="flex flex-wrap justify-between gap-x-3 py-1.5"><span className="min-w-0 break-words">{descripcionCambioCobro(h)}</span><span className="shrink-0 tabular-nums text-slate-500">{fecha(h.en)}</span></li>)}
          </ul>
        </details>
      ) : null}
      <p className="mt-2 text-[11.5px] text-slate-500">Si hay varias instancias del servidor, el cambio tarda hasta {data.cache_segundos ?? 30} s en llegar a todas.</p>
      {dialogo ? <DialogoCobro activo={dialogo.activo} advertencias={data.advertencias} alCerrar={() => setDialogo(null)} alTerminar={alTerminar} /> : null}
    </section>
  );
}
