"use client";

// Checklists (prototipo 23/11/2026): el dueño los crea una vez y se repiten (diario o semanal). Cada punto tiene peso
// (cuánto vale en la calificación), puede pedir foto y ser obligatorio. Se asignan por puesto o persona, con hora límite,
// y los revisa el jefe inmediato.
import { useState } from "react";
import { ArrowDown, ArrowUp, Camera, Plus, Trash2 } from "lucide-react";
import { useTareas } from "./store";
import { botonPrimario, botonSecundario, campo, etiqueta } from "./comun";

const FRECUENCIAS = ["Diario", "Cada lunes", "Cada viernes", "Una sola vez"];

function Editor({ inicial, alCerrar }) {
  const { despachar, personas } = useTareas();
  const [f, setF] = useState(() => inicial ?? {
    nombre: "", frecuencia: "Diario", hora: "09:00", aQuien: "Puesto: Encargado de turno", sucursal: "Todas", revisa: "Su jefe inmediato", soloSiCheco: true, personas: [],
    puntos: [{ texto: "", peso: 1, pideFoto: false, obligatorio: false }],
  });
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const punto = (i, k, val) => setF((v) => ({ ...v, puntos: v.puntos.map((p, j) => (j === i ? { ...p, [k]: val } : p)) }));
  const mover = (i, d) => setF((v) => { const ps = [...v.puntos]; const [x] = ps.splice(i, 1); ps.splice(i + d, 0, x); return { ...v, puntos: ps }; });
  const validos = f.puntos.filter((p) => p.texto.trim());
  const pesoTotal = validos.reduce((s, p) => s + (Number(p.peso) || 1), 0);
  const listo = f.nombre.trim() && validos.length;
  const puestos = [...new Set(personas.map((p) => p.puesto))];

  return (
    <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={(e) => {
      e.preventDefault(); if (!listo) return;
      const asignadas = f.aQuien.startsWith("Puesto: ") ? personas.filter((p) => p.puesto === f.aQuien.slice(8)).map((p) => p.id) : f.personas;
      despachar({ tipo: "guardarChecklist", checklist: { ...f, personas: asignadas, puntos: validos.map((p) => ({ ...p, peso: Number(p.peso) || 1 })) } });
      alCerrar();
    }}>
      <label className={etiqueta}>Nombre del checklist<input autoFocus className={`mt-1 ${campo} text-base font-semibold`} value={f.nombre} onChange={set("nombre")} placeholder="Ej. Apertura de restaurante" /></label>

      <fieldset>
        <legend className={`${etiqueta} flex w-full items-center`}>Puntos a revisar <span className="ml-auto font-normal text-slate-500">El peso dice cuánto vale cada punto en la calificación</span></legend>
        <div className="mt-1.5 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              <th className="px-2 py-1.5">Punto</th><th className="w-20 px-2">Peso</th><th className="w-24 px-2 text-center">Pide foto</th><th className="w-24 px-2 text-center">Obligatorio</th><th className="w-28 px-2 text-right">Vale</th><th className="w-28" />
            </tr></thead>
            <tbody>
              {f.puntos.map((p, i) => (
                <tr key={p.id ?? `n${i}`} className="border-t border-slate-100">
                  <td className="px-2 py-1.5"><input aria-label={`Punto ${i + 1}`} className={campo} value={p.texto} onChange={(e) => punto(i, "texto", e.target.value)} placeholder="Ej. Piso limpio y seco" /></td>
                  <td className="px-2"><input aria-label={`Peso del punto ${i + 1}`} type="number" min="1" max="10" className={campo} value={p.peso} onChange={(e) => punto(i, "peso", e.target.value)} /></td>
                  <td className="px-2 text-center"><input aria-label={`Pide foto en el punto ${i + 1}`} type="checkbox" className="size-4 accent-blue-600" checked={p.pideFoto} onChange={(e) => punto(i, "pideFoto", e.target.checked)} /></td>
                  <td className="px-2 text-center"><input aria-label={`Punto ${i + 1} obligatorio`} type="checkbox" className="size-4 accent-blue-600" checked={p.obligatorio} onChange={(e) => punto(i, "obligatorio", e.target.checked)} /></td>
                  <td className="px-2 text-right tabular-nums text-slate-600">{p.texto.trim() && pesoTotal ? `${Math.round(((Number(p.peso) || 1) / pesoTotal) * 1000) / 10}%` : "—"}</td>
                  <td className="px-1 text-right">
                    <button type="button" aria-label={`Subir punto ${i + 1}`} disabled={i === 0} onClick={() => mover(i, -1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="size-4" /></button>
                    <button type="button" aria-label={`Bajar punto ${i + 1}`} disabled={i === f.puntos.length - 1} onClick={() => mover(i, 1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="size-4" /></button>
                    <button type="button" aria-label={`Quitar punto ${i + 1}`} onClick={() => setF((v) => ({ ...v, puntos: v.puntos.filter((_, j) => j !== i) }))} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setF((v) => ({ ...v, puntos: [...v.puntos, { texto: "", peso: 1, pideFoto: false, obligatorio: false }] }))} className="mt-1.5 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand"><Plus className="size-4" /> Agregar punto</button>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={etiqueta}>¿A quién?
          <select className={`mt-1 ${campo}`} value={f.aQuien} onChange={set("aQuien")}>
            {puestos.map((p) => <option key={p} value={`Puesto: ${p}`}>Puesto: {p}</option>)}
          </select>
        </label>
        <label className={etiqueta}>¿Cada cuándo?
          <select className={`mt-1 ${campo}`} value={f.frecuencia} onChange={set("frecuencia")}>{FRECUENCIAS.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label className={etiqueta}>¿Antes de qué hora?<input type="time" className={`mt-1 ${campo}`} value={f.hora} onChange={set("hora")} /></label>
        <label className={etiqueta}>¿Quién lo revisa?
          <select className={`mt-1 ${campo}`} value={f.revisa} onChange={set("revisa")}><option>Su jefe inmediato</option><option>El dueño</option><option>Nadie, solo registrar</option></select>
        </label>
        <label className={etiqueta}>¿Dónde?
          <select className={`mt-1 ${campo}`} value={f.sucursal} onChange={set("sucursal")}><option>Todas</option><option>Centro</option><option>Norte</option></select>
        </label>
        <label className="flex min-h-10 items-end gap-2 pb-2 text-sm font-medium text-slate-700"><input type="checkbox" className="size-4 accent-blue-600" checked={f.soloSiCheco} onChange={set("soloSiCheco")} /> Solo los días que checó entrada</label>
      </div>

      <p className="rounded-lg bg-blue-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-blue-950">
        Así quedará: <b>{f.frecuencia === "Diario" ? "cada día que trabaje" : f.frecuencia.toLowerCase()}</b>, a quien tenga el {f.aQuien.toLowerCase()} {f.sucursal === "Todas" ? "en cada sucursal" : `en ${f.sucursal}`} le llega «{f.nombre || "este checklist"}» en su app y por correo. Lo llena antes de las <b>{f.hora}</b>, lo envía y <b>{f.revisa === "Nadie, solo registrar" ? "queda registrado" : `lo revisa ${f.revisa.toLowerCase()}`}</b>. Su calificación es el % de puntos que cumplen, según su peso.
      </p>
      <div className="flex justify-end gap-2"><button type="button" className={botonSecundario} onClick={alCerrar}>Cancelar</button><button type="submit" className={botonPrimario} disabled={!listo}>Guardar y asignar</button></div>
    </form>
  );
}

export default function Checklists() {
  const { checklists, envios, hoy } = useTareas();
  const [editando, setEditando] = useState(null); // null | "nuevo" | checklist
  if (editando) return <Editor inicial={editando === "nuevo" ? null : editando} alCerrar={() => setEditando(null)} />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button type="button" className={botonPrimario} onClick={() => setEditando("nuevo")}><Plus className="size-4" /> Nuevo checklist</button></div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checklists.map((c) => {
          const deHoy = envios.filter((e) => e.checklist === c.id && e.fecha === hoy);
          const enviados = deHoy.filter((e) => e.estado !== "no_enviado").length;
          return (
            <li key={c.id}>
              <button type="button" onClick={() => setEditando(c)} className="flex h-full w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300">
                <b className="text-[15px] text-[#080d36]">{c.nombre}</b>
                <span className="text-[13px] text-slate-500">{c.puntos.length} puntos · {c.frecuencia.toLowerCase()}, antes de las {c.hora}</span>
                <span className="text-[12.5px] text-slate-600">{c.aQuien} · {c.sucursal === "Todas" ? "todas las sucursales" : c.sucursal}</span>
                <span className="flex items-center gap-1 text-[12px] text-slate-500"><Camera className="size-3.5" /> {c.puntos.filter((p) => p.pideFoto).length} piden foto</span>
                <span className={`mt-auto text-[12.5px] font-semibold ${deHoy.length && enviados === deHoy.length ? "text-green-700" : "text-slate-600"}`}>
                  {deHoy.length ? `Hoy: ${enviados} de ${deHoy.length} enviados` : "Hoy no toca"}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => setEditando("nuevo")} className="flex h-full min-h-36 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 hover:border-blue-300 hover:text-brand">
            <b>Nuevo checklist</b><span className="text-[12.5px]">Apertura, cierre, limpieza, inocuidad…</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
