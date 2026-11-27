"use client";
// Comunicados automáticos (maqueta «Automaticos», aprobada 27/11/2026): cumpleaños, aniversarios, bienvenida y festivos
// que se publican solos cada día a la hora de la empresa, con las plantillas de felicitación de Avisos. Sin duplicados
// (lo garantiza el servidor). Backend: GET|PUT /checador/comunicados/automaticos, GET /automaticos/previa, GET|PUT /config.
import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ChevronLeft, Sparkles } from "lucide-react";
import axios from "@/lib/axios";
import { SelectorEmpresa } from "@/components/nomina/comun";
import { RUTA_PLANTILLAS } from "@/lib/avisos/avisos.mjs";
import { API, AUDIENCIAS_AUTO, REGLAS_AUTO, RUTA_PANEL, cuandoAuto, errorDe, horaHH, normalizarConfig, reglasAuto, textoManana } from "@/lib/comunicados/comunicados.mjs";
import { AvisoError, Interruptor, Mensaje, TextoPlano, botonPrimario, conEmpresa, entrada, get, opcionesSwr, tarjeta, useEmpresa } from "./comun";

const HORAS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const reglasDe = (d) => (Array.isArray(d) ? d : d?.automaticos ?? d?.reglas ?? d?.items ?? []);

export default function Automaticos() {
  const empresa = useEmpresa();
  const listo = empresa.listo;
  const auto = useSWR(listo ? conEmpresa(`${API}/automaticos`, empresa.idEmpresa) : null, get, opcionesSwr);
  const config = useSWR(listo ? conEmpresa(`${API}/config`, empresa.idEmpresa) : null, get, opcionesSwr);
  const previa = useSWR(listo ? conEmpresa(`${API}/automaticos/previa`, empresa.idEmpresa) : null, get, opcionesSwr);
  const [reglas, setReglas] = useState(() => reglasAuto([]));
  const [hora, setHora] = useState("08:00");
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { if (auto.data) setReglas(reglasAuto(reglasDe(auto.data))); }, [auto.data]);
  useEffect(() => { if (config.data) setHora(normalizarConfig(config.data.config ?? config.data).hora_automaticos); }, [config.data]);
  const cambiar = (regla, cambios) => setReglas((rs) => rs.map((r) => (r.regla === regla ? { ...r, ...cambios } : r)));

  const guardar = async () => {
    setGuardando(true); setMensaje(null);
    const e = empresa.idEmpresa ? { empresa: empresa.idEmpresa } : {};
    try {
      await axios.put(`${API}/automaticos`, { ...e, reglas });
      const horaGuardada = normalizarConfig(config.data?.config ?? config.data ?? {}).hora_automaticos;
      if (hora !== horaGuardada) await axios.put(`${API}/config`, { ...e, hora_automaticos: hora });
      setMensaje({ tipo: "ok", texto: "Comunicados automáticos guardados." });
      await Promise.all([auto.mutate(), config.mutate(), previa.mutate()]);
    } catch (err) { setMensaje({ tipo: "error", texto: errorDe(err, "No se pudieron guardar.") }); }
    finally { setGuardando(false); }
  };

  const hoy = previa.data?.hoy ?? [];
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-1" data-pantalla="automaticos">
      <Link href={RUTA_PANEL} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="size-4" aria-hidden="true" />Comunicados</Link>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900"><Sparkles className="size-6 text-[#2563EB]" aria-hidden="true" />Comunicados automáticos</h1>
          <p className="mt-1 text-sm text-slate-600">Usan las mismas plantillas de felicitación que ya tienes en Avisos. Se publican solos a la hora que elijas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectorEmpresa {...empresa} />
          <label htmlFor="auto-hora" className="flex items-center gap-2 text-sm font-semibold text-slate-700">Hora
            <select id="auto-hora" className={`${entrada} w-28`} value={horaHH(hora)} onChange={(e) => setHora(e.target.value)}>{HORAS.map((h) => <option key={h} value={h}>{h}</option>)}</select>
          </label>
          <button type="button" className={botonPrimario} disabled={guardando || !auto.data} onClick={guardar}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
        </div>
      </header>
      <Mensaje mensaje={mensaje} />
      <AvisoError error={auto.error} porDefecto="No se pudieron cargar los automáticos." reintentar={auto.mutate} />

      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <section aria-label="Reglas automáticas" className={`${tarjeta} overflow-hidden`}>
          <div className="hidden grid-cols-[2fr_1.2fr_1fr_1.2fr_0.8fr] gap-3 bg-slate-100 px-4 py-2.5 text-[13px] font-bold tracking-wide text-slate-600 md:grid" aria-hidden="true">
            <span>QUÉ SE PUBLICA</span><span>PARA</span><span>CUÁNDO</span><span>CANALES</span><span>ACTIVO</span>
          </div>
          <ul>
            {reglas.map((r) => {
              const base = REGLAS_AUTO.find((x) => x.regla === r.regla);
              return (
                <li key={r.regla} data-regla={r.regla} className="grid gap-3 border-t border-slate-100 px-4 py-4 first:border-t-0 md:grid-cols-[2fr_1.2fr_1fr_1.2fr_0.8fr] md:items-center">
                  <span><b className="block text-sm text-slate-900">{base.titulo}</b><span className="block text-[13px] text-slate-600">{base.detalle}</span></span>
                  <label className="grid gap-1 text-[13px] text-slate-600 md:block"><span className="md:sr-only">Para</span>
                    <select aria-label={`Para quién: ${base.titulo}`} className={entrada} value={r.audiencia} onChange={(e) => cambiar(r.regla, { audiencia: e.target.value })}>
                      {AUDIENCIAS_AUTO.map((a) => <option key={a.clave} value={a.clave}>{a.texto}</option>)}
                    </select>
                  </label>
                  <span className="text-sm text-slate-700"><span className="text-slate-500 md:hidden">Cuándo: </span>{cuandoAuto(r.regla, hora)}</span>
                  <span className="flex flex-wrap gap-x-3" role="group" aria-label={`Canales: ${base.titulo}`}>
                    <span className="flex min-h-11 items-center text-sm text-slate-700">App</span>
                    {[["push", "Push"], ["correo", "Correo"]].map(([k, t]) => (
                      <label key={k} className="flex min-h-11 cursor-pointer items-center gap-1.5 text-sm text-slate-800">
                        <input type="checkbox" className="size-5 accent-[#2563EB]" checked={Boolean(r.canales[k])} onChange={(e) => cambiar(r.regla, { canales: { ...r.canales, [k]: e.target.checked } })} />{t}
                      </label>
                    ))}
                  </span>
                  <Interruptor id={`auto-${r.regla}`} checked={r.activo} onChange={(v) => cambiar(r.regla, { activo: v })} etiqueta={r.activo ? "Sí" : "No"} />
                </li>
              );
            })}
          </ul>
          <p className="border-t border-slate-100 px-4 py-3 text-[13px] text-slate-600">
            Quien no quiera que se publique su cumpleaños puede ocultarlo desde Mi espacio. <Link href={RUTA_PLANTILLAS} className="font-semibold text-[#2563EB] hover:underline">Editar plantillas de felicitación</Link>
          </p>
        </section>

        <aside aria-labelledby="previa-hoy" className={`${tarjeta} grid content-start gap-3 p-4`} data-previa-hoy>
          <h2 id="previa-hoy" className="text-[13px] font-bold uppercase tracking-wide text-slate-500">Vista previa de hoy</h2>
          <AvisoError error={previa.error} porDefecto="No se pudo cargar la vista previa." />
          {previa.isLoading ? <p role="status" className="text-sm text-slate-500">Cargando…</p> : null}
          {previa.data && !hoy.length ? <p className="text-sm text-slate-600">Hoy no se publica nada automático.</p> : null}
          {hoy.map((x, i) => (
            <article key={x.id ?? i} className="grid gap-1 rounded-xl border border-slate-200 p-3">
              <b className="break-words text-sm text-slate-900">{x.titulo}</b>
              <TextoPlano className="text-[13px] text-slate-700">{x.cuerpo}</TextoPlano>
              {Number(x.reacciones) ? <span className="text-[13px] text-slate-500">{x.reacciones} compañeros felicitaron</span> : null}
            </article>
          ))}
          {previa.data ? <p className="text-[13px] font-semibold text-slate-700">{textoManana(previa.data.manana)}</p> : null}
        </aside>
      </div>
    </div>
  );
}
