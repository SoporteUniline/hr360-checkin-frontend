"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Check, Hash, ListChecks, ListPlus, Loader2, Pencil, Plus, Search, TextCursorInput } from "lucide-react";
import { useSnackbar } from "notistack";
import { useAuth } from "@/context/AuthContext";
import useCamposPersonalizados from "@/hooks/useCamposPersonalizados";
import axios from "@/lib/axios";
import OpcionesCampoEditor from "@/components/OpcionesCampoEditor";
import { TIPOS_CAMPO, PESTANAS_CAMPO } from "@/lib/camposPersonalizados.mjs";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const initialForm = () => ({ nombre: "", tipo: "seleccion", opciones: ["", ""], formulario: true, filtros: true, pestana: "laborales", activo: true });
const icons = { seleccion: ListChecks, texto: TextCursorInput, numero: Hash };
const locations = [
  { key: "formulario", title: "Formulario del empleado", description: "Captura y consulta en la pestaña que elijas." },
  { key: "filtros", title: "Filtro en la tabla", description: "Permite filtrar desde el encabezado de la columna." },
];

export default function CamposPersonalizadosPage() {
  const { dataUser } = useAuth();
  const empresa = dataUser?.id_empresa || (dataUser?.empresas_detalle?.length === 1 ? dataUser.empresas_detalle[0].id_empresa : null);
  const empresaNombre = dataUser?.empresas_detalle?.find(e => Number(e.id_empresa) === Number(empresa))?.nombre;
  const { campos, error, isLoading, mutate } = useCamposPersonalizados(empresa);
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  function openForm(field) {
    setEditorKey(key => key + 1);
    setEditing(field || null);
    setForm(field ? { ...field, tipo: field.tipo || "seleccion", pestana: field.pestana || "laborales", opciones: [...field.opciones] } : initialForm());
    setFormError("");
    setOpen(true);
  }

  function setLocation(key, checked) {
    setForm(previous => ({ ...previous, [key]: checked }));
  }

  async function submit(event) {
    event.preventDefault();
    const opciones = form.tipo === "seleccion" ? form.opciones.map(o => o.trim()) : [];
    if (form.tipo === "seleccion" && (!opciones.length || opciones.some(o => !o))) {
      setFormError("Completa las opciones o elimina las filas vacías."); return;
    }
    if (new Set(opciones.map(o => o.toLocaleLowerCase())).size !== opciones.length) {
      setFormError("Las opciones no pueden repetirse."); return;
    }
    setSaving(true); setFormError("");
    try {
      const payload = { nombre: form.nombre.trim(), tipo: form.tipo, opciones,
        formulario: form.formulario, filtros: form.filtros, pestana: form.pestana, activo: form.activo };
      const url = `/checador/campos-personalizados${editing ? `/${editing.id}` : ""}?empresa=${empresa}`;
      if (editing) await axios.put(url, payload); else await axios.post(url, payload);
      setOpen(false);
      enqueueSnackbar(editing ? "Campo actualizado correctamente" : "Campo creado correctamente", { variant: "success" });
      await mutate();
    } catch (e) {
      setFormError(e.response?.data?.error || "No se pudo guardar el campo. Intenta nuevamente.");
    } finally { setSaving(false); }
  }

  const filtered = campos.filter(c => c.nombre.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const addButton = <Button onClick={() => openForm()} disabled={!empresa || isLoading || !!error} className="gap-2 bg-brand text-white hover:bg-brand/90"><Plus className="h-4 w-4" />Nuevo campo</Button>;

  return (
    <main className="space-y-6">
      <EncabezadoPagina icono={ListPlus} titulo="Campos personalizados" subtitulo="Adapta la información de tus empleados a la operación de tu empresa." acciones={addButton} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600"><Building2 className="h-4 w-4 text-gray-400" /><span>{empresaNombre || "Empresa de la sesión"}</span><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">{campos.length} {campos.length === 1 ? "campo" : "campos"}</span></div>
        <Link href="/panel/empleados" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800">Ver empleados<ArrowUpRight className="h-4 w-4" /></Link>
      </div>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><Input aria-label="Buscar campos" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar campos..." className="h-9 border-gray-200 pl-9 shadow-none" /></div></div>
        {error ? <div role="alert" className="flex items-center justify-between gap-3 p-6 text-sm text-red-600">No se pudieron cargar los campos.<Button variant="outline" onClick={() => mutate()}>Reintentar</Button></div>
          : isLoading || !dataUser ? <div className="flex items-center justify-center gap-2 p-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Cargando campos...</div>
          : !empresa ? <p role="alert" className="p-8 text-sm text-gray-500">No se pudo identificar la empresa de tu sesión.</p>
          : !filtered.length ? <div className="flex flex-col items-center px-6 py-16 text-center"><span className="mb-4 rounded-2xl bg-blue-50 p-4 text-blue-600"><ListPlus className="h-7 w-7" /></span><h2 className="font-semibold text-gray-900">{search ? "No encontramos campos" : "La información que tu equipo necesita"}</h2><p className="mt-2 max-w-md text-sm text-gray-500">{search ? "Prueba con otro nombre." : "Agrega campos de selección, texto o número y decide dónde aparecen."}</p>{!search && <div className="mt-5">{addButton}</div>}</div>
          : <Table><TableHeader><TableRow className="bg-gray-50/80">
            {["Campo", "Tipo", "Opciones", "Ubicación", "Estado", ""].map((title, i) => <TableHead key={i} className="h-11 px-5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title || <span className="sr-only">Acciones</span>}</TableHead>)}
          </TableRow></TableHeader><TableBody>{filtered.map(c => {
            const tipo = c.tipo || "seleccion";
            const Icon = icons[tipo] || ListChecks;
            return <TableRow key={c.id} className="hover:bg-gray-50/60">
              <TableCell className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gray-100 bg-gray-50 text-gray-500"><Icon className="h-4 w-4" /></span><span className="font-semibold text-gray-900">{c.nombre}</span></div></TableCell>
              <TableCell className="px-5 text-gray-600">{TIPOS_CAMPO.find(t => t.value === tipo)?.label}</TableCell>
              <TableCell className="max-w-64 px-5"><div className="flex flex-wrap gap-1.5">{tipo === "seleccion" ? <>{c.opciones.slice(0, 3).map(o => <span key={o} className="max-w-28 truncate rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600" title={o}>{o}</span>)}{c.opciones.length > 3 && <span className="text-xs text-gray-400">+{c.opciones.length - 3}</span>}</> : <span className="text-xs text-gray-400">{tipo === "numero" ? "Enteros y decimales" : "Captura libre"}</span>}</div></TableCell>
              <TableCell className="px-5"><div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">{[[c.formulario, PESTANAS_CAMPO.find(p => p.value === (c.pestana || "laborales"))?.label], [c.filtros, "Filtro"]].filter(([shown]) => shown).map(([, label]) => <span key={label} className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-blue-500" />{label}</span>)}</div></TableCell>
              <TableCell className="px-5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${c.activo ? "bg-emerald-500" : "bg-gray-400"}`} />{c.activo ? "Activo" : "Inactivo"}</span></TableCell>
              <TableCell className="px-5 text-right"><Button variant="ghost" size="sm" className="gap-1.5 text-gray-600" onClick={() => openForm(c)}><Pencil className="h-3.5 w-3.5" />Editar<span className="sr-only"> {c.nombre}</span></Button></TableCell>
            </TableRow>;
          })}</TableBody></Table>}
      </section>

      <Dialog open={open} onOpenChange={next => { if (!saving) setOpen(next); }}>
        <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl">
          <DialogHeader className="border-b border-gray-100 px-6 py-5 text-left"><DialogTitle>{editing ? "Editar campo" : "Nuevo campo personalizado"}</DialogTitle><DialogDescription>Define qué información se captura y dónde estará disponible.</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="flex min-h-0 flex-col overflow-hidden">
            <div className="max-h-[65dvh] space-y-6 overflow-y-auto px-6 py-5">
              <div className="space-y-2"><label htmlFor="campo-nombre" className="text-sm font-medium text-gray-700">Nombre del campo <span className="text-red-500">*</span></label><Input id="campo-nombre" required maxLength={80} autoFocus disabled={saving} placeholder="Escribe el nombre del campo" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="h-10 rounded-lg border-gray-200 shadow-none" /></div>
              <div className="space-y-2"><label htmlFor="campo-tipo" className="text-sm font-medium text-gray-700">Tipo de dato</label><Select value={form.tipo} disabled={saving || !!editing} onValueChange={tipo => setForm({ ...form, tipo, opciones: form.opciones.length ? form.opciones : [""] })}><SelectTrigger id="campo-tipo" className="h-10 rounded-lg border-gray-200 shadow-none"><SelectValue /></SelectTrigger><SelectContent>{TIPOS_CAMPO.map(t => { const Icon = icons[t.value]; return <SelectItem key={t.value} value={t.value}><span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-gray-400" />{t.label}</span></SelectItem>; })}</SelectContent></Select><p className="text-xs text-gray-500">{editing ? "El tipo se conserva para proteger los valores guardados." : TIPOS_CAMPO.find(t => t.value === form.tipo)?.description}</p></div>
              {form.tipo === "seleccion" && <fieldset disabled={saving} className="space-y-3"><legend className="mb-2 text-sm font-medium text-gray-700">Opciones disponibles</legend>
                <OpcionesCampoEditor key={`${editorKey}-${form.tipo}`} opciones={form.opciones} disabled={saving} onChange={opciones => setForm(previous => ({ ...previous, opciones }))} />
                {editing && <p className="text-xs text-gray-500">Las asignaciones de opciones retiradas se conservan.</p>}
              </fieldset>}
              <div className="space-y-2"><label htmlFor="campo-pestana" className="text-sm font-medium text-gray-700">Pestaña del formulario</label>
                <Select value={form.pestana} disabled={saving || !form.formulario} onValueChange={pestana => setForm({ ...form, pestana })}>
                  <SelectTrigger id="campo-pestana" className="h-10 rounded-lg border-gray-200 shadow-none"><SelectValue /></SelectTrigger>
                  <SelectContent>{PESTANAS_CAMPO.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <fieldset disabled={saving} className="space-y-0 rounded-xl border border-gray-200"><legend className="ml-3 px-2 text-sm font-medium text-gray-700">Dónde se muestra</legend>{locations.map((location, index) => <label key={location.key} className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-3 ${index ? "border-t border-gray-100" : ""}`}><span><span className="block text-sm font-medium text-gray-700">{location.title}</span><span className="mt-0.5 block text-xs text-gray-500">{location.description}</span></span><Switch checked={form[location.key]} onCheckedChange={checked => setLocation(location.key, checked)} /></label>)}</fieldset>
              <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-700">La visibilidad en el listado se elige desde <span className="font-semibold">Empleados → Columnas</span>.</p>
              <label className="flex cursor-pointer items-center justify-between gap-4"><span><span className="block text-sm font-medium text-gray-700">Campo activo</span><span className="mt-1 block text-xs text-gray-500">Al desactivarlo se oculta, pero conserva sus datos.</span></span><Switch disabled={saving} checked={form.activo} onCheckedChange={activo => setForm({ ...form, activo })} /></label>
              {formError && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
            </div>
            <DialogFooter className="border-t border-gray-100 bg-gray-50/60 px-6 py-4"><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving} className="gap-2 bg-brand text-white hover:bg-brand/90">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear campo"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
