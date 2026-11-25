"use client";

// Editor de una plantilla de la empresa: secciones y preguntas (escala 1–5, sí/no, eNPS 0–10, opción y abierta).
// Se guarda solo (con versión: si alguien más guardó, avisa). «Siguiente: lanzar» crea la encuesta en borrador.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  TIPOS,
  agregarPregunta,
  agregarSeccion,
  cambiarPregunta,
  minutosEstimados,
  moverPregunta,
  nuevaPregunta,
  preguntasDe,
  quitarPregunta,
  textoMinutos,
} from "@/lib/clima/modelo.mjs";
import { Boton, Cargando, Tarjeta, Vacio, errorDe, get, ruta } from "./ui";
import Contestar from "./Contestar";

const campo = "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
// Las preguntas nuevas de la IA van a la última sección que no sea solo de preguntas abiertas.
const seccionCerrada = (d) => {
  const i = d.secciones.findLastIndex((s) => s.preguntas.some((q) => q.tipo !== "abierta"));
  return i >= 0 ? i : d.secciones.length - 1;
};

function Pregunta({ q, numero, dimensiones, alCambiar, alMover, alQuitar, primera, ultima, extra }) {
  return (
    <li className="rounded-xl border border-slate-200 p-3" aria-label={`Pregunta ${numero}`}>
      <div className="flex items-start gap-2">
        <span className="mt-2 grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
          {numero}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <label className="block">
            <span className="sr-only">Texto de la pregunta {numero}</span>
            <textarea
              rows={2}
              value={q.texto}
              maxLength={300}
              onChange={(e) => alCambiar({ texto: e.target.value })}
              className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-[14px]"
              placeholder="Escribe la pregunta"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <label className="min-w-[150px] flex-1 sm:flex-none">
              <span className="sr-only">Tipo de la pregunta {numero}</span>
              <select className={campo} value={q.tipo} onChange={(e) => alCambiar({ tipo: e.target.value })}>
                {Object.entries(TIPOS).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            {dimensiones.length && !["abierta", "enps"].includes(q.tipo) ? (
              <label className="min-w-[150px] flex-1 sm:flex-none">
                <span className="sr-only">Dimensión de la pregunta {numero}</span>
                <select className={campo} value={q.dimension ?? ""} onChange={(e) => alCambiar({ dimension: e.target.value || null })}>
                  <option value="">Sin dimensión</option>
                  {dimensiones.map((d) => (
                    <option key={d.clave} value={d.clave}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          {q.tipo === "opcion" ? (
            <div className="space-y-1">
              {(q.opciones ?? []).map((o, i) => (
                <div key={o.valor} className="flex gap-2">
                  <input
                    aria-label={`Opción ${i + 1} de la pregunta ${numero}`}
                    className={campo}
                    value={o.texto}
                    onChange={(e) => alCambiar({ opciones: q.opciones.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)) })}
                  />
                  <button
                    type="button"
                    aria-label={`Quitar opción ${i + 1}`}
                    disabled={q.opciones.length <= 2}
                    className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 disabled:opacity-40"
                    onClick={() => alCambiar({ opciones: q.opciones.filter((_, k) => k !== i) })}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {q.opciones.length < 10 ? (
                <Boton
                  variante="fantasma"
                  onClick={() =>
                    alCambiar({
                      opciones: [...q.opciones, { valor: `o${Date.now().toString(36)}`, texto: `Opción ${q.opciones.length + 1}` }],
                    })
                  }
                >
                  + Opción
                </Boton>
              ) : null}
            </div>
          ) : null}
          {extra}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            aria-label={`Subir pregunta ${numero}`}
            disabled={primera}
            onClick={() => alMover(-1)}
            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          >
            <ArrowUp className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Bajar pregunta ${numero}`}
            disabled={ultima}
            onClick={() => alMover(1)}
            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          >
            <ArrowDown className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Quitar pregunta ${numero}`}
            onClick={alQuitar}
            className="grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

export default function Editor({ id, idEmpresa, revision: RevisionIa = null }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data, error } = useSWR(ruta(`/plantillas/${id}`, idEmpresa), get, { revalidateOnFocus: false });
  const [p, setP] = useState(null);
  const [estado, setEstado] = useState("guardado");
  const [previa, setPrevia] = useState(false);
  const [lanzando, setLanzando] = useState(false);
  const pendiente = useRef(null);
  const actual = useRef(null);
  const revision = useRef(null);
  const cola = useRef(Promise.resolve(true));
  useEffect(() => {
    if (data?.plantilla && !p) {
      setP(data.plantilla);
      revision.current = data.plantilla.revision;
    }
  }, [data, p]);
  actual.current = p;

  // Los guardados van en fila: cada uno usa la versión que devolvió el anterior (si no, el servidor diría «alguien más guardó»).
  const guardarAhora = async () => {
    const x = actual.current;
    if (!x) return true;
    setEstado("guardando");
    try {
      const r = await axios.put(ruta(`/plantillas/${id}`, idEmpresa), {
        nombre: x.nombre,
        descripcion: x.descripcion,
        definicion: x.definicion,
        revision: revision.current,
      });
      revision.current = r.data.plantilla.revision;
      setEstado("guardado");
      return true;
    } catch (e) {
      setEstado("error");
      enqueueSnackbar(errorDe(e), { variant: "error" });
      return false;
    }
  };
  const guardar = () => {
    cola.current = cola.current.then(guardarAhora);
    return cola.current;
  };
  const cambiar = (fn) => {
    setP((v) => fn(v));
    setEstado("sin guardar");
    clearTimeout(pendiente.current);
    pendiente.current = setTimeout(guardar, 1200);
  };
  useEffect(() => () => clearTimeout(pendiente.current), []);
  // Cada plantilla empieza sin la revisión de Adamia AI de otra.
  useEffect(() => {
    RevisionIa?.limpiar?.();
  }, [RevisionIa]);

  if (error) return <Vacio titulo="No se pudo abrir la encuesta" texto={errorDe(error)} />;
  if (!p) return <Cargando />;
  const def = p.definicion;
  const total = preguntasDe(def).length;
  const conDef = (fn) => cambiar((v) => ({ ...v, definicion: fn(v.definicion) }));

  const lanzar = async () => {
    clearTimeout(pendiente.current);
    if (!total) return enqueueSnackbar("Agrega al menos una pregunta.", { variant: "warning" });
    setLanzando(true);
    if (!(await guardar())) return setLanzando(false);
    try {
      const r = await axios.post(ruta("/campanias", idEmpresa), { id_plantilla: id, nombre: actual.current.nombre });
      router.push(`/panel/clima/encuestas/lanzar/${r.data.campania.id}`);
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
      setLanzando(false);
    }
    return undefined;
  };
  let numero = 0;
  const vista = { id: 0, tipo: "clima", nombre: p.nombre, secciones: def.secciones.filter((s) => s.preguntas.length) };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/panel/clima/encuestas" className="text-sm font-semibold text-brand">
          ‹ Plantillas
        </Link>
        <span role="status" className="text-[12.5px] text-slate-500">
          {{ guardado: "Borrador guardado", guardando: "Guardando…", "sin guardar": "Cambios sin guardar", error: "No se guardó" }[estado]}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Boton onClick={() => setPrevia(true)} disabled={!total}>
            Vista previa
          </Boton>
          <Boton variante="primario" onClick={lanzar} disabled={lanzando}>
            {lanzando ? "Preparando…" : "Siguiente: lanzar →"}
          </Boton>
        </div>
      </div>
      <label className="block">
        <span className="text-[13px] font-semibold text-slate-600">Nombre de la encuesta</span>
        <input
          className={`${campo} mt-1 h-11 text-[15px] font-semibold`}
          value={p.nombre}
          maxLength={160}
          onChange={(e) => cambiar((v) => ({ ...v, nombre: e.target.value }))}
        />
      </label>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {def.secciones.map((s, si) => (
            <Tarjeta key={s.clave} etiqueta={`Sección ${si + 1}`}>
              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Sección {si + 1}</span>
                <input
                  className={`${campo} mt-1 font-semibold`}
                  value={s.titulo}
                  maxLength={120}
                  onChange={(e) =>
                    conDef((d) => ({ ...d, secciones: d.secciones.map((x, k) => (k === si ? { ...x, titulo: e.target.value } : x)) }))
                  }
                />
              </label>
              <ol className="mt-3 space-y-2">
                {s.preguntas.map((q, qi) => {
                  numero += 1;
                  return (
                    <Pregunta
                      key={q.clave}
                      q={q}
                      numero={numero}
                      dimensiones={def.dimensiones ?? []}
                      primera={qi === 0}
                      ultima={qi === s.preguntas.length - 1}
                      alCambiar={(c) => conDef((d) => cambiarPregunta(d, q.clave, c))}
                      alMover={(paso) => conDef((d) => moverPregunta(d, q.clave, paso))}
                      alQuitar={() => conDef((d) => quitarPregunta(d, q.clave))}
                      extra={
                        RevisionIa ? (
                          <RevisionIa.EnPregunta
                            clave={q.clave}
                            alUsar={(textos) => conDef((d) => RevisionIa.aplicar(d, q.clave, textos))}
                          />
                        ) : null
                      }
                    />
                  );
                })}
              </ol>
              <Boton
                variante="fantasma"
                className="mt-2"
                aria-label={`Agregar pregunta a la sección ${si + 1}`}
                onClick={() => conDef((d) => agregarPregunta(d, si, nuevaPregunta("escala")))}
              >
                <Plus className="size-4" /> Pregunta
              </Boton>
            </Tarjeta>
          ))}
          <div className="flex flex-wrap gap-2">
            <Boton onClick={() => conDef(agregarSeccion)}>
              <Plus className="size-4" /> Sección
            </Boton>
            {RevisionIa ? (
              <RevisionIa.MasPreguntas
                idEmpresa={idEmpresa}
                definicion={def}
                alAgregar={(qs) => conDef((d) => qs.reduce((x, q) => agregarPregunta(x, seccionCerrada(x), q), d))}
              />
            ) : null}
          </div>
        </div>
        <aside className="min-w-0 space-y-4">
          {RevisionIa ? (
            <RevisionIa.Panel idEmpresa={idEmpresa} definicion={def} />
          ) : (
            <Tarjeta titulo="Resumen">
              <p className="text-sm text-slate-600">
                {total} preguntas · unos {textoMinutos(minutosEstimados(def))}.
              </p>
            </Tarjeta>
          )}
          <Tarjeta titulo="Privacidad">
            <ul className="space-y-2 text-[13px] text-slate-700">
              <li>✓ Respuestas anónimas: la respuesta no se guarda con el nombre de nadie.</li>
              <li>✓ El área o el jefe solo se usan para agrupar; los resultados se ven desde 1 respuesta.</li>
              <li>! En equipos pequeños RH podría deducir quién contestó: a tu gente se le avisa al contestar.</li>
            </ul>
          </Tarjeta>
        </aside>
      </div>

      <Dialog open={previa} onOpenChange={setPrevia}>
        <DialogContent className="max-h-[92vh] max-w-[420px] overflow-y-auto p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Vista previa</DialogTitle>
            <DialogDescription>Así la ve tu gente en el celular. No se guarda nada.</DialogDescription>
          </DialogHeader>
          <Contestar encuesta={vista} vistaPrevia />
        </DialogContent>
      </Dialog>
    </div>
  );
}
