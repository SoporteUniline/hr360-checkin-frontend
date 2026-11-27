"use client";

// «Clima laboral con IA»: tablero de resultados de una medición cerrada (participación, favorabilidad por dimensión,
// nivel de riesgo NOM-035) y la tarjeta «Plan de acción sugerido» de Adamia AI, donde cada sugerencia pasa al plan con
// un clic, sin responsable ni fecha (como en src/components/clima/IaResultados.jsx). Datos de ejemplo en novedades.mjs.
import Link from "next/link";
import useGuion from "./useGuion";
import ControlEscena from "./ControlEscena";
import Cifra from "./Cifra";
import { CLIMA } from "./novedades.mjs";

// Pasos: 1 participación · 2 dimensiones · 3 NOM-035 · 4 «Pensando…» · 5–7 sugerencias · 8–10 agregadas · 11 resumen.
const TOTAL = 11;
const DURACIONES = [700, 1300, 1500, 1100, 1700, 700, 700, 1000, 900, 900, 900];
const R = 34;
const CIRC = 2 * Math.PI * R;

const tono = (v) => (v >= 70 ? "verde" : v >= 55 ? "ambar" : "rojo");

export default function SeccionClimaIA() {
  const g = useGuion({ total: TOTAL, duraciones: DURACIONES, pausaFinal: 9000, vueltas: 3 });
  const p = g.paso;
  const { participacion: part } = CLIMA;
  const agregadas = Math.max(0, Math.min(3, p - 7));
  return (
    <section className="nv nv-clima fullband gris" id="clima-ia" aria-labelledby="nv-cl-tit">
      <div className="wrap nv-fila rev">
        <div className="txt reveal nv-txt">
          <span className="eyebrow">Nuevo · Clima laboral con IA</span>
          <h2 id="nv-cl-tit">Clima laboral con IA.</h2>
          <p>Mide cómo se siente tu gente con encuestas anónimas y cumple la NOM-035. Adamia AI lee los resultados y te propone qué hacer.</p>
          <ul className="nv-puntos">
            <li><b>Encuestas anónimas</b> por WhatsApp, correo o desde su app, con recordatorios.</li>
            <li><b>Resultados claros:</b> participación y favorabilidad por dimensión, área y jefe.</li>
            <li><b>NOM-035:</b> cuestionario oficial, nivel de riesgo y expediente listo para inspección.</li>
            <li><b>Del resultado a la acción:</b> las sugerencias de Adamia AI pasan a tu plan con un clic.</li>
          </ul>
          <div className="nv-ligas">
            <Link className="nv-liga" href="/ayuda/clima/plan-de-accion">Guía del plan de acción <span aria-hidden="true">→</span></Link>
            <Link className="nv-liga" href="/ayuda/clima/nom-035">NOM-035 en ADAMIA <span aria-hidden="true">→</span></Link>
          </div>
          <ControlEscena escena={g} controla="nv-cl-escena" de="del tablero de clima" />
          <p className="sr-only">
            Ejemplo animado con datos ficticios: una medición de clima con 86 % de participación (37 de 43), favorabilidad por
            dimensión de Liderazgo 82 % a Reconocimiento 44 %, riesgo NOM-035 en nivel medio con un dominio en alto (Carga de trabajo).
            Adamia AI propone tres acciones y cada una se agrega al plan de acción con un clic.
          </p>
        </div>
        <div className={`nv-escena reveal${g.quieto ? " nv-quieto" : ""}`} id="nv-cl-escena" ref={g.ref} aria-hidden="true" data-paso={p} data-total={TOTAL} data-fin={p >= TOTAL ? "" : undefined}>
          <div className="nv-cl">
            <div className="nv-cl-cab">
              <div><b>Clima laboral · Medición de noviembre</b><small>Cerrada · respuestas anónimas</small></div>
              <span className="nv-chip gris">Datos de ejemplo</span>
            </div>
            <div className="nv-cl-cuerpo">
              <div className="nv-cl-res">
                <div className="nv-cl-kpis">
                  <div className="nv-cl-kpi">
                    <svg viewBox="0 0 84 84" width={78} height={78}>
                      <circle cx="42" cy="42" r={R} className="pista" />
                      <circle cx="42" cy="42" r={R} className="lleno" transform="rotate(-90 42 42)"
                        style={{ strokeDasharray: CIRC, strokeDashoffset: p >= 1 ? CIRC * (1 - part.pct / 100) : CIRC }} />
                    </svg>
                    <b className="nv-cl-pct"><Cifra hasta={part.pct} activo={p >= 1} />%</b>
                    <div><small>Participación</small><b><Cifra hasta={part.contestadas} activo={p >= 1} /> de {part.invitados}</b><span className="verde">Muy buena</span></div>
                  </div>
                  <div className={`nv-cl-nom${p >= 3 ? " on" : ""}`}>
                    <small>NOM-035 · riesgo psicosocial</small>
                    <div className="nv-cl-escala">
                      {CLIMA.niveles.map((n, k) => <span key={n} className={k === CLIMA.nivel ? "es" : undefined} style={{ "--k": k }}>{n}</span>)}
                    </div>
                    <span className="nv-cl-dom">1 dominio en alto · {CLIMA.dominioAlto}</span>
                  </div>
                </div>
                <div className={`nv-cl-dims${p >= 2 ? " on" : ""}`}>
                  <small>Favorabilidad por dimensión</small>
                  {CLIMA.dimensiones.map(([d, v], k) => (
                    <div key={d} className={`nv-cl-dim ${tono(v)}`} style={{ "--v": v / 100, "--k": k }}>
                      <span>{d}</span><i><u /></i><b>{v}%</b>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`nv-cl-ia${p >= 4 ? " pide" : ""}${p >= 5 ? " listo" : ""}`}>
                <div className="nv-cl-ia-cab"><span className="nv-chip ia">✦ Adamia AI</span><b>Plan de acción sugerido</b></div>
                <div className="nv-capas">
                  <div className="nv-cl-idle">
                    <p>Propone acciones concretas para las áreas y dimensiones más bajas. A la IA solo van números agregados, sin nombres.</p>
                    <span className="nv-cl-boton">{p >= 4 ? "Pensando…" : "Proponer plan"}</span>
                  </div>
                  <ul className="nv-cl-sug">
                    {CLIMA.sugerencias.map((s, k) => (
                      <li key={s.accion} className={`${p >= 5 + k ? "on" : ""}${k < agregadas ? " agregada" : ""}`}>
                        <span className="nv-chip gris">{s.dimension}</span>
                        <p>{s.accion}</p>
                        <span className="nv-cl-agregar"><em>+ Agregar al plan</em><em>✓ Ya está en el plan</em></span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className={`nv-cl-nota${p >= 11 ? " on" : ""}`}>Se agregan al plan sin responsable ni fecha: asígnalos en «Plan de acción».</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
