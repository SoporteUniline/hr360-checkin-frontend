"use client";

// Adamia AI sobre resultados cerrados: temas de los comentarios (con cita anonimizada), plan de acción por área y
// programa de intervención NOM-035, que se pueden convertir en tareas del módulo de Tareas.
import { useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { masDias } from "@/lib/clima/modelo.mjs";
import { Boton, ChipIA, Tarjeta, errorDe, get, ruta } from "./ui";
import { useIaEstado, UsoIa } from "./IaEncuesta";

const hoyMx = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

// Lo ya generado se consulta sin gastar IA (soloGuardado); «Generar» sí llama a la IA.
function useIaGuardada(idEmpresa, idCampania, tipo) {
  return useSWR(
    ruta(`/campanias/${idCampania}/ia/${tipo}`, idEmpresa),
    (url) => axios.post(url, { soloGuardado: true }).then((r) => r.data),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );
}

function useGenerar(idEmpresa, idCampania, tipo, guardada) {
  const { enqueueSnackbar } = useSnackbar();
  const ia = useIaEstado(idEmpresa);
  const [generando, setGenerando] = useState(false);
  const generar = async (regenerar = false) => {
    setGenerando(true);
    try {
      const r = await axios.post(ruta(`/campanias/${idCampania}/ia/${tipo}`, idEmpresa), { regenerar });
      guardada.mutate(r.data, false);
      ia.mutate();
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    } finally {
      setGenerando(false);
    }
  };
  return { generar, generando, activa: ia.data?.activo === true };
}

function Temas({ idEmpresa, idCampania }) {
  const g = useIaGuardada(idEmpresa, idCampania, "temas");
  const { generar, generando, activa } = useGenerar(idEmpresa, idCampania, "temas", g);
  const d = g.data && !g.data.vacio ? g.data : null;
  return (
    <Tarjeta titulo="Lo que dicen" accion={<ChipIA>{d ? `Adamia AI · ${d.comentarios} comentarios` : "Adamia AI"}</ChipIA>}>
      {d ? (
        <>
          <ul className="space-y-1.5">
            {d.temas.map((t) => (
              <li key={t.tema} className="flex items-center justify-between gap-2 text-[13.5px]">
                <span className="min-w-0 truncate font-semibold text-slate-800">{t.tema}</span>
                <span className="shrink-0 text-slate-500">{t.menciones} menciones</span>
              </li>
            ))}
          </ul>
          {d.temas[0]?.cita ? (
            <blockquote className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[13px] italic text-slate-700">
              «{d.temas[0].cita}»
              <span className="mt-1 block text-[11.5px] not-italic text-slate-500">Comentario representativo · anonimizado</span>
            </blockquote>
          ) : null}
          {d.loMejor ? <p className="mt-2 text-[12.5px] text-slate-600">Lo mejor valorado: {d.loMejor}</p> : null}
        </>
      ) : (
        <p className="text-[13px] text-slate-600">Agrupa los comentarios abiertos en temas. A la IA solo van textos sin nombres ni área.</p>
      )}
      <Boton variante="ia" className="mt-3 w-full" onClick={() => generar(Boolean(d))} disabled={generando || !activa}>
        {generando ? "Agrupando…" : d ? "Volver a agrupar" : "Agrupar comentarios"}
      </Boton>
    </Tarjeta>
  );
}

export function ConvertirTareas({ idEmpresa, acciones, abierto, alCerrar }) {
  const { enqueueSnackbar } = useSnackbar();
  const opciones = useSWR(abierto ? ruta("/opciones", idEmpresa) : null, get);
  const [filas, setFilas] = useState(null);
  const [creando, setCreando] = useState(false);
  if (abierto && !filas) {
    setFilas(acciones.map((a) => ({ ...a, elegida: true, responsable: "", fecha: masDias(hoyMx(), a.plazoDias || 30) })));
  }
  const cerrar = () => {
    setFilas(null);
    alCerrar();
  };
  const crear = async () => {
    setCreando(true);
    let hechas = 0;
    try {
      for (const f of filas.filter((x) => x.elegida)) {
        await axios.post("/checador/tareas/tareas", {
          empresa: idEmpresa,
          titulo: f.titulo.slice(0, 200),
          descripcion: f.descripcion,
          id_responsable: Number(f.responsable),
          fecha_limite: f.fecha,
          prioridad: "media",
        });
        hechas += 1;
      }
      enqueueSnackbar(`Se crearon ${hechas} tareas en el módulo de Tareas.`, { variant: "success" });
      cerrar();
    } catch (e) {
      enqueueSnackbar(`${hechas ? `Se crearon ${hechas}. ` : ""}${errorDe(e)}`, { variant: "error" });
    } finally {
      setCreando(false);
    }
  };
  const listas = filas?.filter((x) => x.elegida) ?? [];
  return (
    <Dialog open={abierto} onOpenChange={(v) => (v ? null : cerrar())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convertir en tareas</DialogTitle>
          <DialogDescription>Cada acción queda como una tarea con responsable y fecha en el módulo de Tareas.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {(filas ?? []).map((f, i) => (
            <li key={i} className="rounded-xl border border-slate-200 p-3">
              <label className="flex items-start gap-2 text-sm font-semibold text-slate-900">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 accent-blue-600"
                  checked={f.elegida}
                  onChange={(e) => setFilas((xs) => xs.map((x, k) => (k === i ? { ...x, elegida: e.target.checked } : x)))}
                />
                <span className="min-w-0">{f.titulo}</span>
              </label>
              {f.elegida ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-[12.5px] text-slate-600">
                    Responsable
                    <select
                      aria-label={`Responsable de «${f.titulo.slice(0, 40)}»`}
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm"
                      value={f.responsable}
                      onChange={(e) => setFilas((xs) => xs.map((x, k) => (k === i ? { ...x, responsable: e.target.value } : x)))}
                    >
                      <option value="">Elige a la persona</option>
                      {(opciones.data?.personas ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                          {p.puesto ? ` · ${p.puesto}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[12.5px] text-slate-600">
                    Fecha límite
                    <input
                      type="date"
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm"
                      value={f.fecha}
                      onChange={(e) => setFilas((xs) => xs.map((x, k) => (k === i ? { ...x, fecha: e.target.value } : x)))}
                    />
                  </label>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Boton onClick={cerrar}>Cancelar</Boton>
          <Boton variante="primario" onClick={crear} disabled={creando || !listas.length || listas.some((x) => !x.responsable)}>
            {creando ? "Creando…" : `Crear ${listas.length} tareas`}
          </Boton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Plan({ idEmpresa, idCampania, nom035 = false }) {
  const g = useIaGuardada(idEmpresa, idCampania, "plan");
  const { generar, generando, activa } = useGenerar(idEmpresa, idCampania, "plan", g);
  const [tareas, setTareas] = useState(false);
  const d = g.data && !g.data.vacio ? g.data : null;
  const lista = nom035 ? d?.programaNom035 ?? [] : d?.acciones ?? [];
  const acciones = nom035
    ? lista.map((a) => ({
        titulo: `NOM-035 · ${a.dominio}: ${a.acciones}`,
        descripcion: `Nivel ${a.nivel}. Evaluación: ${a.evaluacion}`,
        plazoDias: a.plazoDias,
      }))
    : lista.map((a) => ({
        titulo: `${a.grupo} · ${a.tema}: ${a.accion}`,
        descripcion: a.indicador ? `Cómo medirlo: ${a.indicador}` : "",
        plazoDias: a.plazoDias,
      }));
  return (
    <Tarjeta titulo={nom035 ? "Programa de intervención" : "Plan de acción sugerido"} accion={<ChipIA />}>
      {lista.length ? (
        <ul className="space-y-2">
          {lista.map((a, i) => (
            <li key={i} className="text-[13.5px] text-slate-700">
              <strong className="text-slate-900">
                {nom035 ? `${a.dominio} · ${a.nivel.toLowerCase()}` : `${a.grupo} · ${a.tema.toLowerCase()}`}:
              </strong>{" "}
              {nom035 ? a.acciones : a.accion}
              {a.responsable ? <span className="text-slate-500"> Responsable: {a.responsable}.</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-slate-600">
          {nom035
            ? "Arma el programa de intervención (8.4) para los dominios en nivel medio o mayor."
            : "Propone acciones concretas para las áreas y dimensiones más bajas. A la IA solo van números agregados, sin nombres."}
        </p>
      )}
      <div className="mt-3 grid gap-2">
        <Boton variante="ia" className="w-full" onClick={() => generar(Boolean(d))} disabled={generando || !activa}>
          {generando ? "Pensando…" : d ? "Volver a proponer" : nom035 ? "Proponer programa" : "Proponer plan"}
        </Boton>
        {lista.length ? (
          <Boton variante="primario" className="w-full" onClick={() => setTareas(true)}>
            {nom035 ? "Crear acciones y responsables →" : "Convertir en tareas →"}
          </Boton>
        ) : null}
      </div>
      <div className="mt-2">
        <UsoIa idEmpresa={idEmpresa} />
      </div>
      <ConvertirTareas idEmpresa={idEmpresa} acciones={acciones} abierto={tareas} alCerrar={() => setTareas(false)} />
    </Tarjeta>
  );
}

// Columna derecha del tablero de clima y bloque del programa NOM-035.
export const iaTablero = (idEmpresa) =>
  function IaTablero({ resultado }) {
    return (
      <>
        <Temas idEmpresa={idEmpresa} idCampania={resultado.campania.id} />
        <Plan idEmpresa={idEmpresa} idCampania={resultado.campania.id} />
      </>
    );
  };

export const iaNom035 = (idEmpresa) =>
  function IaNom035({ resultado }) {
    if (!resultado?.nom035) return null;
    return <Plan idEmpresa={idEmpresa} idCampania={resultado.campania.id} nom035 />;
  };
