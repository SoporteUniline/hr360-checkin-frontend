"use client";

// Catálogo de bonos y descuentos de la nómina (D-6): fijo cada periodo, condicionado a la asistencia
// (sin faltas / sin retardos / ambas: ADAMIA lo revisa solo) o capturado a mano. Se asignan en la ficha del empleado.
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { ArrowLeft, Plus, Settings2 } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chip, SelectorEmpresa, mensajeError, useEmpresaNomina } from "@/components/nomina/comun";
import { dinero } from "@/lib/nomina/nomina.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const VACIO = { nombre: "", tipo: "percepcion", forma: "fijo", condicion: "sin_faltas", valor: "", activo: true };
const SUGERIDOS = [
  { nombre: "Bono de puntualidad", tipo: "percepcion", forma: "condicionado", condicion: "sin_retardos" },
  { nombre: "Bono de asistencia", tipo: "percepcion", forma: "condicionado", condicion: "sin_faltas" },
  { nombre: "Bono de productividad", tipo: "percepcion", forma: "manual" },
  { nombre: "Despensa", tipo: "percepcion", forma: "fijo" },
];
const FORMA = { fijo: "Fijo cada periodo", condicionado: "Si cumple la asistencia", manual: "A mano en cada nómina" };
const CONDICION = { sin_faltas: "sin faltas", sin_retardos: "sin retardos", ambas: "sin faltas ni retardos" };

export default function AjustesNomina() {
  const { enqueueSnackbar } = useSnackbar();
  const empresa = useEmpresaNomina();
  const { data, error, mutate } = useSWR(empresa.idEmpresa ? `/checador/nomina/conceptos?empresa=${empresa.idEmpresa}` : null, get);
  const [form, setForm] = useState(null);
  const conceptos = data?.conceptos ?? [];
  const faltantes = SUGERIDOS.filter((s) => !conceptos.some((c) => c.nombre.toLowerCase() === s.nombre.toLowerCase()));

  const guardar = async (e) => {
    e.preventDefault();
    const cuerpo = { ...form, valor: Number(form.valor || 0), id_empresa: empresa.idEmpresa };
    try {
      if (form.id) await axios.put(`/checador/nomina/conceptos/${form.id}`, cuerpo);
      else await axios.post("/checador/nomina/conceptos", cuerpo);
      enqueueSnackbar("Guardado.", { variant: "success" });
      setForm(null);
      mutate();
    } catch (err) {
      enqueueSnackbar(mensajeError(err, "No se pudo guardar."), { variant: "error" });
    }
  };

  return (
    <div className="space-y-5 p-1">
      <Link href="/panel/nomina" className="inline-flex items-center gap-1 text-sm font-semibold text-[#2c56e8] hover:underline"><ArrowLeft className="size-4" /> Nóminas</Link>
      <EncabezadoPagina icono={Settings2} titulo="Bonos y descuentos" subtitulo="Se asignan a cada persona en su ficha (pestaña Nómina) y se pueden ajustar en cada nómina." acciones={<><SelectorEmpresa {...empresa} /><Button size="sm" onClick={() => setForm(VACIO)}><Plus className="size-4" /> Nuevo</Button></>} />
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{mensajeError(error, "No se pudo cargar el catálogo.")}</p> : null}
      {faltantes.length && data ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm">
          <span className="text-blue-900">Sugeridos:</span>
          {faltantes.map((s) => <Button key={s.nombre} size="sm" variant="outline" onClick={() => setForm({ ...VACIO, ...s })}>+ {s.nombre}</Button>)}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead><tr className="bg-gray-50 text-left text-[10.5px] uppercase tracking-wide text-gray-500">{["Concepto", "Tipo", "Cómo se aplica", "Valor", "Estado", ""].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {conceptos.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Aún no hay bonos ni descuentos.</td></tr> : conceptos.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-3 py-2.5 font-semibold text-gray-900">{c.nombre}</td>
                <td className="px-3 py-2.5">{c.tipo === "descuento" ? <Chip tono="rojo">Descuento</Chip> : <Chip tono="verde">Bono</Chip>}</td>
                <td className="px-3 py-2.5">{FORMA[c.forma]}{c.forma === "condicionado" ? ` (${CONDICION[c.condicion]})` : ""}</td>
                <td className="px-3 py-2.5 tabular-nums">{dinero(c.valor)}</td>
                <td className="px-3 py-2.5">{c.activo ? "Activo" : "Inactivo"}</td>
                <td className="px-3 py-2.5 text-right"><button type="button" className="font-semibold text-[#2c56e8] hover:underline" onClick={() => setForm({ ...c, valor: Number(c.valor), activo: Boolean(c.activo), condicion: c.condicion ?? "sin_faltas" })}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={Boolean(form)} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{form?.id ? "Editar concepto" : "Nuevo concepto"}</DialogTitle></DialogHeader>
          {form ? (
            <form onSubmit={guardar} className="grid gap-3 text-sm">
              <label className="grid gap-1 font-medium">Nombre<input required maxLength={80} className="h-10 rounded-lg border border-gray-300 px-2" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
              <label className="grid gap-1 font-medium">Tipo<select className="h-10 rounded-lg border border-gray-300 px-2" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="percepcion">Bono (se suma)</option><option value="descuento">Descuento (se resta)</option></select></label>
              <label className="grid gap-1 font-medium">Cómo se aplica<select className="h-10 rounded-lg border border-gray-300 px-2" value={form.forma} onChange={(e) => setForm({ ...form, forma: e.target.value })}>{Object.entries(FORMA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              {form.forma === "condicionado" ? (
                <label className="grid gap-1 font-medium">Se paga si…<select className="h-10 rounded-lg border border-gray-300 px-2" value={form.condicion} onChange={(e) => setForm({ ...form, condicion: e.target.value })}>{Object.entries(CONDICION).map(([k, v]) => <option key={k} value={k}>No tuvo… {v}</option>)}</select></label>
              ) : null}
              <label className="grid gap-1 font-medium">Valor sugerido ($)<input type="number" min="0" step="0.01" className="h-10 rounded-lg border border-gray-300 px-2" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /><span className="text-xs font-normal text-gray-500">Cada persona puede tener su propio valor en su ficha.</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button type="submit">Guardar</Button></DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
