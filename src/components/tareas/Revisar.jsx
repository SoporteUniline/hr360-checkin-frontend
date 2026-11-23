"use client";

// Revisar checklists enviados (prototipo 23/11/2026): el jefe ve cada punto (con su foto) y lo marca como cumple o no
// cumple; la calificación se recalcula con el peso de cada punto. Aprobar, o regresar para corregir con comentario.
import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { calificar, cumplimientoPorPersona, fotoVigente } from "@/lib/tareas/reglas.mjs";
import { masDias } from "@/lib/tareas/demo.mjs";
import { useTareas } from "./store";
import { Avatar, botonSecundario, campo, colorCalificacion, fechaDia } from "./comun";

function Panel({ envio, alTerminar }) {
  const { checklist, persona, despachar, envios, hoy } = useTareas();
  const ck = checklist(envio.checklist);
  const [marcas, setMarcas] = useState(() => ({ ...envio.marcas }));
  const [comentario, setComentario] = useState("");
  const calif = calificar(ck.puntos, marcas);
  const p = persona(envio.persona);
  const historial = cumplimientoPorPersona(envios.filter((e) => e.persona === envio.persona), { desde: masDias(hoy, -7), hasta: masDias(hoy, -1) })[0];
  const noCumplen = ck.puntos.filter((pt) => !marcas[pt.id]).length;
  const listoRegresar = comentario.trim().length > 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar persona={p} tam="size-10" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-extrabold text-[#080d36]">{ck.nombre} · {p.sucursal}</h3>
          <p className="text-[13px] text-slate-600">Lo envió <b>{p.nombre}</b> {fechaDia(envio.fecha, hoy).toLowerCase()} a las {envio.hora} {envio.aTiempo ? <span className="font-semibold text-green-700">(a tiempo)</span> : <span className="font-semibold text-amber-700">(tarde: límite {ck.hora})</span>}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center">
          <p className={`text-2xl font-extrabold tabular-nums ${colorCalificacion(calif)}`}>{calif}%</p>
          <p className="text-[11.5px] text-slate-500">calificación</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {ck.puntos.map((pt) => {
          const ok = Boolean(marcas[pt.id]);
          return (
            <li key={pt.id} className={`flex flex-wrap items-center gap-3 px-3.5 py-2.5 ${ok ? "" : "bg-red-50/60"}`}>
              <span className="min-w-0 flex-[1_1_220px] text-sm">
                {pt.texto}
                <span className="ml-2 text-[11px] font-semibold text-slate-400">peso {pt.peso}{pt.obligatorio ? " · obligatorio" : ""}</span>
              </span>
              {pt.pideFoto ? (envio.fotos?.[pt.id]
                ? (fotoVigente(envio.fecha, hoy) ? <span className="grid h-11 w-16 place-items-center rounded-md bg-slate-300 text-[10px] text-slate-700">Foto</span> : <span className="text-[11px] text-slate-400">Foto borrada (más de 3 meses)</span>)
                : <span className="text-[11.5px] font-semibold text-amber-700">Sin foto</span>) : null}
              <span className="flex overflow-hidden rounded-lg border border-slate-200" role="group" aria-label={`¿Cumple «${pt.texto}»?`}>
                <button type="button" aria-pressed={ok} onClick={() => setMarcas((m) => ({ ...m, [pt.id]: true }))} className={`inline-flex min-h-9 items-center gap-1 px-2.5 text-[12.5px] font-semibold ${ok ? "bg-green-600 text-white" : "bg-white text-slate-600"}`}><Check className="size-3.5" /> Cumple</button>
                <button type="button" aria-pressed={!ok} onClick={() => setMarcas((m) => ({ ...m, [pt.id]: false }))} className={`inline-flex min-h-9 items-center gap-1 px-2.5 text-[12.5px] font-semibold ${!ok ? "bg-red-600 text-white" : "bg-white text-slate-600"}`}><X className="size-3.5" /> No cumple</button>
              </span>
            </li>
          );
        })}
        {envio.nota ? <li className="bg-slate-50 px-3.5 py-2.5 text-sm"><b>Nota de {p.nombre.split(" ")[0]}:</b> {envio.nota}</li> : null}
      </ul>
      <label className="block text-[12.5px] font-semibold text-slate-700">Comentario para {p.nombre.split(" ")[0]} {noCumplen ? "(obligatorio si lo regresas)" : "(opcional)"}
        <textarea rows={2} className={`mt-1 ${campo} h-auto py-2`} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej. La foto del refrigerador no muestra el termómetro." />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {historial ? <p className="text-[12.5px] text-slate-500">Últimos 7 días: {historial.promedio ?? "—"}% promedio · {historial.aTiempo} a tiempo · {historial.tarde} tarde · {historial.noEnviados} sin enviar</p> : null}
        <span className="ml-auto flex gap-2">
          <button type="button" className={botonSecundario} disabled={!listoRegresar} onClick={() => { despachar({ tipo: "revisar", id: envio.id, marcas, aprobar: false, comentario }); alTerminar(`Regresado a ${p.nombre.split(" ")[0]} con tu comentario.`); }}>Regresar para corregir</button>
          <button type="button" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700" onClick={() => { despachar({ tipo: "revisar", id: envio.id, marcas, aprobar: true, comentario }); alTerminar(`Aprobado con ${calif}%.`); }}><Check className="size-4" /> Aprobar con {calif}%</button>
        </span>
      </div>
    </div>
  );
}

export default function Revisar() {
  const { envios, checklist, persona, hoy } = useTareas();
  const pendientes = useMemo(() => envios.filter((e) => e.estado === "por_revisar").sort((a, b) => a.fecha.localeCompare(b.fecha)), [envios]);
  const [elegido, setElegido] = useState(null);
  const [aviso, setAviso] = useState("");
  const actual = pendientes.find((e) => e.id === elegido) ?? pendientes[0];
  if (!pendientes.length) return (
    <div className="space-y-3">
      {aviso ? <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{aviso}</p> : null}
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-semibold">No hay checklists por revisar</p><p className="text-sm text-slate-500">Cuando alguien envíe uno, aparece aquí.</p></div>
    </div>
  );
  return (
    <div className="space-y-3">
      {aviso ? <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{aviso}</p> : null}
      <div className="flex flex-wrap items-start gap-4">
        <ul aria-label="Por revisar" className="min-w-0 flex-[1_1_260px] space-y-2">
          {pendientes.map((e) => {
            const p = persona(e.persona);
            return (
              <li key={e.id}>
                <button type="button" aria-current={e.id === actual?.id ? "true" : undefined} onClick={() => setElegido(e.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border bg-white p-3 text-left ${e.id === actual?.id ? "border-brand ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"}`}>
                  <Avatar persona={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{checklist(e.checklist).nombre}</span>
                    <span className="block text-[12px] text-slate-500">{p.nombre} · {fechaDia(e.fecha, hoy)} {e.hora}{e.aTiempo ? "" : " · tarde"}</span>
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${colorCalificacion(e.calificacion)}`}>{e.calificacion}%</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="min-w-0 flex-[999_1_620px]">{actual ? <Panel key={actual.id} envio={actual} alTerminar={(t) => { setAviso(t); setElegido(null); }} /> : null}</div>
      </div>
    </div>
  );
}
