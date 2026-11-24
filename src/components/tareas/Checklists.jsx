"use client";

// Checklists: cada punto es una PREGUNTA con tipo, valor por respuesta y peso; a la derecha, vista previa del
// celular para contestar de prueba. Reglas y validación: lib/tareas/preguntas.mjs.
import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Smartphone, Trash2 } from "lucide-react";
import { OPCIONES_RAPIDAS, TIPOS, calificarRespuestas, esCalificable, problemasChecklist, valorDePregunta } from "@/lib/tareas/preguntas.mjs";
import { useTareas } from "./store";
import { textoAsignacion, textoFrecuencia } from "@/lib/tareas/api.mjs";
import { CampoRespuesta, IconoTipo } from "./Preguntas";
import { botonPrimario, botonSecundario, campo, campoBase, colorCalificacion, etiqueta } from "./comun";


function useIds() {
  const n = useRef(0);
  return () => `n${Date.now().toString(36)}${(n.current += 1)}`;
}

function configInicial(tipo, nuevoId, previa = {}) {
  if (tipo === "si_no") return { correcta: previa.correcta ?? "si" };
  if (tipo === "opcion") return { opciones: previa.opciones?.length ? previa.opciones : OPCIONES_RAPIDAS[0].opciones.map(([texto, valor]) => ({ id: nuevoId(), texto, valor })) };
  if (tipo === "multiple") return { opciones: previa.opciones?.length ? previa.opciones : [["Opción 1", 50], ["Opción 2", 50]].map(([texto, valor]) => ({ id: nuevoId(), texto, valor })) };
  if (tipo === "numero") return { min: previa.min ?? "", max: previa.max ?? "", unidad: previa.unidad ?? "" };
  return {};
}

// Tipos en dos grupos para que se entienda a simple vista qué cuenta en la calificación.
function SelectorTipo({ valor, onElegir, etiquetaGrupo }) {
  const grupo = (califica, titulo) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-full text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 sm:w-auto sm:pr-1">{titulo}</span>
      {TIPOS.filter((t) => t.califica === califica).map((t) => (
        <button key={t.clave} type="button" aria-pressed={valor === t.clave} title={t.ayuda} onClick={() => onElegir(t.clave)}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold ${valor === t.clave ? "border-brand bg-blue-50 text-brand" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
          <IconoTipo tipo={t.clave} className="size-3.5" />{t.texto}
        </button>
      ))}
    </div>
  );
  return (
    <div role="group" aria-label={etiquetaGrupo} className="space-y-1.5">
      {grupo(true, "Se califican")}
      {grupo(false, "Solo registran")}
    </div>
  );
}

function EditorOpciones({ p, cambiar, nuevoId }) {
  const ops = p.opciones ?? [];
  const suma = ops.reduce((s, o) => s + (Number(o.valor) || 0), 0);
  const setOp = (i, k, v) => cambiar({ opciones: ops.map((o, j) => (j === i ? { ...o, [k]: v } : o)) });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-slate-600">
        <span>{p.tipo === "opcion" ? "Elige una. Cada opción vale un %; la ideal vale 100 %." : "Puede elegir varias. Cada una suma su %, hasta 100 %."}</span>
        <select aria-label="Usar opciones listas" className={`${campoBase} ml-auto h-8 text-[12.5px]`} value=""
          onChange={(e) => { const r = OPCIONES_RAPIDAS[Number(e.target.value)]; if (r) cambiar({ opciones: r.opciones.map(([texto, valor]) => ({ id: nuevoId(), texto, valor })) }); }}>
          <option value="">Usar opciones listas…</option>
          {OPCIONES_RAPIDAS.map((r, i) => <option key={r.nombre} value={i}>{r.nombre}</option>)}
        </select>
      </div>
      <ul className="space-y-1.5">
        {ops.map((o, i) => (
          <li key={o.id} className="flex items-center gap-2">
            <span className={`size-3.5 shrink-0 border-2 border-slate-400 ${p.tipo === "opcion" ? "rounded-full" : "rounded"}`} aria-hidden="true" />
            <input aria-label={`Opción ${i + 1}`} className={campo} value={o.texto} onChange={(e) => setOp(i, "texto", e.target.value)} placeholder={`Opción ${i + 1}`} />
            <label className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-slate-600">vale
              <input aria-label={`Valor de la opción ${i + 1}`} type="number" min="0" max="100" className={`${campoBase} w-20 text-right`} value={o.valor} onChange={(e) => setOp(i, "valor", e.target.value === "" ? "" : Number(e.target.value))} />%
            </label>
            <button type="button" aria-label={`Quitar opción ${i + 1}`} disabled={ops.length <= 2} onClick={() => cambiar({ opciones: ops.filter((_, j) => j !== i) })} className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => cambiar({ opciones: [...ops, { id: nuevoId(), texto: "", valor: 0 }] })} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand"><Plus className="size-4" /> Opción</button>
        {p.tipo === "multiple" ? <span className={`text-[12px] font-semibold ${suma >= 100 ? "text-green-700" : "text-amber-700"}`}>Suman {suma}%{suma > 100 ? " (cuenta hasta 100 %)" : ""}</span> : null}
      </div>
    </div>
  );
}

function TarjetaPregunta({ p, i, total, preguntas, cambiar, mover, duplicar, quitar, nuevoId, error }) {
  const vale = valorDePregunta(preguntas, p);
  return (
    <li className={`space-y-3 rounded-xl border bg-white p-4 ${error ? "border-red-300" : "border-slate-200"}`}>
      <div className="flex items-start gap-2">
        <span className="mt-2 grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-600">{i + 1}</span>
        <input aria-label={`Pregunta ${i + 1}`} className={`${campo} text-[15px] font-semibold`} value={p.texto} onChange={(e) => cambiar({ texto: e.target.value })} placeholder="Escribe la pregunta, p. ej. ¿El área está ordenada?" />
        <span className="flex shrink-0">
          <button type="button" aria-label={`Subir pregunta ${i + 1}`} disabled={i === 0} onClick={() => mover(-1)} className="rounded p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="size-4" /></button>
          <button type="button" aria-label={`Bajar pregunta ${i + 1}`} disabled={i === total - 1} onClick={() => mover(1)} className="rounded p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="size-4" /></button>
          <button type="button" aria-label={`Duplicar pregunta ${i + 1}`} onClick={duplicar} className="rounded p-2 text-slate-400 hover:bg-slate-100"><Copy className="size-4" /></button>
          <button type="button" aria-label={`Quitar pregunta ${i + 1}`} onClick={quitar} className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"><Trash2 className="size-4" /></button>
        </span>
      </div>
      <SelectorTipo valor={p.tipo} etiquetaGrupo={`Tipo de respuesta de la pregunta ${i + 1}`} onElegir={(tipo) => cambiar({ tipo, ...configInicial(tipo, nuevoId, p), ...(tipo === "foto" || !TIPOS.find((t) => t.clave === tipo)?.califica ? { pideFoto: false, permiteNA: false } : {}) })} />

      <div className="rounded-lg bg-slate-50 p-3">
        {p.tipo === "si_no" ? (
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-700">La respuesta buena es
            {["si", "no"].map((v) => (
              <button key={v} type="button" aria-pressed={p.correcta === v} onClick={() => cambiar({ correcta: v })}
                className={`min-h-9 rounded-lg border px-3 ${p.correcta === v ? "border-green-600 bg-green-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}>{v === "si" ? "Sí" : "No"}</button>
            ))}
            <span className="font-normal text-slate-500">· vale 100 %; la otra, 0 %</span>
          </div>
        ) : null}
        {p.tipo === "opcion" || p.tipo === "multiple" ? <EditorOpciones p={p} cambiar={cambiar} nuevoId={nuevoId} /> : null}
        {p.tipo === "numero" ? (
          <div className="flex flex-wrap items-end gap-3 text-[12.5px]">
            <label className="font-semibold text-slate-700">Mínimo<input aria-label={`Mínimo de la pregunta ${i + 1}`} type="number" className={`mt-1 block ${campoBase} w-28`} value={p.min} onChange={(e) => cambiar({ min: e.target.value === "" ? "" : Number(e.target.value) })} /></label>
            <label className="font-semibold text-slate-700">Máximo<input aria-label={`Máximo de la pregunta ${i + 1}`} type="number" className={`mt-1 block ${campoBase} w-28`} value={p.max} onChange={(e) => cambiar({ max: e.target.value === "" ? "" : Number(e.target.value) })} /></label>
            <label className="font-semibold text-slate-700">Unidad<input aria-label={`Unidad de la pregunta ${i + 1}`} className={`mt-1 block ${campoBase} w-28`} value={p.unidad} onChange={(e) => cambiar({ unidad: e.target.value })} placeholder="°C, pesos…" /></label>
            <span className="pb-2.5 text-slate-500">Vale 100 % si está dentro del rango; si no, 0 %. Vacío = sin límite.</span>
          </div>
        ) : null}
        {p.tipo === "foto" ? <p className="text-[13px] text-slate-600">Vale 100 % si sube la foto.</p> : null}
        {p.tipo === "estrellas" ? <p className="text-[13px] text-slate-600">De 1 a 5 estrellas: cada una vale 20 % (3 de 5 = 60 %).</p> : null}
        {p.tipo === "firma" ? <p className="text-[13px] text-slate-600">Firma con el dedo (p. ej. «Recibió»). Solo se registra; no cuenta en el %.</p> : null}
        {p.tipo === "texto" ? <p className="text-[13px] text-slate-600">Una línea (un nombre, un folio). Solo se registra; no cuenta en el %.</p> : null}
        {p.tipo === "texto_largo" ? <p className="text-[13px] text-slate-600">Párrafo para observaciones. Solo se registra; no cuenta en el %.</p> : null}
        {p.tipo === "fecha" ? <p className="text-[13px] text-slate-600">Elige una fecha del calendario (p. ej. caducidad). Solo se registra; no cuenta en el %.</p> : null}
        {p.tipo === "fecha_hora" ? <p className="text-[13px] text-slate-600">Fecha y hora (p. ej. cuándo llegó el proveedor). Solo se registra; no cuenta en el %.</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        {esCalificable(p) ? (
          <label className="flex items-center gap-2 font-semibold text-slate-700">Peso
            <input aria-label={`Peso de la pregunta ${i + 1}`} type="number" min="1" max="10" className={`${campoBase} h-9 w-16`} value={p.peso} onChange={(e) => cambiar({ peso: e.target.value === "" ? "" : Number(e.target.value) })} />
            <span className="font-normal text-slate-500">= {vale ?? 0}% del checklist</span>
          </label>
        ) : null}
        <label className="flex items-center gap-1.5 font-medium text-slate-700"><input type="checkbox" className="size-4 accent-blue-600" checked={p.obligatoria} onChange={(e) => cambiar({ obligatoria: e.target.checked })} /> Obligatoria</label>
        {esCalificable(p) ? <label className="flex items-center gap-1.5 font-medium text-slate-700" title="Si no aplica ese día (p. ej. la terraza cerrada), no cuenta en la calificación"><input type="checkbox" className="size-4 accent-blue-600" checked={p.permiteNA} onChange={(e) => cambiar({ permiteNA: e.target.checked })} /> Permite «No aplica»</label> : null}
        {esCalificable(p) && p.tipo !== "foto" ? <label className="flex items-center gap-1.5 font-medium text-slate-700"><input type="checkbox" className="size-4 accent-blue-600" checked={p.pideFoto} onChange={(e) => cambiar({ pideFoto: e.target.checked })} /> Pide foto de evidencia</label> : null}
      </div>
      {error ? <p role="alert" className="text-[13px] font-semibold text-red-700">{error}</p> : null}
    </li>
  );
}

function VistaPrevia({ nombre, hora, preguntas }) {
  const [respuestas, setRespuestas] = useState({});
  const calif = calificarRespuestas(preguntas, respuestas);
  return (
    <aside aria-label="Vista previa en el celular" className="sticky top-4 space-y-2">
      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600"><Smartphone className="size-4" /> Así lo verá en su celular · contéstalo de prueba</p>
      <div className="mx-auto max-h-[72vh] w-full max-w-[360px] overflow-y-auto rounded-[28px] border-[6px] border-slate-800 bg-white p-4 shadow-xl">
        <p className="text-lg font-extrabold leading-tight text-[#080d36]">{nombre || "Nombre del checklist"}</p>
        <p className="text-[12px] text-slate-500">Antes de las {hora}</p>
        <ol className="mt-3 space-y-4">
          {preguntas.map((p, i) => (
            <li key={p.id} className="space-y-2 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
              <p className="text-[14px] font-semibold text-[#080d36]">{i + 1}. {p.texto || "Pregunta sin texto"}{p.obligatoria ? <span className="ml-1 text-red-600" aria-label="obligatoria">*</span> : null}</p>
              <CampoRespuesta pregunta={p} respuesta={respuestas[p.id]} onChange={(r) => setRespuestas((x) => ({ ...x, [p.id]: r }))} />
            </li>
          ))}
        </ol>
        <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 border-t border-slate-200 bg-white px-4 py-3 text-center">
          <p className="text-[12px] text-slate-500">Calificación de prueba</p>
          <p className={`text-2xl font-extrabold tabular-nums ${colorCalificacion(calif)}`}>{calif ?? "—"}%</p>
          <button type="button" onClick={() => setRespuestas({})} className="text-[12px] font-semibold text-brand">Borrar respuestas de prueba</button>
        </div>
      </div>
    </aside>
  );
}

const DIAS = [[1, "L"], [2, "M"], [3, "Mi"], [4, "J"], [5, "V"], [6, "S"], [7, "D"]];
const NOMBRE_DIA = { 1: "lunes", 2: "martes", 3: "miércoles", 4: "jueves", 5: "viernes", 6: "sábado", 7: "domingo" };
const REVISA = [["jefe_inmediato", "Su jefe inmediato"], ["dueno", "Recursos Humanos / el dueño"], ["nadie", "Nadie, se aprueba solo"]];

// A quién le toca: una o varias filas «Puesto / Persona / Departamento» + cuál.
function Asignaciones({ valor, onChange }) {
  const { puestos, personas, departamentos } = useTareas();
  const opciones = { puesto: puestos.map((p) => [p.id, p.nombre]), empleado: personas.map((p) => [p.id, `${p.nombre}${p.puesto ? ` · ${p.puesto}` : ""}`]), departamento: departamentos.map((d) => [d, d]) };
  const set = (i, cambio) => onChange(valor.map((a, j) => (j === i ? { ...a, ...cambio } : a)));
  return (
    <fieldset className="sm:col-span-2">
      <legend className={etiqueta}>¿A quién le toca?</legend>
      <ul className="mt-1 space-y-1.5">
        {valor.map((a, i) => (
          <li key={i} className="flex gap-2">
            <select aria-label={`Tipo de asignación ${i + 1}`} className={`${campoBase} w-40 shrink-0`} value={a.tipo} onChange={(e) => set(i, { tipo: e.target.value, valor: "" })}>
              <option value="puesto">Puesto</option><option value="empleado">Persona</option><option value="departamento">Departamento</option>
            </select>
            <select aria-label={`A quién ${i + 1}`} className={campo} value={a.valor ?? ""} onChange={(e) => set(i, { valor: e.target.value })}>
              <option value="">Elige…</option>
              {opciones[a.tipo].map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
            {valor.length > 1 ? <button type="button" aria-label={`Quitar asignación ${i + 1}`} onClick={() => onChange(valor.filter((_, j) => j !== i))} className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"><Trash2 className="size-4" /></button> : null}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...valor, { tipo: "puesto", valor: "" }])} className="mt-1 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand"><Plus className="size-4" /> Agregar otro</button>
    </fieldset>
  );
}

function Editor({ inicial, alCerrar }) {
  const { guardarChecklist, archivarChecklist, checklists, sucursales } = useTareas();
  const nuevoId = useIds();
  const [f, setF] = useState(() => inicial ?? {
    nombre: "", frecuencia: "diario", diasSemana: [1], fechaUnica: "", hora: "09:00", revisa: "jefe_inmediato", soloSiCheco: true, sucursal: "",
    asignaciones: [{ tipo: "puesto", valor: "" }], preguntas: [],
  });
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const [eligiendo, setEligiendo] = useState(!inicial);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const problemas = useMemo(() => problemasChecklist(f.nombre, f.preguntas), [f.nombre, f.preguntas]);
  const sinAsignar = !f.asignaciones.some((a) => a.valor !== "" && a.valor != null);
  const errorDe = (id) => (intento ? problemas.find((x) => x.id === id)?.error : null);
  const generales = intento ? [...problemas.filter((x) => x.id == null).map((x) => x.error), ...(sinAsignar ? ["Elige a quién le toca."] : []), ...(f.frecuencia === "semanal" && !f.diasSemana.length ? ["Elige qué días de la semana."] : []), ...(f.frecuencia === "una_vez" && !f.fechaUnica ? ["Elige la fecha."] : [])] : [];
  const cambiarPregunta = (i, cambios) => setF((v) => ({ ...v, preguntas: v.preguntas.map((p, j) => (j === i ? { ...p, ...cambios } : p)) }));
  const agregar = (tipo) => setF((v) => ({ ...v, preguntas: [...v.preguntas, { id: nuevoId(), texto: "", tipo, peso: 1, obligatoria: true, permiteNA: false, pideFoto: false, ...configInicial(tipo, nuevoId) }] }));
  const usarPlantilla = (c) => setF((v) => ({ ...v, nombre: v.nombre || `${c.nombre} (copia)`, preguntas: c.preguntas.map((p) => ({ ...p, id: nuevoId(), opciones: p.opciones?.map((o) => ({ ...o, id: nuevoId() })) })) }));
  const resumen = `${f.frecuencia === "diario" ? "cada día que trabaje" : f.frecuencia === "semanal" ? `cada ${f.diasSemana.map((d) => NOMBRE_DIA[d]).join(", ") || "…"}` : `el ${f.fechaUnica || "…"}`}`;

  const guardar = async (e) => {
    e.preventDefault();
    setIntento(true);
    setErrorServidor("");
    if (problemas.length || sinAsignar || (f.frecuencia === "semanal" && !f.diasSemana.length) || (f.frecuencia === "una_vez" && !f.fechaUnica)) return;
    setGuardando(true);
    const r = await guardarChecklist(f);
    setGuardando(false);
    if (!r.ok) { setErrorServidor(r.codigo === "VERSION" ? "Alguien más lo cambió mientras lo editabas. Cierra y vuelve a abrirlo para ver lo último." : r.error); return; }
    alCerrar(f.id ? "Cambios guardados." : `«${f.nombre}» quedó creado y asignado.`);
  };

  return (
    <form onSubmit={guardar} className="space-y-4" noValidate>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className={etiqueta}>Nombre del checklist<input autoFocus className={`mt-1 ${campo} text-base font-semibold`} value={f.nombre} onChange={set("nombre")} placeholder="Ej. Apertura de restaurante" /></label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Asignaciones valor={f.asignaciones} onChange={(asignaciones) => setF((v) => ({ ...v, asignaciones }))} />
          <label className={etiqueta}>¿En qué sucursal?
            <select className={`mt-1 ${campo}`} value={f.sucursal} onChange={set("sucursal")}><option value="">Todas</option>{sucursales.map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <div>
            <label className={etiqueta}>¿Cada cuándo?
              <select className={`mt-1 ${campo}`} value={f.frecuencia} onChange={set("frecuencia")}><option value="diario">Diario</option><option value="semanal">Algunos días de la semana</option><option value="una_vez">Una sola vez</option></select>
            </label>
            {f.frecuencia === "semanal" ? (
              <div role="group" aria-label="Días de la semana" className="mt-1.5 flex gap-1">
                {DIAS.map(([n, t]) => { const on = f.diasSemana.includes(n); return (
                  <button key={n} type="button" aria-pressed={on} aria-label={NOMBRE_DIA[n]} onClick={() => setF((v) => ({ ...v, diasSemana: on ? v.diasSemana.filter((x) => x !== n) : [...v.diasSemana, n].sort() }))}
                    className={`size-9 rounded-lg border text-[12.5px] font-semibold ${on ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-600"}`}>{t}</button>
                ); })}
              </div>
            ) : null}
            {f.frecuencia === "una_vez" ? <input type="date" aria-label="Fecha" className={`mt-1.5 ${campo}`} value={f.fechaUnica} onChange={set("fechaUnica")} /> : null}
          </div>
          <label className={etiqueta}>¿Antes de qué hora?<input type="time" className={`mt-1 ${campo}`} value={f.hora} onChange={set("hora")} /></label>
          <label className={etiqueta}>¿Quién lo revisa?<select className={`mt-1 ${campo}`} value={f.revisa} onChange={set("revisa")}>{REVISA.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
          <label className="flex min-h-10 items-end gap-2 pb-2 text-sm font-medium text-slate-700"><input type="checkbox" className="size-4 accent-blue-600" checked={f.soloSiCheco} onChange={set("soloSiCheco")} /> Solo los días que checó entrada</label>
        </div>
        <p className="mt-3 rounded-lg bg-blue-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-blue-950">
          Así quedará: <b>{resumen}</b>{f.sucursal ? ` en ${f.sucursal}` : ""}, le llega «{f.nombre || "este checklist"}» en su app. Lo llena antes de las <b>{f.hora}</b>
          {f.revisa === "nadie" ? <> y <b>queda aprobado solo</b></> : <>, lo envía y <b>lo revisa {REVISA.find(([v]) => v === f.revisa)?.[1].toLowerCase()}</b></>}.
          {f.soloSiCheco ? " Si ese día no checó entrada, no le cuenta." : " Si no lo envía, cuenta 0 %."}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section aria-label="Preguntas" className="min-w-0 flex-[999_1_560px] space-y-3">
          {eligiendo && !f.preguntas.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
              <p className="font-semibold text-[#080d36]">¿Cómo quieres empezar?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {checklists.map((c) => <button key={c.id} type="button" className={botonSecundario} onClick={() => { usarPlantilla(c); setEligiendo(false); }}>Copiar «{c.nombre}»</button>)}
                <button type="button" className={botonPrimario} onClick={() => { agregar("si_no"); setEligiendo(false); }}>Empezar en blanco</button>
              </div>
            </div>
          ) : null}
          <ol className="space-y-3">
            {f.preguntas.map((p, i) => (
              <TarjetaPregunta key={p.id} p={p} i={i} total={f.preguntas.length} preguntas={f.preguntas} nuevoId={nuevoId} error={errorDe(p.id)}
                cambiar={(c) => cambiarPregunta(i, c)}
                mover={(d) => setF((v) => { const ps = [...v.preguntas]; const [x] = ps.splice(i, 1); ps.splice(i + d, 0, x); return { ...v, preguntas: ps }; })}
                duplicar={() => setF((v) => { const ps = [...v.preguntas]; ps.splice(i + 1, 0, { ...p, id: nuevoId(), opciones: p.opciones?.map((o) => ({ ...o, id: nuevoId() })) }); return { ...v, preguntas: ps }; })}
                quitar={() => setF((v) => ({ ...v, preguntas: v.preguntas.filter((_, j) => j !== i) }))} />
            ))}
          </ol>
          {!eligiendo || f.preguntas.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3">
              <p className="mb-2 text-[12.5px] font-semibold text-slate-600">Agregar pregunta <span className="font-normal text-slate-400">· las primeras 6 se califican; las demás solo registran</span></p>
              <div className="flex flex-wrap gap-1.5">
                {TIPOS.map((t) => (
                  <button key={t.clave} type="button" onClick={() => agregar(t.clave)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:border-blue-300 hover:text-brand">
                    <Plus className="size-3.5" /><IconoTipo tipo={t.clave} className="size-3.5" />{t.texto}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {generales.map((g) => <p key={g} role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{g}</p>)}
          {intento && problemas.some((x) => x.id != null) ? <p role="alert" className="text-sm font-semibold text-red-700">Revisa lo marcado en rojo.</p> : null}
          {errorServidor ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorServidor}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            {f.id ? <button type="button" className={`${botonSecundario} mr-auto text-red-700`} disabled={guardando} onClick={async () => { if (window.confirm(`¿Archivar «${f.nombre}»? Deja de llegarle a la gente; el historial se conserva.`)) { const r = await archivarChecklist(f); if (r.ok) alCerrar(); } }}>Archivar</button> : null}
            <button type="button" className={botonSecundario} onClick={() => alCerrar()} disabled={guardando}>Cancelar</button>
            <button type="submit" className={botonPrimario} disabled={guardando}>{guardando ? "Guardando…" : "Guardar y asignar"}</button>
          </div>
        </section>
        <div className="min-w-0 flex-[1_1_340px]"><VistaPrevia nombre={f.nombre} hora={f.hora} preguntas={f.preguntas} /></div>
      </div>
    </form>
  );
}

export default function Checklists() {
  const { checklists, enviosHoy, puestos, personas } = useTareas();
  const [editando, setEditando] = useState(null); // null | "nuevo" | checklist
  const [aviso, setAviso] = useState("");
  if (editando) return <Editor key={editando === "nuevo" ? "nuevo" : editando.id} inicial={editando === "nuevo" ? null : editando} alCerrar={(t) => { setEditando(null); setAviso(t ?? ""); }} />;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {aviso ? <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{aviso}</p> : null}
        <button type="button" className={`${botonPrimario} ml-auto`} onClick={() => { setAviso(""); setEditando("nuevo"); }}><Plus className="size-4" /> Nuevo checklist</button>
      </div>
      {!checklists.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          Aún no hay checklists. Crea el primero (apertura, cierre, limpieza…): eliges las preguntas, cuánto vale cada respuesta y a quién le toca.
        </div>
      ) : null}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checklists.map((c) => {
          const deHoy = enviosHoy.filter((e) => e.id_checklist === c.id && e.estado !== "no_aplica");
          const enviados = deHoy.filter((e) => ["por_revisar", "aprobado", "regresado"].includes(e.estado)).length;
          const tipos = [...new Set(c.preguntas.map((p) => p.tipo))];
          return (
            <li key={c.id}>
              <button type="button" onClick={() => { setAviso(""); setEditando(c); }} className="flex h-full w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300">
                <b className="text-[15px] text-[#080d36]">{c.nombre}</b>
                <span className="text-[13px] text-slate-500">{c.preguntas.length} preguntas · {textoFrecuencia(c).toLowerCase()}, antes de las {c.hora}</span>
                <span className="text-[12.5px] text-slate-600">{textoAsignacion(c, { puestos, personas })}</span>
                <span className="flex flex-wrap gap-1.5">{tipos.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"><IconoTipo tipo={t} className="size-3" />{TIPOS.find((x) => x.clave === t)?.texto}</span>)}</span>
                <span className={`mt-auto text-[12.5px] font-semibold ${deHoy.length && enviados === deHoy.length ? "text-green-700" : "text-slate-600"}`}>
                  {deHoy.length ? `Hoy: ${enviados} de ${deHoy.length} enviados` : "Hoy no toca"}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => { setAviso(""); setEditando("nuevo"); }} className="flex h-full min-h-36 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 hover:border-blue-300 hover:text-brand">
            <b>Nuevo checklist</b><span className="text-[12.5px]">Apertura, cierre, limpieza, inocuidad…</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
