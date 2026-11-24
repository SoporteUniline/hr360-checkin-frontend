"use client";

// Barra de Asistencias al elegir filas: «Marcar como…» (solo a quien no tiene checadas vivas) y «Cargar horario
// normal…» (a quien no checó o no tiene salida). Motivo obligatorio; muestra cuántos aplican y cuántos se omiten.
// POST /checador/asistencias/masivo/estado-dia y /masivo/horario-normal. Las horas se corrigen en el reloj de cada fila.
import { useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { planMasivo, tiposEstadoDia } from "@/lib/asistencia/relojDia.mjs";
import { avisosRespuesta } from "@/lib/actasEstatus.mjs";

const CAMPO = "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[14px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 max-sm:h-11 max-sm:text-base";
const nombre = (r) => `${r.nombre ?? ""} ${r.apellido_paterno ?? ""}`.trim();

export default function AccionesMasivas({ filas, tiposPermiso, onLimpiar, onGuardado }) {
  const { enqueueSnackbar } = useSnackbar();
  const [accion, setAccion] = useState(null); // "estado" | "horario"
  const [idTipo, setIdTipo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [aplicando, setAplicando] = useState(false);
  const tipos = useMemo(() => tiposEstadoDia(tiposPermiso), [tiposPermiso]);
  const plan = useMemo(() => (accion ? planMasivo(filas, accion) : null), [accion, filas]);
  if (!filas.length && !accion) return null;

  const abrir = (a) => { setAccion(a); setIdTipo(""); setMotivo(""); };
  const bloqueado = aplicando || !plan?.aplican.length || !motivo.trim() || (accion === "estado" && !idTipo);
  const aplicar = async () => {
    if (bloqueado) return;
    setAplicando(true);
    try {
      const ids = plan.aplican.map((f) => f.id);
      const res = accion === "estado"
        ? await axios.post("/checador/asistencias/masivo/estado-dia", { ids, id_tipo_permiso: Number(idTipo), motivo: motivo.trim() })
        : await axios.post("/checador/asistencias/masivo/horario-normal", { ids, motivo: motivo.trim() });
      const aplicados = res.data?.aplicados ?? ids.length;
      const omitidos = Array.isArray(res.data?.omitidos) ? res.data.omitidos : [];
      enqueueSnackbar(`Aplicado a ${aplicados}${omitidos.length ? ` · se omitieron ${omitidos.length}` : ""}. Queda en el historial con tu nombre y el motivo.`,
        { variant: omitidos.length ? "warning" : "success" });
      // Avisos del servidor (p. ej. actas en borrador creadas por faltas injustificadas).
      for (const a of avisosRespuesta(res.data)) enqueueSnackbar(a, { variant: "info" });
      await onGuardado?.();
      setAccion(null);
      onLimpiar?.();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || e?.response?.data?.message || "No se pudo aplicar a las filas elegidas.", { variant: "error" });
    } finally {
      setAplicando(false);
    }
  };

  const n = filas.length;
  return (
    <>
      {n > 0 && (
        <div role="region" aria-label="Acciones para los seleccionados"
          className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-2xl bg-[#080d36] py-2 pl-4 pr-2 text-sm text-white shadow-[0_18px_40px_rgba(15,23,42,0.35)]">
          <b>{n} {n === 1 ? "seleccionada" : "seleccionadas"}</b>
          <button type="button" onClick={onLimpiar} className="px-1 text-xs text-slate-300 underline hover:text-white">Quitar selección</button>
          <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden />
          <button type="button" onClick={() => abrir("estado")} className="min-h-9 rounded-lg bg-slate-800 px-3.5 text-[13px] font-semibold text-slate-100 hover:bg-slate-700">Marcar como…</button>
          <button type="button" onClick={() => abrir("horario")} className="min-h-9 rounded-lg bg-blue-600 px-3.5 text-[13px] font-semibold text-white hover:bg-blue-500">Cargar horario normal…</button>
        </div>
      )}

      <Dialog open={Boolean(accion)} onOpenChange={(v) => { if (!v && !aplicando) setAccion(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-[520px]" data-masivo={accion ?? ""}>
          <DialogHeader>
            <DialogTitle className="text-[18px]">{accion === "estado" ? "Marcar como…" : "Cargar horario normal"}</DialogTitle>
            <DialogDescription className="text-[13.5px]">
              {accion === "estado"
                ? "Solo a quienes no tienen checadas. Quien sí checó se corrige en su reloj."
                : "A quienes no checaron o no tienen salida. Se agrega en su reloj como registro corregido."}
            </DialogDescription>
          </DialogHeader>
          {accion === "estado" ? (
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-slate-600">Estado
              <select aria-label="Estado para los seleccionados" className={CAMPO} value={idTipo} onChange={(e) => setIdTipo(e.target.value)}>
                <option value="">Elige…</option>
                {tipos.map((t) => <option key={t.id} value={String(t.id)}>{t.nombre}</option>)}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-slate-600">Motivo (obligatorio)
            <input aria-label="Motivo (obligatorio)" className={CAMPO} value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. falla del reloj, evento, cita médica…" />
          </label>
          <div data-masivo-resumen className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-700">
            <p>Se aplica a <b>{plan?.aplican.length ?? 0}</b> de {n} {n === 1 ? "seleccionada" : "seleccionadas"}{plan?.omitidos.length ? ` · se omiten ${plan.omitidos.length}` : ""}.</p>
            {plan?.omitidos.length ? (
              <ul className="mt-1.5 max-h-32 list-disc overflow-y-auto pl-5 text-[12.5px] text-slate-500">
                {plan.omitidos.map((o) => <li key={o.fila.id}>{nombre(o.fila)}: {o.razon}</li>)}
              </ul>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAccion(null)} disabled={aplicando}
              className="h-9 rounded-lg border border-slate-200 px-3.5 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50 max-sm:h-11">Cancelar</button>
            <button type="button" onClick={aplicar} disabled={bloqueado}
              className="h-9 rounded-lg bg-blue-600 px-4 text-[13.5px] font-semibold text-white hover:bg-blue-700 disabled:opacity-45 max-sm:h-11">
              {aplicando ? "Aplicando…" : `Aplicar a ${plan?.aplican.length ?? 0}`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
