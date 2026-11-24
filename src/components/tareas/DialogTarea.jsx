"use client";

// Ventana de una tarea: ver su avance, palomear pasos, comentar, aprobar o regresar si está en revisión, y crear o
// editar (título, proyecto, responsable, fecha, prioridad, pasos, pide foto).
import { useState } from "react";
import { Archive, Camera, Check, History, MessageSquare, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { COLUMNAS, PRIORIDADES, avancePasos } from "@/lib/tareas/reglas.mjs";
import { useTareas } from "./store";
import { Avatar, Barra, ChipPrioridad, FotoSegura, botonPrimario, botonSecundario, campo, campoBase, etiqueta, fechaRelativa } from "./comun";

function Formulario({ tarea, alGuardar, alCancelar, alArchivar, guardando }) {
  const { personas, proyectos } = useTareas();
  const [f, setF] = useState(() => ({
    titulo: tarea?.titulo ?? "", descripcion: tarea?.descripcion ?? "", proyecto: tarea?.proyecto ?? null, persona: tarea?.persona ?? "",
    fecha: tarea?.fecha ?? "", prioridad: tarea?.prioridad ?? "Media", pideFoto: tarea?.pideFoto ?? false,
    pasos: tarea?.pasos?.length ? tarea.pasos : [{ texto: "", hecho: false }],
  }));
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));
  const listo = f.titulo.trim() && f.persona && f.fecha;
  return (
    <form className="space-y-3.5" onSubmit={(e) => { e.preventDefault(); if (listo) alGuardar({ ...f, persona: Number(f.persona), proyecto: f.proyecto ? Number(f.proyecto) : null, pasos: f.pasos.filter((p) => p.texto.trim()) }); }}>
      <label className={etiqueta}>Qué hay que hacer
        <input autoFocus className={`mt-1 ${campo}`} value={f.titulo} onChange={set("titulo")} placeholder="Ej. Decorar el comedor" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={etiqueta}>Proyecto
          <select className={`mt-1 ${campo}`} value={f.proyecto ?? ""} onChange={set("proyecto")}>
            <option value="">Sin proyecto (tarea suelta)</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <label className={etiqueta}>Responsable
          <select className={`mt-1 ${campo}`} value={f.persona} onChange={set("persona")}>
            <option value="">Elige a alguien…</option>
            {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.puesto}</option>)}
          </select>
        </label>
        <label className={etiqueta}>Fecha límite
          <input type="date" className={`mt-1 ${campo}`} value={f.fecha} onChange={set("fecha")} />
        </label>
        <label className={etiqueta}>Prioridad
          <select className={`mt-1 ${campo}`} value={f.prioridad} onChange={set("prioridad")}>
            {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <label className={etiqueta}>Detalles (opcional)
        <textarea rows={2} className={`mt-1 ${campo} h-auto py-2`} value={f.descripcion} onChange={set("descripcion")} />
      </label>
      <fieldset>
        <legend className={etiqueta}>Pasos</legend>
        <ul className="mt-1 space-y-1.5">
          {f.pasos.map((p, i) => (
            <li key={p.id ?? `n${i}`} className="flex gap-2">
              <input aria-label={`Paso ${i + 1}`} className={campo} value={p.texto} placeholder={`Paso ${i + 1}`}
                onChange={(e) => setF((v) => ({ ...v, pasos: v.pasos.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) }))} />
              <button type="button" aria-label={`Quitar paso ${i + 1}`} onClick={() => setF((v) => ({ ...v, pasos: v.pasos.filter((_, j) => j !== i) }))}
                className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setF((v) => ({ ...v, pasos: [...v.pasos, { texto: "", hecho: false }] }))} className="mt-1.5 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand"><Plus className="size-4" /> Agregar paso</button>
      </fieldset>
      <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" className="size-4 accent-blue-600" checked={f.pideFoto} onChange={set("pideFoto")} /> Pide foto de evidencia para mandarla a revisión
      </label>
      <div className="flex justify-end gap-2 pt-1">
        {tarea?.id && alArchivar ? <button type="button" className={`${botonSecundario} mr-auto text-red-700`} onClick={alArchivar} disabled={guardando}><Archive className="size-4" /> Archivar</button> : null}
        <button type="button" className={botonSecundario} onClick={alCancelar} disabled={guardando}>Cancelar</button>
        <button type="submit" className={botonPrimario} disabled={!listo || guardando}>{guardando ? "Guardando…" : tarea?.id ? "Guardar cambios" : "Crear y asignar"}</button>
      </div>
      {!tarea?.id ? <p className="text-xs text-slate-500">A la persona le llegará aviso en su app y por correo.</p> : null}
    </form>
  );
}

function Detalle({ tarea, alEditar }) {
  const { marcarPaso, comentar: comentarApi, moverTarea, persona, proyecto, hoy } = useTareas();
  const [comentario, setComentario] = useState("");
  const responsable = persona(tarea.persona);
  const pry = proyecto(tarea.proyecto);
  const avance = avancePasos(tarea.pasos);
  const fecha = fechaRelativa(tarea.fecha, hoy, tarea.estado === "hecho");
  const columna = COLUMNAS.find((c) => c.clave === tarea.estado);
  const comentar = async () => { const t = comentario.trim(); if (!t) return; setComentario(""); const r = await comentarApi(tarea, t); if (!r.ok) setComentario(t); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <ChipPrioridad prioridad={tarea.prioridad} />
        <span className="rounded-full px-2 py-0.5 font-bold text-white" style={{ backgroundColor: columna?.color }}>{columna?.texto}</span>
        {pry ? <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700"><span className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: pry.color }} />{pry.nombre}</span> : <span className="text-slate-500">Tarea suelta</span>}
        <button type="button" onClick={alEditar} className="ml-auto inline-flex min-h-8 items-center gap-1 font-semibold text-brand"><Pencil className="size-3.5" /> Editar</button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Avatar persona={responsable} />
        <span className="font-semibold">{responsable?.nombre}</span>
        <span className={`ml-auto font-semibold ${fecha.vencida ? "text-red-700" : "text-slate-600"}`}>{fecha.texto}</span>
      </div>
      {tarea.descripcion ? <p className="text-sm text-slate-600">{tarea.descripcion}</p> : null}

      <section aria-label="Pasos" className="rounded-xl border border-slate-200">
        <h3 className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 text-[12.5px] font-bold">Pasos <span className="w-24"><Barra porcentaje={avance.porcentaje} /></span><span className="ml-auto font-semibold text-slate-500">{avance.hechos} de {avance.total}</span></h3>
        <ul>
          {tarea.pasos.map((p) => (
            <li key={p.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-slate-50 px-3 text-sm last:border-0">
                <input type="checkbox" className="size-4 accent-green-600" checked={p.hecho} onChange={() => marcarPaso(tarea, p, !p.hecho)} />
                <span className={p.hecho ? "text-slate-400 line-through" : ""}>{p.texto}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {tarea.pideFoto ? (
        <section aria-label="Evidencia" className="flex items-center gap-2 text-sm">
          <Camera className="size-4 text-slate-500" />
          {tarea.fotos.length ? (
            <span className="flex flex-wrap gap-2">{tarea.fotos.map((f, i) => <FotoSegura key={f} llave={f} alt={`Evidencia ${i + 1}`} className="h-16 w-20 rounded-md object-cover" />)}</span>
          ) : <span className="text-slate-500">Aún no sube foto de evidencia.</span>}
        </section>
      ) : null}

      <section aria-label="Comentarios" className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold"><MessageSquare className="size-3.5" /> Comentarios</h3>
        {tarea.comentarios.map((c, i) => <p key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><b>{c.de}:</b> {c.texto}</p>)}
        <div className="flex gap-2">
          <input aria-label="Escribe un comentario" className={campo} placeholder="Escribe un comentario…" value={comentario} onChange={(e) => setComentario(e.target.value)} onKeyDown={(e) => e.key === "Enter" && comentar()} />
          <button type="button" className={botonSecundario} onClick={comentar} disabled={!comentario.trim()}>Enviar</button>
        </div>
      </section>

      {tarea.historial?.length ? (
        <details className="text-[12.5px] text-slate-600">
          <summary className="inline-flex cursor-pointer items-center gap-1 font-semibold"><History className="size-3.5" /> Historial</summary>
          <ul className="mt-1 space-y-0.5 pl-5">{tarea.historial.map((h, i) => <li key={i}>{h.texto.replace("por_hacer", "Por hacer").replace("en_proceso", "En proceso").replace("revision", "En revisión").replace("hecho", "Hecho")} · {h.de}</li>)}</ul>
        </details>
      ) : null}

      {tarea.estado === "revision" ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className={botonSecundario} onClick={() => moverTarea(tarea, "en_proceso")}><Undo2 className="size-4" /> Regresar para corregir</button>
          <button type="button" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700" onClick={() => moverTarea(tarea, "hecho")}><Check className="size-4" /> Aprobar y terminar</button>
        </div>
      ) : (
        <label className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 text-sm font-semibold text-slate-700">Mover a
          <select className={campoBase} value={tarea.estado} onChange={(e) => moverTarea(tarea, e.target.value)}>
            {COLUMNAS.map((c) => <option key={c.clave} value={c.clave}>{c.texto}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

// tarea: objeto existente, o { nueva: true, proyecto? } para crear.
export default function DialogTarea({ tarea, alCerrar }) {
  const { guardarTarea, archivarTarea, tareas } = useTareas();
  const [editando, setEditando] = useState(Boolean(tarea?.nueva));
  const [guardando, setGuardando] = useState(false);
  const actual = tarea?.id ? tareas.find((t) => t.id === tarea.id) : tarea;
  const guardar = async (datos) => {
    setGuardando(true);
    const r = await guardarTarea(actual.nueva ? datos : { ...datos, id: actual.id, version: actual.version });
    setGuardando(false);
    if (!r.ok) return;
    if (actual.nueva) alCerrar(); else setEditando(false);
  };
  return (
    <Dialog open={Boolean(tarea)} onOpenChange={(v) => !v && alCerrar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogTitle className="pr-6 text-lg font-extrabold text-[#080d36]">{tarea?.nueva ? "Nueva tarea" : actual?.titulo ?? "Tarea"}</DialogTitle>
        <DialogDescription className="sr-only">Detalle de la tarea</DialogDescription>
        {!actual ? <p className="text-sm text-slate-500">Esta tarea ya no está en el tablero.</p> : editando
          ? <Formulario tarea={actual.nueva ? { proyecto: actual.proyecto } : actual} guardando={guardando} alCancelar={() => (actual.nueva ? alCerrar() : setEditando(false))} alGuardar={guardar}
              alArchivar={async () => { setGuardando(true); const r = await archivarTarea(actual); setGuardando(false); if (r.ok) alCerrar(); }} />
          : <Detalle tarea={actual} alEditar={() => setEditando(true)} />}
      </DialogContent>
    </Dialog>
  );
}
