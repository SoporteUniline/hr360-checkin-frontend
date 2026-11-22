"use client";

// Formulario de un bono o descuento (crear / editar). Se usa en la lista, en su detalle y desde el recibo de una nómina.
import { useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeError } from "./comun";

export const FORMA = { fijo: "Fijo cada periodo", condicionado: "Si cumple la asistencia", manual: "A mano en cada nómina" };
export const CONDICION = { sin_faltas: "sin faltas", sin_retardos: "sin retardos", ambas: "sin faltas ni retardos" };
export const VACIO = { nombre: "", tipo: "percepcion", forma: "fijo", condicion: "sin_faltas", valor: "", activo: true, para_todos: false };
const campo = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base";

// Se monta al abrir ({form ? <FormConcepto inicial={form} … /> : null}); onGuardado(id) tras guardar.
export default function FormConcepto({ inicial, idEmpresa, paraTodosDisponible = true, onCerrar, onGuardado }) {
  const [form, setForm] = useState(inicial);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const f = form ?? VACIO;

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    const cuerpo = { nombre: f.nombre, tipo: f.tipo, forma: f.forma, condicion: f.condicion, valor: Number(f.valor || 0), activo: Boolean(f.activo), id_empresa: idEmpresa, ...(paraTodosDisponible ? { para_todos: Boolean(f.para_todos) } : {}) };
    try {
      const r = f.id ? await axios.put(`/checador/nomina/conceptos/${f.id}`, cuerpo) : await axios.post("/checador/nomina/conceptos", cuerpo);
      await onGuardado(f.id ?? r.data.id, cuerpo);
    } catch (err) {
      setError(mensajeError(err, "No se pudo guardar."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{f.id ? "Editar bono o descuento" : "Nuevo bono o descuento"}</DialogTitle>
          <DialogDescription>El valor es una sugerencia: cada persona puede tener el suyo y se ajusta en cada nómina.</DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="grid gap-3 text-sm">
          <label className="grid gap-1 font-medium">Nombre<input required maxLength={80} className={campo} value={f.nombre} onChange={(e) => setForm({ ...f, nombre: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 font-medium">Tipo<select className={campo} value={f.tipo} onChange={(e) => setForm({ ...f, tipo: e.target.value })}><option value="percepcion">Bono (se suma)</option><option value="descuento">Descuento (se resta)</option></select></label>
            <label className="grid gap-1 font-medium">Valor ($)<input type="number" min="0" step="0.01" inputMode="decimal" className={campo} value={f.valor} onChange={(e) => setForm({ ...f, valor: e.target.value })} /></label>
          </div>
          <label className="grid gap-1 font-medium">Cómo se aplica<select className={campo} value={f.forma} onChange={(e) => setForm({ ...f, forma: e.target.value })}>{Object.entries(FORMA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          {f.forma === "condicionado" ? (
            <label className="grid gap-1 font-medium">Se paga si…<select className={campo} value={f.condicion} onChange={(e) => setForm({ ...f, condicion: e.target.value })}>{Object.entries(CONDICION).map(([k, v]) => <option key={k} value={k}>No tuvo… {v}</option>)}</select></label>
          ) : null}
          <label className={`flex items-start gap-2.5 rounded-xl border p-3 ${f.para_todos ? "border-brand bg-blue-50" : "border-slate-200"} ${paraTodosDisponible ? "" : "opacity-60"}`}>
            <input type="checkbox" className="mt-0.5 size-4 accent-[#2563eb]" disabled={!paraTodosDisponible} checked={Boolean(f.para_todos)} onChange={(e) => setForm({ ...f, para_todos: e.target.checked })} />
            <span><b className="block">Se lo ganan todos</b><span className="text-xs text-slate-500">{paraTodosDisponible ? "Aplica a todas las personas de la empresa, también a las que entren después. A alguien en particular se le puede quitar." : "Falta correr la migración 20261122_nomina_bonos_todos.sql."}</span></span>
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[#2563eb]" checked={Boolean(f.activo)} onChange={(e) => setForm({ ...f, activo: e.target.checked })} /> Activo</label>
          {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={onCerrar}>Cancelar</Button><Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
