"use client";

// Proyectos (prototipo 23/11/2026): un proyecto agrupa tareas que se hacen una vez y tienen fin (p. ej. «Apertura sucursal
// Norte»). Tarjetas con avance; al abrir uno se ve su propio tablero y se le agregan tareas.
import { useState } from "react";
import { ArrowLeft, FolderKanban, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { avanceProyecto } from "@/lib/tareas/reglas.mjs";
import { useTareas } from "./store";
import Tablero from "./Tablero";
import { Avatar, Barra, botonPrimario, botonSecundario, campo, etiqueta, fechaCorta } from "./comun";

const COLORES = ["#2563eb", "#dc2626", "#7c3aed", "#059669", "#d97706", "#0891b2"];

function FormProyecto({ abierto, alCerrar }) {
  const { guardarProyecto, personas } = useTareas();
  const [f, setF] = useState({ nombre: "", descripcion: "", responsable: "", fin: "", color: COLORES[3] });
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && alCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="text-lg font-extrabold text-[#080d36]">Nuevo proyecto</DialogTitle>
        <DialogDescription className="text-sm text-slate-500">Agrupa tareas que tienen fin. Luego le agregas sus tareas.</DialogDescription>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (!f.nombre.trim()) return; setGuardando(true); const r = await guardarProyecto({ ...f, responsable: f.responsable ? Number(f.responsable) : null }); setGuardando(false); if (r.ok) alCerrar(); }}>
          <label className={etiqueta}>Nombre<input autoFocus className={`mt-1 ${campo}`} value={f.nombre} onChange={set("nombre")} placeholder="Ej. Remodelación de cocina" /></label>
          <label className={etiqueta}>Para qué es (opcional)<textarea rows={2} className={`mt-1 ${campo} h-auto py-2`} value={f.descripcion} onChange={set("descripcion")} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={etiqueta}>Responsable
              <select className={`mt-1 ${campo}`} value={f.responsable} onChange={set("responsable")}>
                <option value="">Sin responsable</option>
                {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
            <label className={etiqueta}>Termina<input type="date" className={`mt-1 ${campo}`} value={f.fin} onChange={set("fin")} /></label>
          </div>
          <fieldset><legend className={etiqueta}>Color</legend>
            <div className="mt-1 flex gap-2">{COLORES.map((c) => (
              <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={f.color === c} onClick={() => setF((v) => ({ ...v, color: c }))}
                className={`size-8 rounded-full ${f.color === c ? "ring-2 ring-offset-2 ring-slate-800" : ""}`} style={{ backgroundColor: c }} />
            ))}</div>
          </fieldset>
          <div className="flex justify-end gap-2"><button type="button" className={botonSecundario} onClick={alCerrar}>Cancelar</button><button type="submit" className={botonPrimario} disabled={!f.nombre.trim() || guardando}>{guardando ? "Creando…" : "Crear proyecto"}</button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Proyectos({ alAbrirTarea }) {
  const { proyectos, tareas, persona, hoy } = useTareas();
  const [abierto, setAbierto] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const pry = proyectos.find((p) => p.id === abierto);

  if (pry) {
    const a = avanceProyecto(tareas.filter((t) => t.proyecto === pry.id), hoy);
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setAbierto(null)} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft className="size-4" /> Todos los proyectos</button>
        <div className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <span className="mt-1 size-3 shrink-0 rounded-full" style={{ backgroundColor: pry.color }} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-[#080d36]">{pry.nombre}</h2>
            <p className="text-sm text-slate-500">{pry.descripcion}</p>
            <p className="mt-1 text-[12.5px] text-slate-600">Responsable: <b>{persona(pry.responsable)?.nombre ?? "sin asignar"}</b>{pry.fin ? <> · termina el <b>{fechaCorta(pry.fin)}</b></> : null}</p>
          </div>
          <div className="w-56">
            <p className="flex justify-between text-[12.5px] font-semibold"><span>{a.hechas} de {a.total} tareas</span><span>{a.porcentaje}%</span></p>
            <div className="mt-1"><Barra porcentaje={a.porcentaje} color="bg-green-600" alto="h-2" /></div>
            {a.vencidas ? <p className="mt-1 text-[12px] font-semibold text-red-700">{a.vencidas} vencida{a.vencidas === 1 ? "" : "s"}</p> : null}
          </div>
          <button type="button" className={botonPrimario} onClick={() => alAbrirTarea({ nueva: true, proyecto: pry.id })}><Plus className="size-4" /> Tarea en este proyecto</button>
        </div>
        <Tablero alAbrir={alAbrirTarea} proyectoFijo={pry.id} sinEquipo />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button type="button" className={botonPrimario} onClick={() => setNuevo(true)}><Plus className="size-4" /> Nuevo proyecto</button></div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {proyectos.map((p) => {
          const propias = tareas.filter((t) => t.proyecto === p.id);
          const a = avanceProyecto(propias, hoy);
          const gente = [...new Set(propias.map((t) => t.persona))].map(persona).filter(Boolean);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => setAbierto(p.id)} className="flex h-full w-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300">
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} /><b className="text-[15px] text-[#080d36]">{p.nombre}</b></span>
                <span className="text-[13px] text-slate-500">{p.descripcion}</span>
                <span className="mt-auto space-y-1">
                  <span className="flex justify-between text-[12.5px] font-semibold text-slate-700"><span>{a.hechas} de {a.total} tareas</span><span>{a.porcentaje}%</span></span>
                  <Barra porcentaje={a.porcentaje} color="bg-green-600" alto="h-2" />
                </span>
                <span className="flex items-center gap-2 text-[12px]">
                  <span className="flex -space-x-1.5">{gente.slice(0, 4).map((g) => <Avatar key={g.id} persona={g} tam="size-6" />)}</span>
                  {a.vencidas ? <span className="font-semibold text-red-700">{a.vencidas} vencida{a.vencidas === 1 ? "" : "s"}</span> : null}
                  <span className="ml-auto text-slate-500">{p.fin ? `Termina ${fechaCorta(p.fin)}` : "Sin fecha"}</span>
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => setNuevo(true)} className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 hover:border-blue-300 hover:text-brand">
            <FolderKanban className="size-6" /> Nuevo proyecto
          </button>
        </li>
      </ul>
      {nuevo ? <FormProyecto abierto alCerrar={() => setNuevo(false)} /> : null}
    </div>
  );
}
