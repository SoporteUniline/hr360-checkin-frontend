"use client";

// Lumo fase A (25/11/2026): «Sugerir con IA» en el editor de la entrevista. La IA PROPONE hasta 8 preguntas con su tipo,
// opciones y qué respuestas descartan o alertan; RH marca las que quiere y «Agregar» las pone en el editor como preguntas
// nuevas SIN guardar (se guardan con «Guardar entrevista», como las escritas a mano). Nunca se agregan solas.
// Pasa por Adamia AI (encendido, límites, créditos); el servidor quita las preguntas que podrían discriminar.
// Lumo fase B2 (25/11/2026): modo «entrevista» = «Generar entrevista con IA»: propone campos que solo informan (fecha,
// número, opciones…) con obligatorio/opcional. Misma puerta, mismo filtro y RH elige.
import { useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIPOS } from "@/lib/whatsapp/entrevista.mjs";
import { espacioSugerencias, mensajeErrorIa, sugerenciaAPregunta, textoDescartadas, textoSeveridadSugerencia } from "@/lib/whatsapp/conocimiento.mjs";
import { sugerirPreguntas } from "./api";

const tipoTexto = (tipo) => TIPOS.find((t) => t.valor === tipo)?.texto ?? tipo;

const TEXTOS = {
  filtro: { invita: "¿No sabes qué preguntar?", detalle: "Adamia AI propone preguntas que filtran para esta vacante. Tú eliges cuáles agregar.", boton: "Sugerir con IA", lleno: "preguntas que filtran" },
  entrevista: { invita: "Entrevista estructurada:", detalle: "Adamia AI propone los datos que el agente debe obtener (no califican). Tú eliges cuáles agregar.", boton: "Generar entrevista con IA", lleno: "preguntas" },
};

export default function SugerenciasIA({ idVacante, actuales, filtros = actuales, modo = "filtro", onAgregar }) {
  const [estado, setEstado] = useState({ cargando: false, error: "", datos: null });
  const [marcadas, setMarcadas] = useState(() => new Set());
  const espacio = espacioSugerencias({ total: actuales, filtros, modo });
  const t = TEXTOS[modo] ?? TEXTOS.filtro;
  const sugerencias = estado.datos?.sugerencias ?? [];

  const pedir = async () => {
    setEstado({ cargando: true, error: "", datos: null });
    setMarcadas(new Set());
    try {
      setEstado({ cargando: false, error: "", datos: await sugerirPreguntas(idVacante, modo) });
    } catch (e) {
      setEstado({ cargando: false, error: mensajeErrorIa(e), datos: null });
    }
  };
  const alternar = (i) => setMarcadas((m) => {
    const n = new Set(m);
    if (n.has(i)) n.delete(i);
    else if (n.size < espacio) n.add(i);
    return n;
  });
  const agregar = () => {
    const elegidas = sugerencias.filter((_, i) => marcadas.has(i)).map(sugerenciaAPregunta);
    if (!elegidas.length) return;
    onAgregar(elegidas);
    setEstado({ cargando: false, error: "", datos: null });
    setMarcadas(new Set());
  };
  const cerrar = () => { setEstado({ cargando: false, error: "", datos: null }); setMarcadas(new Set()); };

  if (!estado.datos) {
    return (
      <div className="grid gap-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3" {...(modo === "entrevista" ? { "data-generar-entrevista": "" } : { "data-sugerir-ia": "" })}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="min-w-0 flex-1 basis-56 text-[13px] text-violet-950">
            <span className="font-semibold">{t.invita}</span> {t.detalle}
          </p>
          <Button type="button" variant="outline" onClick={pedir} disabled={estado.cargando || espacio === 0} {...(modo === "entrevista" ? { "data-boton-generar-entrevista": "" } : { "data-boton-sugerir": "" })}
            startIcon={estado.cargando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            className="min-h-11 w-full border-violet-300 bg-white text-violet-900 hover:bg-violet-100 sm:w-auto md:min-h-9">
            {estado.cargando ? "Pensando…" : t.boton}
          </Button>
        </div>
        {espacio === 0 ? <p className="text-[13px] text-violet-900">Ya no caben más {t.lleno}: quita alguna para pedir sugerencias.</p> : null}
        {estado.error ? <p role="alert" className="rounded-lg border border-red-200 bg-white p-2.5 text-[13px] text-red-800">{estado.error}</p> : null}
      </div>
    );
  }

  const aviso = textoDescartadas(estado.datos.descartadas);
  return (
    <section aria-label="Sugerencias de Adamia AI" className="grid gap-3 rounded-xl border border-violet-300 bg-white p-3 sm:p-4" {...(modo === "entrevista" ? { "data-sugerencias-entrevista": "" } : { "data-sugerencias-ia": "" })}>
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-gray-900">Sugerencias de Adamia AI</h3>
          <p className="text-[13px] text-gray-600">Marca las que quieras agregar (caben {espacio} más). Revísalas: puedes editarlas después.</p>
        </div>
        <button type="button" onClick={cerrar} aria-label="Cerrar sugerencias" className="grid size-11 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 md:size-9">
          <X className="size-4" />
        </button>
      </div>
      {aviso ? <p role="status" className="rounded-lg bg-amber-50 p-2.5 text-[13px] text-amber-900">{aviso}</p> : null}
      <ul className="grid gap-2">
        {sugerencias.map((s, i) => {
          const marcada = marcadas.has(i);
          const lleno = !marcada && marcadas.size >= espacio;
          return (
            <li key={i}>
              <label className={`flex min-h-11 cursor-pointer gap-3 rounded-lg border p-3 ${marcada ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-white"} ${lleno ? "cursor-not-allowed opacity-60" : ""}`}
                data-sugerencia={i}>
                <input type="checkbox" checked={marcada} disabled={lleno} onChange={() => alternar(i)} className="mt-0.5 size-5 shrink-0 accent-violet-700" />
                <span className="grid min-w-0 gap-1">
                  <span className="text-[14px] font-semibold text-gray-900 [overflow-wrap:anywhere]">{s.texto}</span>
                  <span className="text-[13px] text-gray-600 [overflow-wrap:anywhere]">
                    {tipoTexto(s.tipo)}{s.opciones?.length ? `: ${s.opciones.join(" · ")}` : ""}
                  </span>
                  <span className="text-[13px] text-gray-700">{s.uso === "dato" ? `Solo informa · ${s.obligatoria === false ? "opcional" : "obligatorio"}` : textoSeveridadSugerencia(s)}</span>
                  {s.motivo ? <span className="text-[13px] italic text-gray-500 [overflow-wrap:anywhere]">{s.motivo}</span> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={pedir} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Pedir otras</Button>
        <Button type="button" onClick={agregar} disabled={!marcadas.size} startIcon={<Check className="size-4" />} className="min-h-11 flex-1 sm:flex-none md:min-h-9" data-agregar-sugerencias>
          Agregar {marcadas.size ? `(${marcadas.size})` : ""}
        </Button>
      </div>
      <p className="text-[13px] text-gray-500">Adamia AI solo ve los datos de la vacante. Cada sugerencia usa créditos de Adamia AI.</p>
    </section>
  );
}
