"use client";
// Mi espacio → Mi ruta de bienvenida (maqueta 6, aprobada 27/12/2026). El contenido lo define la empresa en su plantilla
// (quiénes somos, su equipo, cómo checar, cursos como contenido o enlace con «marcar como visto», y la encuesta de
// ciclo de vida de Clima de 30/90 días, que solo se enlaza). Solo la ruta del empleado de la sesión.
// Backend: GET /checador/induccion/mi-ruta, POST /mi-ruta/pasos/:paso/visto.
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, ExternalLink, FileText, PlayCircle } from "lucide-react";
import axios from "@/lib/axios";
import { cardClass, DataState } from "@/components/empleado/shared";
import { RUTA_EMPLEADO } from "@/lib/clima/pendientes.mjs";
import { API, fechaLarga } from "@/lib/induccion/induccion.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold disabled:opacity-50";

function Paso({ p, n, alVer }) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const marcar = async () => { setGuardando(true); try { await alVer(p.id); setAbierto(false); } finally { setGuardando(false); } };
  const detalle = p.tipo === "encuesta"
    ? (p.visto ? "Contestada · gracias" : p.disponible ? "Encuesta anónima · ya puedes contestarla" : `Encuesta anónima · se abre el ${fechaLarga(p.abre_el)}`)
    : [p.descripcion, p.duracion_min ? `${p.duracion_min} min` : null, p.obligatorio ? "obligatorio" : null].filter(Boolean).join(" · ");
  return (
    <li className={`${cardClass} grid gap-3 p-4`} data-paso={p.id} data-visto={p.visto ? "si" : "no"}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full text-[15px] font-bold ${p.visto ? "bg-green-100 text-green-700" : "bg-indigo-50 text-indigo-800"}`}>{p.visto ? "✓" : n}</span>
        <span className="min-w-0 flex-1"><b className="block text-[15px]">{p.titulo}</b><span className="block text-[13px] text-slate-600">{detalle}</span></span>
        {p.tipo === "encuesta" ? (
          p.disponible && !p.visto ? <Link href={RUTA_EMPLEADO} className={`${btn} bg-[#2563EB] text-white`}>Contestar</Link> : null
        ) : !p.visto || abierto ? (
          <button type="button" aria-expanded={abierto} onClick={() => setAbierto(!abierto)} className={`${btn} border border-slate-300 bg-white`}>{abierto ? "Cerrar" : "Ver"}</button>
        ) : <button type="button" onClick={() => setAbierto(true)} className={`${btn} text-[#2563EB]`}>Ver de nuevo</button>}
      </div>
      {abierto ? (
        <div className="grid gap-3 border-t border-slate-100 pt-3">
          {p.tipo === "equipo" ? (
            <div className="grid gap-1 text-[15px] text-slate-700">
              {p.jefe ? <p>Tu jefe: <b>{p.jefe}</b></p> : null}
              {p.companeros?.length ? <p>Tus compañeros{p.sucursal ? ` de ${p.sucursal}` : ""}: {p.companeros.join(", ")}.</p> : <p>Pronto conocerás a tu equipo.</p>}
            </div>
          ) : null}
          {p.texto ? <div className="grid gap-2 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{p.texto}</div> : null}
          <div className="flex flex-wrap gap-2">
            {p.video_url ? <a href={p.video_url} target="_blank" rel="noopener noreferrer" className={`${btn} border border-slate-300 bg-white`}><PlayCircle className="size-5" aria-hidden="true" />Ver video<ExternalLink className="size-4" aria-hidden="true" /></a> : null}
            {p.pdf_url ? <a href={p.pdf_url} target="_blank" rel="noopener noreferrer" className={`${btn} border border-slate-300 bg-white`}><FileText className="size-5" aria-hidden="true" />Abrir PDF<ExternalLink className="size-4" aria-hidden="true" /></a> : null}
          </div>
          {!p.visto ? <button type="button" onClick={marcar} disabled={guardando} className={`${btn} bg-[#2563EB] text-white`}>{guardando ? "Guardando…" : "Marcar como visto"}</button> : null}
        </div>
      ) : null}
    </li>
  );
}

export default function RutaBienvenida() {
  const { data, error, isLoading, mutate } = useSWR(`${API}/mi-ruta`, get, { revalidateOnFocus: false });
  const r = data?.ruta;
  const ver = async (paso) => { await axios.post(`${API}/mi-ruta/pasos/${encodeURIComponent(paso)}/visto`); await mutate(); };
  return (
    <div className="space-y-5" data-pantalla="ruta-bienvenida">
      <Link href="/empleado/panel/mi-espacio" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-slate-600"><ArrowLeft className="size-4" aria-hidden="true" />Mi espacio</Link>
      <DataState loading={isLoading} error={error} retry={mutate}>
        {!r ? <p className={`${cardClass} text-[15px] text-slate-600`}>No tienes una ruta de bienvenida.</p> : (
          <>
            <header className={`${cardClass} grid gap-2`}>
              <p className="text-[13px] font-semibold text-slate-500">Mi espacio · ADAMIA</p>
              <h1 className="text-2xl font-bold tracking-tight">¡Te damos la bienvenida a {r.empresa}, {r.nombre}!</h1>
              <p className="text-[15px] text-slate-600" data-ruta-cuenta>Tu ruta de bienvenida: {r.listos} de {r.total} listos</p>
              <span role="progressbar" aria-label="Avance de tu ruta" aria-valuenow={r.total ? Math.round((r.listos / r.total) * 100) : 0} aria-valuemin={0} aria-valuemax={100} className="block h-2 rounded-full bg-slate-200">
                <span className="block h-2 rounded-full bg-[#2563EB]" style={{ width: `${r.total ? (r.listos / r.total) * 100 : 0}%` }} />
              </span>
            </header>
            <ol className="grid gap-3">{r.pasos.map((p, i) => <Paso key={p.id} p={p} n={i + 1} alVer={ver} />)}</ol>
            <section className="rounded-2xl bg-indigo-50 p-4">
              <p className="text-[15px] font-bold text-indigo-900">¿Dudas?</p>
              <p className="text-[15px] text-indigo-900">Pregúntale a {r.jefe ? `${r.jefe.split(" ")[0]} (tu jefe)` : "tu jefe"}{r.rh ? ` o a ${r.rh.split(" ")[0]} de Recursos Humanos` : " o a Recursos Humanos"}.</p>
            </section>
          </>
        )}
      </DataState>
    </div>
  );
}
