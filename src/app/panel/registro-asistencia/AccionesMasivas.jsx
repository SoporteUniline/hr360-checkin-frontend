"use client";

// Acciones masivas de Asistencias (maqueta aprobada 19/11/2026): barra flotante cuando hay filas
// elegidas y una ventana por acción con vista previa (antes → después, y a quién se omite y por qué).
// Lógica: lib/asistencia/masivo.mjs. Guardado: el mismo PUT de la edición de una fila (historial,
// checada original y «Deshacer»); la comida usa POST /asistencias/:id/comida.

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FORMAS_PAGO, FORMA_PAGO_DEFAULT } from "@/lib/asistencia/horasExtra.mjs";
import { ACCIONES_MASIVAS } from "@/lib/asistencia/masivo.mjs";

const INICIAL = {
  hora: { campo: "salida", modo: "horario", hora: "17:00", horaEntrada: "09:00", horaSalida: "18:00" },
  tipo: { idTipo: "", nota: "" },
  comida: { modo: "horario", de: "13:00", a: "13:30" },
  nota: { texto: "", modo: "agregar" },
  extra: { decision: "autorizar", forma: FORMA_PAGO_DEFAULT, nota: "" },
};
const BOTONES = [
  ["hora", "Corregir entrada / salida"],
  ["tipo", "Tipo de registro"],
  ["comida", "Agregar comida"],
  ["nota", "Observación"],
];
const campo = "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

function Opcion({ name, value, actual, onChange, children }) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-700">
      <input type="radio" name={name} value={value} checked={actual === value} onChange={() => onChange(value)} className="h-4 w-4 accent-blue-600" />
      {children}
    </label>
  );
}

export default function AccionesMasivas({ filas, tiposPermiso, zonaDe, hx, onLimpiar, onGuardado }) {
  const { enqueueSnackbar } = useSnackbar();
  const [accion, setAccion] = useState(null);
  const [opciones, setOpciones] = useState(INICIAL);
  const [aplicando, setAplicando] = useState(false);
  useEffect(() => { if (accion) setOpciones(INICIAL); }, [accion]);

  // useTiposPermisoData devuelve { tiposPermiso: [...] } (igual que en la edición de una fila).
  const tipos = useMemo(() => (Array.isArray(tiposPermiso) ? tiposPermiso : tiposPermiso?.tiposPermiso ?? []), [tiposPermiso]);
  const op = accion ? opciones[accion] : null;
  const set = (k, v) => setOpciones((o) => ({ ...o, [accion]: { ...o[accion], [k]: v } }));

  const plan = useMemo(() => {
    if (!accion) return null;
    const def = ACCIONES_MASIVAS[accion];
    const extra = {
      zonaDe,
      ...(accion === "tipo" ? { tipo: tipos.find((t) => String(t.id) === String(op.idTipo)) } : {}),
      ...(accion === "extra" ? { idAutorizador: hx.usuario.idEmpleado, quien: hx.usuario.nombre } : {}),
    };
    return def.plan(filas, { ...op, ...extra });
  }, [accion, op, filas, zonaDe, tipos, hx.usuario.idEmpleado, hx.usuario.nombre]);

  if (!filas.length && !accion) return null;

  const nombre = (r) => `${r.nombre ?? ""} ${r.apellido_paterno ?? ""}`.trim();
  const fecha = (r) => dayjs(String(r.fecha).slice(0, 10)).format("DD/MM/YYYY");

  const aplicar = async () => {
    if (!plan?.aplicar.length) return;
    setAplicando(true);
    try {
      if (accion === "comida") {
        const errores = [];
        for (let i = 0; i < plan.aplicar.length; i += 4) {
          const lote = plan.aplicar.slice(i, i + 4);
          const res = await Promise.allSettled(lote.map((a) => axios.post(`/checador/asistencias/${a.registro.id}/comida`, a.comida)));
          res.forEach((r, j) => r.status === "rejected" && errores.push(`${nombre(lote[j].registro)}: ${r.reason?.response?.data?.message || "error"}`));
        }
        await onGuardado?.();
        const ok = plan.aplicar.length - errores.length;
        if (ok) enqueueSnackbar(`Comida agregada a ${ok} ${ok === 1 ? "registro" : "registros"}. La checada original se conserva.`, { variant: "success" });
        if (errores.length) enqueueSnackbar(`No se pudo agregar la comida a ${errores.length}: ${errores.slice(0, 3).join(" · ")}`, { variant: "error" });
      } else {
        const n = plan.aplicar.length;
        const textos = {
          hora: `${n} ${n === 1 ? "registro corregido" : "registros corregidos"}.`,
          tipo: `${n} ${n === 1 ? "registro cambiado" : "registros cambiados"} de tipo.`,
          nota: `Observación agregada a ${n} ${n === 1 ? "registro" : "registros"}.`,
          extra: op.decision === "no" ? `${n} no autorizadas.` : `${n} ${n === 1 ? "autorizada" : "autorizadas"}.`,
        };
        await hx.guardar(plan.aplicar.map(({ registro, cambios }) => ({ registro, cambios })), textos[accion]);
      }
      setAccion(null);
    } finally {
      setAplicando(false);
    }
  };

  const formulario = () => {
    if (accion === "hora") return (
      <>
        <div className="flex flex-wrap gap-5">
          <Opcion name="cual" value="salida" actual={op.campo} onChange={(v) => set("campo", v)}>Salida</Opcion>
          <Opcion name="cual" value="entrada" actual={op.campo} onChange={(v) => set("campo", v)}>Entrada</Opcion>
          <Opcion name="cual" value="ambas" actual={op.campo} onChange={(v) => set("campo", v)}>Entrada y salida</Opcion>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <Opcion name="como" value="horario" actual={op.modo} onChange={(v) => set("modo", v)}>La de su horario</Opcion>
          <Opcion name="como" value="otra" actual={op.modo} onChange={(v) => set("modo", v)}>
            {op.campo === "ambas" ? (
              <>
                Otras: entra
                <input type="time" aria-label="Hora de entrada" className={campo} value={op.horaEntrada} onFocus={() => set("modo", "otra")} onChange={(e) => set("horaEntrada", e.target.value)} />
                sale
                <input type="time" aria-label="Hora de salida" className={campo} value={op.horaSalida} onFocus={() => set("modo", "otra")} onChange={(e) => set("horaSalida", e.target.value)} />
              </>
            ) : (
              <>
                Otra hora
                <input type="time" aria-label="Hora" className={campo} value={op.hora} onFocus={() => set("modo", "otra")} onChange={(e) => set("hora", e.target.value)} />
              </>
            )}
          </Opcion>
        </div>
        <p className="text-xs text-slate-500">Para quien olvidó checar o las salidas que el sistema cerró solo. Si no hay ninguna checada del día, usa «Entrada y salida»: así queda también el registro del reloj (corregido). La checada real, si existe, se conserva en el historial.</p>
      </>
    );
    if (accion === "tipo") return (
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Nuevo tipo
          <select aria-label="Nuevo tipo" className={campo} value={op.idTipo} onChange={(e) => set("idTipo", e.target.value)}>
            <option value="">Elige…</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Nota (opcional, se agrega a sus observaciones)
          <input aria-label="Nota" className={campo} value={op.nota} maxLength={200} onChange={(e) => set("nota", e.target.value)} placeholder="Ej. paro técnico de línea 2" />
        </label>
        <p className="text-xs text-slate-500 sm:col-span-2">Asistió y Goce de sueldo se ponen según el tipo, igual que al editar un registro.</p>
      </div>
    );
    if (accion === "comida") return (
      <>
        <div className="flex flex-wrap items-center gap-5">
          <Opcion name="comida" value="horario" actual={op.modo} onChange={(v) => set("modo", v)}>La comida de su horario</Opcion>
          <Opcion name="comida" value="otra" actual={op.modo} onChange={(v) => set("modo", v)}>
            Otra: de
            <input type="time" aria-label="Salida a comer" className={campo} value={op.de} onFocus={() => set("modo", "otra")} onChange={(e) => set("de", e.target.value)} />
            a
            <input type="time" aria-label="Regreso de comida" className={campo} value={op.a} onFocus={() => set("modo", "otra")} onChange={(e) => set("a", e.target.value)} />
          </Opcion>
        </div>
        <p className="text-xs text-slate-500">Solo a quien no checó salida a comer. Se descuenta del tiempo trabajado; la checada del reloj no cambia. Esta acción no tiene «Deshacer» en bloque.</p>
      </>
    );
    if (accion === "nota") return (
      <>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Observación
          <input aria-label="Observación" className={campo} value={op.texto} maxLength={250} onChange={(e) => set("texto", e.target.value)} placeholder="Ej. corte de luz 15:30–16:00, salida autorizada por gerencia" />
        </label>
        <div className="flex flex-wrap gap-5">
          <Opcion name="modo" value="agregar" actual={op.modo} onChange={(v) => set("modo", v)}>Agregar al final de lo que ya tiene</Opcion>
          <Opcion name="modo" value="reemplazar" actual={op.modo} onChange={(v) => set("modo", v)}>Reemplazar</Opcion>
        </div>
      </>
    );
    return (
      <>
        <div className="flex flex-wrap gap-5">
          <Opcion name="dec" value="autorizar" actual={op.decision} onChange={(v) => set("decision", v)}>Autorizar</Opcion>
          <Opcion name="dec" value="no" actual={op.decision} onChange={(v) => set("decision", v)}>No autorizar (queda la constancia; si se quedó después de su horario, la salida pasa a la del horario)</Opcion>
        </div>
        {op.decision === "autorizar" && (
          <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
              Forma de pago
              <select aria-label="Forma de pago" className={campo} value={op.forma} onChange={(e) => set("forma", e.target.value)}>
                {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
              Nota (opcional)
              <input aria-label="Nota de horas extra" className={campo} value={op.nota} maxLength={200} onChange={(e) => set("nota", e.target.value)} placeholder="Ej. inventario" />
            </label>
          </div>
        )}
      </>
    );
  };

  const n = filas.length;
  return (
    <>
      {n > 0 && (
        <div role="region" aria-label="Acciones para los seleccionados"
          className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-slate-900 py-2 pl-4 pr-2 text-sm text-white shadow-[0_18px_40px_rgba(15,23,42,0.35)]">
          <b>{n} {n === 1 ? "seleccionado" : "seleccionados"}</b>
          <button type="button" onClick={onLimpiar} className="px-1 text-xs text-slate-400 underline hover:text-white">Quitar selección</button>
          <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden />
          {BOTONES.map(([k, t]) => (
            <button key={k} type="button" onClick={() => setAccion(k)} disabled={hx.guardando}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50">{t}</button>
          ))}
          <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden />
          <button type="button" onClick={() => setAccion("extra")} disabled={hx.guardando}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">✓ Horas extra</button>
        </div>
      )}

      <Dialog open={Boolean(accion)} onOpenChange={(v) => { if (!v && !aplicando) setAccion(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[820px]">
          <DialogHeader>
            <DialogTitle>{accion ? ACCIONES_MASIVAS[accion].titulo : ""}</DialogTitle>
            <DialogDescription>{n} {n === 1 ? "registro seleccionado" : "registros seleccionados"}</DialogDescription>
          </DialogHeader>
          {accion && (
            <>
              <div className="flex flex-col gap-3">{formulario()}</div>
              <h4 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vista previa</h4>
              {plan?.error ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{plan.error}</p>
              ) : (
                <div className="max-h-[40vh] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-[13px] tabular-nums" aria-label="Vista previa">
                    <thead className="sticky top-0 bg-slate-50 text-left text-[10.5px] uppercase tracking-wide text-slate-500">
                      <tr><th className="px-3 py-2">Empleado</th><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Antes</th><th className="px-1 py-2" aria-hidden /><th className="px-3 py-2">Después</th></tr>
                    </thead>
                    <tbody>
                      {plan?.aplicar.map((a) => (
                        <tr key={a.registro.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-semibold text-slate-900">{nombre(a.registro)}</td>
                          <td className="whitespace-nowrap px-3 py-2">{fecha(a.registro)}</td>
                          <td className="max-w-[220px] truncate px-3 py-2 text-slate-500" title={a.antes}>{a.antes}</td>
                          <td className="px-1 py-2 text-slate-400" aria-hidden>→</td>
                          <td className="max-w-[260px] truncate px-3 py-2 font-semibold text-slate-900" title={a.despues}>{a.despues}</td>
                        </tr>
                      ))}
                      {plan?.omitir.map((o) => (
                        <tr key={o.registro.id} className="border-t border-slate-100 italic text-slate-400">
                          <td className="px-3 py-2">{nombre(o.registro)}</td>
                          <td className="whitespace-nowrap px-3 py-2">{fecha(o.registro)}</td>
                          <td colSpan={3} className="px-3 py-2">Se omite: {o.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-500">
                  {plan?.error ? "" : `Se aplica a ${plan?.aplicar.length ?? 0}${plan?.omitir.length ? ` · se omiten ${plan.omitir.length}` : ""} · queda en el historial de cada registro`}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAccion(null)} disabled={aplicando}>Cancelar</Button>
                  <Button onClick={aplicar} disabled={aplicando || !plan?.aplicar.length} className="bg-blue-600 text-white hover:bg-blue-700">
                    {aplicando ? "Aplicando…" : plan?.aplicar.length ? `Aplicar a ${plan.aplicar.length}` : "Nada que aplicar"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
