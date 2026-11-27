"use client";

// Tablas fiscales de la nómina formal (solo administradores de ADAMIA confirman). Cada valor con su cifra, vigencia,
// fuente (DOF, SAT, IMSS) y estado; «Confirmar» guarda que un contador lo cotejó contra la publicación oficial.
// Mientras haya valores del año por confirmar, ninguna empresa puede encender la nómina formal.
// Backend: GET /checador/nomina/tablas-fiscales · POST /checador/nomina/tablas-fiscales/confirmar
// (hr360-checkin-backend/docs/nomina-formal.md). Es una página, no una ventana; letra de 16 px o más y botones de 48 px.
import { useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { Aviso, BOTON, CAMPO, Etiqueta } from "@/components/nomina/PiezasFormal";
import { ESTADO_TABLA, agruparTablas, vigencia } from "@/lib/nomina/formal.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const mensaje = (e, d) => e?.response?.data?.error || d;

function Fuente({ fuente }) {
  if (!fuente) return null;
  return (
    <div className="grid gap-1 text-base text-slate-700">
      <p><b className="text-[#0B1033]">Fuente ({fuente.tipo}):</b> {fuente.referencia}</p>
      {fuente.url ? <a href={fuente.url} target="_blank" rel="noopener noreferrer" className="w-fit break-all font-bold text-[#1D3FB8] underline">Publicación oficial</a> : null}
      {(fuente.secundarias ?? []).length ? (
        <details>
          <summary className="cursor-pointer font-bold text-[#0B1033]">Fuentes secundarias ({fuente.secundarias.length})</summary>
          <ul className="mt-1 grid gap-1 pl-4">
            {fuente.secundarias.map((s) => <li key={s} className="break-all">{/^https:\/\//.test(s) ? <a href={s} target="_blank" rel="noopener noreferrer" className="underline">{s}</a> : s}</li>)}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function Valor({ v, puede, alConfirmar }) {
  const [nota, setNota] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const e = ESTADO_TABLA[v.estado] ?? ESTADO_TABLA.por_confirmar;
  return (
    <li className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5" data-valor={v.clave}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h3 className="text-lg font-bold text-[#0B1033]">{v.nombre}</h3>
          <p className="text-base text-slate-700">Vigencia: {vigencia(v)}</p>
        </div>
        <Etiqueta tono={e.tono}>{e.texto}</Etiqueta>
      </div>
      <p className="break-words text-base text-[#0B1033]" data-cifra>{v.texto}</p>
      {v.nota ? <p className="text-base text-amber-900">{v.nota}</p> : null}
      <Fuente fuente={v.fuente} />
      {v.confirmacion ? (
        <p className="text-base text-emerald-900">Confirmado por {v.confirmacion.por ?? "—"}{v.confirmacion.nota ? `: ${v.confirmacion.nota}` : ""}</p>
      ) : null}
      {puede && v.estado !== "confirmado" ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-1.5 text-base font-bold">
            Nota (opcional)
            <input className={CAMPO} value={nota} maxLength={300} placeholder="Quién lo cotejó y contra qué" onChange={(x) => setNota(x.target.value)} />
          </label>
          <button type="button" className={BOTON} disabled={ocupado} aria-label={`Confirmar ${v.nombre}`}
            onClick={async () => { setOcupado(true); await alConfirmar(v, nota); setOcupado(false); }}>
            Confirmar
          </button>
        </div>
      ) : null}
    </li>
  );
}

export default function TablasFiscalesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, error, isLoading, mutate } = useSWR("/checador/nomina/tablas-fiscales", get);

  const confirmar = async (v, nota) => {
    try {
      await axios.post("/checador/nomina/tablas-fiscales/confirmar", { clave: v.clave, huella: v.huella, nota: nota || null });
      enqueueSnackbar(`${v.nombre}: confirmado.`, { variant: "success" });
    } catch (e) {
      enqueueSnackbar(mensaje(e, "No se pudo confirmar."), { variant: "error" });
    } finally {
      await mutate();
    }
  };

  const grupos = agruparTablas(data?.valores ?? []);
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 text-base text-[#0B1033]" data-pagina="tablas-fiscales">
      <header className="grid gap-2">
        <h1 className="text-3xl font-bold">Tablas fiscales de la nómina</h1>
        <p className="text-[17px] text-slate-700">UMA, salario mínimo, tarifa del ISR, subsidio para el empleo y cuotas del IMSS con su vigencia y su fuente. Confirma cada valor solo después de que un contador lo coteje contra la publicación oficial.</p>
      </header>
      {error ? <Aviso tono="rojo">{mensaje(error, "No se pudieron cargar las tablas.")}</Aviso> : isLoading || !data ? <p role="status">Cargando…</p> : (
        <>
          <Aviso tono={data.pendientes_anio ? "ambar" : "verde"} titulo={data.pendientes_anio ? `${data.pendientes_anio} valor${data.pendientes_anio === 1 ? "" : "es"} de ${data.anio} por confirmar` : `Las tablas de ${data.anio} están confirmadas`}>
            <p>{data.pendientes_anio ? "Mientras haya valores del año por confirmar, ninguna empresa puede encender la nómina formal." : "Las empresas ya pueden encender la nómina formal."}</p>
          </Aviso>
          {!data.puede_confirmar ? <Aviso tono="azul">Solo un administrador de ADAMIA puede confirmar valores.</Aviso> : null}
          {!data.disponible ? <Aviso tono="rojo">Falta correr la migración de la nómina formal: todavía no se pueden guardar confirmaciones.</Aviso> : null}
          {grupos.map((g, i) => (
            <section key={g.grupo} aria-labelledby={`grupo-${i}`} className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={`grupo-${i}`} className="text-2xl font-bold">{g.grupo}</h2>
                {g.pendientes ? <Etiqueta tono="ambar">{g.pendientes} por confirmar</Etiqueta> : <Etiqueta tono="verde">Todo confirmado</Etiqueta>}
              </div>
              <ul className="grid gap-3">{g.valores.map((v) => <Valor key={v.clave} v={v} puede={data.puede_confirmar && data.disponible} alConfirmar={confirmar} />)}</ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
