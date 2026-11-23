"use client";

// Campo de respuesta de una pregunta de checklist (23/11/2026). El MISMO componente sirve para llenar en la app, para la
// vista previa al crear el checklist y para que el jefe corrija al revisar. Botones grandes (sin escribir) salvo en número
// y texto; «No aplica» si la pregunta lo permite; foto de evidencia donde se pide.
import { AlignLeft, Calendar, CalendarClock, Camera, CheckSquare, CircleDot, Hash, Image as ImageIcon, ListChecks, Type } from "lucide-react";
import { esCalificable, puntajePregunta } from "@/lib/tareas/preguntas.mjs";

export const ICONOS = { si_no: CheckSquare, opcion: CircleDot, multiple: ListChecks, numero: Hash, foto: ImageIcon, texto: Type, texto_largo: AlignLeft, fecha: Calendar, fecha_hora: CalendarClock };

export function IconoTipo({ tipo, className = "size-4" }) {
  const Icono = ICONOS[tipo] ?? Type;
  return <Icono className={className} aria-hidden="true" />;
}

export function ChipPuntaje({ valor }) {
  if (valor == null) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">No cuenta</span>;
  const tono = valor >= 100 ? "bg-green-50 text-green-700" : valor > 0 ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${tono}`}>{Math.round(valor * 10) / 10}%</span>;
}

function Chip({ activo, onClick, children, deshabilitado, tono = "azul", grande }) {
  const activos = { azul: "border-blue-600 bg-blue-600 text-white", verde: "border-green-600 bg-green-600 text-white", rojo: "border-red-600 bg-red-600 text-white", gris: "border-slate-700 bg-slate-700 text-white" };
  return (
    <button type="button" aria-pressed={activo} disabled={deshabilitado} onClick={onClick}
      className={`${grande ? "min-h-12 px-4 text-[15px]" : "min-h-10 px-3 text-[13.5px]"} rounded-xl border font-semibold disabled:opacity-60 ${activo ? activos[tono] : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>
      {children}
    </button>
  );
}

function SubirFoto({ url, alSubir, etiqueta, deshabilitado }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {url ? (url.startsWith("blob:") || url.startsWith("data:") ? <img src={url} alt="Foto de evidencia" className="size-14 rounded-lg object-cover" /> : <span className="grid size-14 place-items-center rounded-lg bg-slate-300 text-[10px] text-slate-700">Foto</span>) : null}
      {!deshabilitado ? (
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-amber-400 bg-amber-50 px-3 text-[13px] font-semibold text-amber-900">
          <Camera className="size-4" /> {url ? "Cambiar foto" : etiqueta}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) alSubir(URL.createObjectURL(f)); }} />
        </label>
      ) : null}
    </span>
  );
}

// pregunta: ver lib/tareas/preguntas.mjs · respuesta: { valor, na, foto } · onChange(respuestaNueva)
export function CampoRespuesta({ pregunta: p, respuesta, onChange, grande = false, deshabilitado = false, mostrarPuntaje = true }) {
  const r = respuesta ?? {};
  const na = Boolean(r.na && p.permiteNA);
  const poner = (cambios) => onChange({ ...r, na: false, ...cambios });
  const puntaje = puntajePregunta(p, r);
  const contestada = na || (r.valor != null && r.valor !== "" && !(Array.isArray(r.valor) && !r.valor.length));
  return (
    <div className="space-y-2.5">
      {!na ? (
        <div className="flex flex-wrap gap-2">
          {p.tipo === "si_no" ? (
            <>
              <Chip grande={grande} deshabilitado={deshabilitado} activo={r.valor === "si"} tono={p.correcta === "no" ? "rojo" : "verde"} onClick={() => poner({ valor: "si" })}>Sí</Chip>
              <Chip grande={grande} deshabilitado={deshabilitado} activo={r.valor === "no"} tono={p.correcta === "no" ? "verde" : "rojo"} onClick={() => poner({ valor: "no" })}>No</Chip>
            </>
          ) : null}
          {p.tipo === "opcion" ? (p.opciones ?? []).map((o) => (
            <Chip key={o.id} grande={grande} deshabilitado={deshabilitado} activo={r.valor === o.id} tono="azul" onClick={() => poner({ valor: o.id })}>{o.texto}</Chip>
          )) : null}
          {p.tipo === "multiple" ? (p.opciones ?? []).map((o) => {
            const sel = Array.isArray(r.valor) && r.valor.includes(o.id);
            return (
              <Chip key={o.id} grande={grande} deshabilitado={deshabilitado} activo={sel} tono="azul"
                onClick={() => poner({ valor: sel ? r.valor.filter((x) => x !== o.id) : [...(Array.isArray(r.valor) ? r.valor : []), o.id] })}>
                {sel ? "✓ " : ""}{o.texto}
              </Chip>
            );
          }) : null}
          {p.tipo === "numero" ? (
            <label className="flex items-center gap-2">
              <span className="sr-only">{p.texto}</span>
              <input type="number" inputMode="decimal" disabled={deshabilitado} value={r.valor ?? ""} onChange={(e) => poner({ valor: e.target.value === "" ? null : Number(e.target.value) })}
                className={`${grande ? "h-12 w-36 text-lg" : "h-10 w-28 text-sm"} rounded-xl border border-slate-300 px-3 font-semibold tabular-nums`} />
              {p.unidad ? <span className="text-sm font-semibold text-slate-600">{p.unidad}</span> : null}
              {(p.min !== "" && p.min != null) || (p.max !== "" && p.max != null) ? <span className="text-[12px] text-slate-500">Bien: {p.min === p.max ? p.min : `${p.min ?? "…"} a ${p.max ?? "…"}`}</span> : null}
            </label>
          ) : null}
          {p.tipo === "foto" ? <SubirFoto url={r.valor} etiqueta="Tomar foto" deshabilitado={deshabilitado} alSubir={(url) => poner({ valor: url })} /> : null}
          {p.tipo === "texto" ? (
            <input aria-label={p.texto} disabled={deshabilitado} value={r.valor ?? ""} onChange={(e) => poner({ valor: e.target.value })} placeholder="Escribe aquí…"
              className={`${grande ? "h-12" : "h-10"} w-full rounded-xl border border-slate-300 px-3 text-base`} />
          ) : null}
          {p.tipo === "texto_largo" ? (
            <textarea aria-label={p.texto} rows={3} disabled={deshabilitado} value={r.valor ?? ""} onChange={(e) => poner({ valor: e.target.value })} placeholder="Escribe aquí…"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base" />
          ) : null}
          {p.tipo === "fecha" || p.tipo === "fecha_hora" ? (
            <input aria-label={p.texto} type={p.tipo === "fecha" ? "date" : "datetime-local"} disabled={deshabilitado} value={r.valor ?? ""} onChange={(e) => poner({ valor: e.target.value || null })}
              className={`${grande ? "h-12" : "h-10"} rounded-xl border border-slate-300 px-3 text-base`} />
          ) : null}
        </div>
      ) : <p className="text-sm font-semibold text-slate-500">No aplica: no cuenta en la calificación.</p>}

      <div className="flex flex-wrap items-center gap-2">
        {p.pideFoto && !na && p.tipo !== "foto" && contestada ? <SubirFoto url={r.foto} etiqueta="Foto de evidencia" deshabilitado={deshabilitado} alSubir={(url) => onChange({ ...r, foto: url })} /> : null}
        {p.permiteNA && !deshabilitado ? (
          <button type="button" aria-pressed={na} onClick={() => onChange(na ? { ...r, na: false } : { na: true })}
            className={`min-h-9 rounded-lg px-2.5 text-[12.5px] font-semibold ${na ? "bg-slate-700 text-white" : "text-slate-500 underline-offset-2 hover:underline"}`}>
            {na ? "Quitar «No aplica»" : "No aplica"}
          </button>
        ) : null}
        {mostrarPuntaje && contestada && esCalificable(p) ? <span className="ml-auto"><ChipPuntaje valor={puntaje} /></span> : null}
      </div>
    </div>
  );
}
