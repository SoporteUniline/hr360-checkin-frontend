"use client";

// «Todo tu equipo en un tablero»: el panel de RH con las tarjetas y la lista del Monitor (llegan checadas en vivo), lo
// que espera su firma (horas extra por autorizar y permisos pendientes del Resumen) y el panel de Adamia AI que
// responde con la Ley Federal del Trabajo y cita el artículo. Datos de ejemplo en novedades.mjs.
/* eslint-disable @next/next/no-img-element -- ícono de la marca (png pequeño) dentro de la maqueta */
import Link from "next/link";
import useGuion from "./useGuion";
import ControlEscena from "./ControlEscena";
import Cifra from "./Cifra";
import { TABLERO } from "./novedades.mjs";

// Pasos: 1–4 llega una checada cada uno · 5 horas extra · 6 permisos · 7 abre Adamia AI · 8 pregunta · 9 escribe
// · 10 respuesta · 11 artículo citado.
const TOTAL = 11;
const DURACIONES = [900, 1300, 1300, 1300, 1300, 1200, 1200, 900, 900, 1300, 1400];

const horasMin = (n) => `${Math.floor(n / 60)} h ${String(n % 60).padStart(2, "0")} min`;

function valores(llegadas) {
  const v = {};
  for (const c of TABLERO.contadores) v[c.clave] = c.desde;
  v.trabajando += llegadas;
  v.entrar -= llegadas;
  if (llegadas >= 3) v.tarde += 1;
  return v;
}

export default function SeccionTablero() {
  const g = useGuion({ total: TOTAL, duraciones: DURACIONES, pausaFinal: 9000, vueltas: 3 });
  const p = g.paso;
  const llegadas = Math.min(4, p);
  const v = valores(llegadas);
  return (
    <section className="nv nv-tablero" id="tablero" aria-labelledby="nv-tb-tit">
      <div className="wrap">
        <div className="txt reveal nv-txt nv-centro">
          <span className="eyebrow">Panel de RH</span>
          <h2 id="nv-tb-tit">Todo tu equipo en un tablero.</h2>
          <p>Quién está trabajando, quién llegó tarde y qué espera tu firma, al momento. Y si tienes una duda de la ley, Adamia AI te contesta ahí mismo.</p>
          <ul className="nv-chips-lista">
            <li>Monitor en vivo</li><li>Asistencias</li><li>Horas extra</li><li>Permisos y vacaciones</li><li>Adamia AI</li>
          </ul>
          <div className="nv-ligas">
            <Link className="nv-liga" href="/funcionalidades/dashboard-empleados">Conoce el panel <span aria-hidden="true">→</span></Link>
            <Link className="nv-liga" href="/ayuda/monitor/usar-el-monitor">Guía del Monitor <span aria-hidden="true">→</span></Link>
            <Link className="nv-liga" href="/ayuda/adamia-ai/que-es-adamia-ai">Qué es Adamia AI <span aria-hidden="true">→</span></Link>
          </div>
          <ControlEscena escena={g} controla="nv-tb-escena" de="del tablero" />
          <p className="sr-only">
            Ejemplo animado con datos ficticios: el Monitor de ADAMIA recibe cuatro checadas en vivo y sus tarjetas cambian
            (trabajando, por entrar, llegaron tarde). A la derecha, 6 h 30 min de horas extra por autorizar y dos permisos
            pendientes. Después se abre Adamia AI, que responde cuánto se paga a quien trabaja el 25 de diciembre y cita los
            artículos 74 y 75 de la Ley Federal del Trabajo.
          </p>
        </div>
        <div className={`nv-escena reveal${g.quieto ? " nv-quieto" : ""}`} id="nv-tb-escena" ref={g.ref} aria-hidden="true" data-paso={p} data-total={TOTAL} data-fin={p >= TOTAL ? "" : undefined}>
          <div className="nv-tb">
            <div className="dbar"><i /><i /><i /><span>adamia.com.mx/panel/monitor</span><b className="live">EN VIVO</b></div>
            <div className="nv-tb-cuerpo">
              <nav className="nv-tb-menu">
                <span className="nv-tb-logo"><img src="/landing/adamia-a.png" alt="" width={22} height={20} /></span>
                {["Muro", "Monitor", "Asistencias", "Horas extra", "Permisos", "Clima"].map((t) => (
                  <span key={t} className={t === "Monitor" ? "on" : undefined}><i />{t}</span>
                ))}
              </nav>
              <div className="nv-tb-main">
                <div className="nv-tb-tit">
                  <div><b>Monitor</b><small>Miércoles 2 de diciembre · se actualiza solo</small></div>
                  <span className="nv-tb-vistas"><em className="on">Tabla</em><em>Línea del día</em></span>
                </div>
                <div className="nv-tb-kpis">
                  {TABLERO.contadores.map((c) => (
                    <div key={c.clave} className={`nv-tb-kpi ${c.tono}`}>
                      <small>{c.titulo}</small>
                      {/* La clave cambia con el valor: el número vuelve a montarse y hace su pequeño salto. */}
                      <b key={v[c.clave]} className={p >= 1 && p <= 4 ? "sube" : undefined}>{v[c.clave]}</b>
                      <span>{c.nota}</span>
                    </div>
                  ))}
                </div>
                <div className="nv-tb-tabla">
                  <div className="nv-tb-fila th"><span>Persona</span><span>Entrada</span><span>Qué pasa</span></div>
                  {TABLERO.antes.map((r) => (
                    <div key={r.nombre} className="nv-tb-fila on">
                      <span><i className="nv-tb-av">{r.nombre.split(" ").map((x) => x[0]).join("")}</i><b>{r.nombre}</b><small>{r.area}</small></span>
                      <span>{r.hora}</span>
                      <span><em className={`nv-chip ${r.tono}`}>{r.estado}</em></span>
                    </div>
                  ))}
                  {TABLERO.llegadas.map((r, idx) => (
                    <div key={r.nombre} className={`nv-tb-fila${idx < llegadas ? " on" : ""}${idx === llegadas - 1 && p <= 4 ? " nueva" : ""}`}>
                      <span><i className="nv-tb-av">{r.nombre.split(" ").map((x) => x[0]).join("")}</i><b>{r.nombre}</b><small>{r.area}</small></span>
                      <span>{r.hora}</span>
                      <span><em className={`nv-chip ${r.tono}`}>{r.estado}</em></span>
                    </div>
                  ))}
                </div>
              </div>
              <aside className="nv-tb-lado">
                <div className={`nv-tb-card${p >= 5 ? " on" : ""}`}>
                  <small>Horas extra por autorizar</small>
                  <b><Cifra hasta={390} activo={p >= 5} ms={900} formato={horasMin} /></b>
                  <span>{TABLERO.horasExtra.nota}</span>
                  <em className="nv-tb-btn">Revisar y autorizar</em>
                </div>
                <div className={`nv-tb-card${p >= 6 ? " on" : ""}`}>
                  <small>Permisos pendientes</small>
                  {TABLERO.solicitudes.map((s) => (
                    <div key={s.quien} className="nv-tb-sol"><b>{s.tipo} · {s.quien}</b><span>{s.cuando}</span></div>
                  ))}
                  <em className="nv-tb-btn">Aprobar o rechazar</em>
                </div>
                <div className={`nv-tb-ia${p >= 7 ? " on" : ""}`}>
                  <div className="nv-tb-ia-cab"><span className="nv-chip ia">✦ Adamia AI</span><small>Ley Federal del Trabajo</small></div>
                  <div className={`nv-tb-yo${p >= 8 ? " on" : ""}`}>{TABLERO.pregunta}</div>
                  <div className={`nv-tb-resp${p >= 9 ? " on" : ""}${p >= 10 ? " lista" : ""}`}>
                    <span className="nv-tb-puntos"><i /><i /><i /></span>
                    <p>{TABLERO.respuesta}</p>
                    <span className={`nv-tb-cita${p >= 11 ? " on" : ""}`}>{TABLERO.cita}</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
