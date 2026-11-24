"use client";

// Adamia AI al armar encuestas: crear a partir de una descripción, revisar preguntas (sesgadas, dobles o que identifican)
// con propuesta de redacción y «Pedir 3 preguntas más». Solo con Adamia AI contratada; muestra el uso del mes.
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { aplicarPropuesta, minutosEstimados, nuevaPregunta, preguntasDe, textoMinutos } from "@/lib/clima/modelo.mjs";
import { Boton, ChipIA, Tarjeta, errorDe, get, ruta } from "./ui";

const LLAVE_REVISION = "clima:revision-ia";
const IDEAS = [
  "¿Por qué se va la gente?",
  "¿Cómo están mis jefes?",
  "Después de un cambio de horarios",
  "Primeros 90 días del nuevo ingreso",
];
const PROBLEMA = { sesgada: "influye en la respuesta", doble: "pregunta dos cosas", identificante: "podría identificar a alguien" };

export function useIaEstado(idEmpresa) {
  return useSWR(idEmpresa ? ruta("/ia/estado", idEmpresa) : null, get, { shouldRetryOnError: false });
}

export function UsoIa({ idEmpresa }) {
  const { data } = useIaEstado(idEmpresa);
  if (!data) return null;
  if (!data.activo)
    return (
      <p className="text-[12.5px] text-slate-500">
        Adamia AI no está activa en tu empresa. El dueño la enciende desde el botón «Adamia AI».
      </p>
    );
  return (
    <p className="text-[12.5px] text-slate-500">
      Uso de Adamia AI este mes: {data.usos_mes} consultas · ${Number(data.gasto_mes_usd).toFixed(2)} de $
      {Number(data.tope_mensual_usd).toFixed(2)} USD.
    </p>
  );
}

export function CrearConIa({ idEmpresa }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const ia = useIaEstado(idEmpresa);
  const [texto, setTexto] = useState("");
  const [armando, setArmando] = useState(false);
  const activa = ia.data?.activo === true;
  const armar = async () => {
    setArmando(true);
    try {
      const r = await axios.post(ruta("/ia/crear", idEmpresa), { descripcion: texto });
      const p = await axios.post(ruta("/plantillas", idEmpresa), { nombre: r.data.nombre, definicion: r.data.definicion });
      const n = preguntasDe(r.data.definicion).length;
      enqueueSnackbar(
        `Adamia AI armó ${n} preguntas en ${r.data.definicion.secciones.length} secciones. Cambia, quita o agrega lo que quieras.`,
        { variant: "success" }
      );
      ia.mutate();
      router.push(`/panel/clima/encuestas/editor/${p.data.plantilla.id}`);
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
      setArmando(false);
    }
  };
  return (
    <section
      aria-label="Créala con Adamia AI"
      className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-bold text-slate-900">Créala con Adamia AI</h2>
        <ChipIA>Incluido en tu plan de IA</ChipIA>
      </div>
      <label className="mt-3 block">
        <span className="text-[13px] font-semibold text-slate-700">Qué quieres medir</span>
        <textarea
          rows={3}
          maxLength={1500}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={!activa}
          className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-[14px] disabled:bg-slate-50"
          placeholder="Ej. Tenemos mucha rotación en las sucursales y quiero saber por qué se van los cajeros nuevos."
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {IDEAS.map((t) => (
          <button
            key={t}
            type="button"
            disabled={!activa}
            onClick={() => setTexto(t)}
            className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[12.5px] text-violet-900 disabled:opacity-50"
          >
            {t}
          </button>
        ))}
        <Boton variante="primario" className="ml-auto" disabled={!activa || texto.trim().length < 10 || armando} onClick={armar}>
          {armando ? "Armando…" : "Armar encuesta"}
        </Boton>
      </div>
      <div className="mt-2">
        <UsoIa idEmpresa={idEmpresa} />
      </div>
    </section>
  );
}

// Revisión: la hace el panel lateral y cada pregunta muestra su hallazgo (estado compartido en SWR).
function Panel({ idEmpresa, definicion }) {
  const { enqueueSnackbar } = useSnackbar();
  const ia = useIaEstado(idEmpresa);
  const { data: rev } = useSWR(LLAVE_REVISION, null);
  const [revisando, setRevisando] = useState(false);
  const revisar = async () => {
    setRevisando(true);
    try {
      const r = await axios.post(ruta("/ia/revisar", idEmpresa), { definicion });
      mutate(LLAVE_REVISION, { ...r.data, ignoradas: [] }, false);
      ia.mutate();
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    } finally {
      setRevisando(false);
    }
  };
  const pendientes = (rev?.hallazgos ?? []).filter((h) => !rev.ignoradas.includes(h.clave));
  const numero = (clave) => preguntasDe(definicion).findIndex((q) => q.clave === clave) + 1;
  return (
    <Tarjeta titulo="Revisión de Adamia AI" accion={<ChipIA />}>
      <ul className="space-y-2 text-[13px] text-slate-700">
        <li>
          ✓ Duración: <strong>{textoMinutos(minutosEstimados(definicion))}</strong>.
        </li>
        {rev
          ? pendientes.map((h) => (
              <li key={h.clave} className="text-amber-900">
                ! La pregunta {numero(h.clave)} {h.problemas.map((p) => PROBLEMA[p]).join(" y ")}.
              </li>
            ))
          : null}
        {rev && !pendientes.length ? <li>✓ Sin preguntas sesgadas, dobles ni que identifiquen.</li> : null}
        {rev?.lenguajeClaro ? <li>✓ Lenguaje claro para personal operativo.</li> : null}
      </ul>
      <Boton
        variante="ia"
        className="mt-3 w-full"
        onClick={revisar}
        disabled={revisando || ia.data?.activo !== true || !preguntasDe(definicion).length}
      >
        {revisando ? "Revisando…" : rev ? "Revisar otra vez" : "Revisar preguntas"}
      </Boton>
      <div className="mt-2">
        <UsoIa idEmpresa={idEmpresa} />
      </div>
    </Tarjeta>
  );
}

function EnPregunta({ clave, alUsar }) {
  const { data: rev } = useSWR(LLAVE_REVISION, null);
  const h = rev?.hallazgos?.find((x) => x.clave === clave);
  if (!h || rev.ignoradas.includes(clave)) return null;
  const quitar = () => mutate(LLAVE_REVISION, { ...rev, ignoradas: [...rev.ignoradas, clave] }, false);
  return (
    <div role="note" className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-[13px] text-violet-950">
      <p className="font-semibold">Adamia AI · esta pregunta {h.problemas.map((p) => PROBLEMA[p]).join(" y ")}</p>
      {h.explicacion ? <p className="mt-1">{h.explicacion}</p> : null}
      {h.propuesta.length ? (
        <p className="mt-1">
          Propuesta:{" "}
          {h.propuesta.map((t, i) => (
            <span key={t}>
              {i ? " + " : ""}«{t}»
            </span>
          ))}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {h.propuesta.length ? (
          <Boton
            variante="ia"
            onClick={() => {
              alUsar(h.propuesta);
              quitar();
            }}
          >
            Usar propuesta
          </Boton>
        ) : null}
        <Boton variante="fantasma" onClick={quitar}>
          Dejar como está
        </Boton>
      </div>
    </div>
  );
}

function MasPreguntas({ idEmpresa, definicion, alAgregar }) {
  const { enqueueSnackbar } = useSnackbar();
  const ia = useIaEstado(idEmpresa);
  const [pidiendo, setPidiendo] = useState(false);
  const pedir = async () => {
    setPidiendo(true);
    try {
      const r = await axios.post(ruta("/ia/mas-preguntas", idEmpresa), { definicion });
      alAgregar(r.data.preguntas.map((q) => ({ ...nuevaPregunta(q.tipo, q.texto), dimension: q.dimension ?? null })));
      enqueueSnackbar(`Se agregaron ${r.data.preguntas.length} preguntas al final.`, { variant: "success" });
      ia.mutate();
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    } finally {
      setPidiendo(false);
    }
  };
  return (
    <Boton variante="ia" onClick={pedir} disabled={pidiendo || ia.data?.activo !== true}>
      {pidiendo ? "Pensando…" : "Pedir 3 preguntas más a Adamia AI"}
    </Boton>
  );
}

export const RevisionIa = {
  Panel,
  EnPregunta,
  MasPreguntas,
  aplicar: aplicarPropuesta,
  limpiar: () => mutate(LLAVE_REVISION, undefined, false),
};
