"use client";

// «El muro de tu empresa»: el muro del panel (portada, «¿Qué quieres comunicar?», publicación con fotos, «Me gusta» y
// comentarios) y un comunicado que pide confirmar de leído: en el teléfono la persona marca «Leí el comunicado y estoy
// enterado» y toca «Confirmar de leído»; en el panel sube «30 de 42 confirmaron». Como src/components/comunicados.
import Link from "next/link";
import useGuion from "./useGuion";
import ControlEscena from "./ControlEscena";
import Cifra from "./Cifra";
import { MURO } from "./novedades.mjs";

// Pasos: 1 «Me gusta» · 2 suben los me gusta · 3–4 comentarios · 5 casilla · 6 confirmar · 7 sube el avance.
const TOTAL = 7;
const DURACIONES = [900, 900, 1500, 1300, 1400, 1100, 1100];
const iniciales = (n) => n.split(" ").map((x) => x[0]).join("").slice(0, 2);

function Foto({ tono, children }) {
  return <span className={`nv-mu-foto ${tono}`}>{children}</span>;
}

export default function SeccionMuro() {
  const g = useGuion({ total: TOTAL, duraciones: DURACIONES, pausaFinal: 9000, vueltas: 3 });
  const p = g.paso;
  const { publicacion: pub, aviso } = MURO;
  const confirmados = p >= 7 ? aviso.confirmaron.hasta : aviso.confirmaron.desde;
  return (
    <section className="nv nv-muro" id="muro" aria-labelledby="nv-mu-tit">
      <div className="wrap nv-fila">
        <div className="txt reveal nv-txt">
          <span className="eyebrow">Nuevo · Comunicados</span>
          <h2 id="nv-mu-tit">El muro de tu empresa.</h2>
          <p>Un espacio como red social, solo para tu equipo. Publica avisos, fotos y eventos, y sabe quién ya leyó lo importante.</p>
          <ul className="nv-puntos">
            <li><b>Publicaciones completas:</b> portada, fotos, video y PDF, para toda la empresa o solo un área.</li>
            <li><b>Me gusta y comentarios,</b> con moderación y reglas que tú defines.</li>
            <li><b>Confirmar de leído:</b> cada persona confirma y tú ves quién falta para recordarle.</li>
            <li><b>Llega a todos:</b> en su celular, con aviso emergente y notificaciones.</li>
          </ul>
          <div className="nv-ligas">
            <Link className="nv-liga" href="/ayuda/comunicados">Guías de comunicados <span aria-hidden="true">→</span></Link>
            <Link className="nv-liga" href="/ayuda/comunicados/confirmacion-y-seguimiento">Confirmación y seguimiento <span aria-hidden="true">→</span></Link>
          </div>
          <ControlEscena escena={g} controla="nv-mu-escena" de="del muro" />
          <p className="sr-only">
            Ejemplo animado con datos ficticios: el muro de una empresa con su portada y una publicación con fotos que recibe
            «Me gusta» (de 31 a 48) y dos comentarios. Un comunicado del reglamento interior pide confirmar de leído: una
            persona marca la casilla y confirma desde su celular, y en el panel el avance sube de 30 a 31 de 42.
          </p>
        </div>
        <div className={`nv-escena nv-mu-escena reveal${g.quieto ? " nv-quieto" : ""}`} id="nv-mu-escena" ref={g.ref} aria-hidden="true" data-paso={p} data-total={TOTAL} data-fin={p >= TOTAL ? "" : undefined}>
          <div className="nv-mu">
            <div className="nv-mu-tabs"><em className="on">Muro</em><em>Administrar</em><em>Automáticos</em><em>Moderar el muro</em></div>
            <div className="nv-mu-portada">
              <svg viewBox="0 0 320 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <g fill="#fff" opacity=".9"><circle cx="30" cy="20" r="3" /><circle cx="70" cy="60" r="2.5" /><rect x="120" y="14" width="6" height="6" rx="1" transform="rotate(20 123 17)" /><circle cx="250" cy="24" r="3" /><rect x="285" y="58" width="6" height="6" rx="1" transform="rotate(-25 288 61)" /><circle cx="205" cy="70" r="2" /></g>
                <g fill="#fde68a"><circle cx="95" cy="30" r="2.5" /><rect x="225" y="40" width="5" height="5" rx="1" transform="rotate(35 227 42)" /><circle cx="300" cy="18" r="2" /><rect x="40" y="62" width="5" height="5" rx="1" transform="rotate(-15 42 64)" /></g>
              </svg>
              <b>{MURO.portada}</b>
            </div>
            <div className="nv-mu-redactar"><span className="nv-mu-av">CV</span><span>¿Qué quieres comunicar, Carmen?</span></div>
            <article className="nv-mu-post">
              <header><span className="nv-mu-av">CV</span><div><b>{MURO.autora} <small>· Recursos Humanos</small></b><small>Hace 2 h · Evento · Toda la empresa</small></div></header>
              <b className="nv-mu-tit">{pub.titulo}</b>
              <p>{pub.texto}</p>
              <div className="nv-mu-fotos">
                <Foto tono="azul">
                  <svg viewBox="0 0 64 48" aria-hidden="true"><circle cx="20" cy="18" r="7" /><circle cx="44" cy="18" r="7" /><path d="M6 46c2-10 8-15 14-15s12 5 14 15M30 46c2-10 8-15 14-15s12 5 14 15" /></svg>
                </Foto>
                <Foto tono="violeta">
                  <svg viewBox="0 0 64 48" aria-hidden="true"><path d="M14 44h36V28H14zM18 28v-6h28v6M32 22v-8" /><circle cx="32" cy="11" r="2.5" /></svg>
                </Foto>
                <Foto tono="ambar">
                  <svg viewBox="0 0 64 48" aria-hidden="true"><path d="M32 8l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" /></svg>
                  <em>+4</em>
                </Foto>
              </div>
              <div className="nv-mu-conteos">
                <span><i className="nv-mu-corazon">♥</i><Cifra desde={pub.meGusta.desde} hasta={pub.meGusta.hasta} activo={p >= 2} ms={1300} /></span>
                <span>{p >= 4 ? 2 : p >= 3 ? 1 : 0} comentarios</span>
              </div>
              <div className="nv-mu-acciones">
                <span className={p >= 1 ? "me-gusta" : undefined}><i className="nv-mu-corazon">♥</i>Me gusta</span>
                <span>💬 Comentar</span>
              </div>
              <div className="nv-mu-coms">
                {pub.comentarios.map((c, k) => (
                  <div key={c.quien} className={`nv-mu-com${p >= 3 + k ? " on" : ""}`}>
                    <span className="nv-mu-av chico">{iniciales(c.quien)}</span>
                    <div><b>{c.quien}</b><span>{c.texto}</span></div>
                  </div>
                ))}
              </div>
            </article>
            <article className="nv-mu-post nv-mu-aviso">
              <header><span className="nv-mu-av">CV</span><div><b>{aviso.titulo}</b><small>Requiere confirmación · Toda la empresa</small></div></header>
              <div className="nv-mu-avance">
                <span><b><span className="nv-cifra" key={confirmados}>{confirmados}</span> de {aviso.confirmaron.de}</b> confirmaron</span>
                <i><u style={{ "--v": confirmados / aviso.confirmaron.de }} /></i>
                <em>Ver seguimiento</em>
              </div>
            </article>
          </div>
          <div className="nv-mu-tel flota" style={{ "--ft": "7.4s", "--fd": "-2s", "--fy": "5px" }}>
            <small className="nv-mu-tel-tit">Mi espacio · Muro</small>
            <b>{aviso.titulo}</b>
            <div className={`nv-mu-confirmar${p >= 6 ? " hecho" : ""}`}>
              <div className="nv-capas">
                <div className="nv-mu-pendiente">
                  <span className={`nv-mu-casilla${p >= 5 ? " on" : ""}`}><i>✓</i>Leí el comunicado y estoy enterado</span>
                  <span className={`nv-mu-boton${p >= 5 ? " listo" : ""}`}>Confirmar de leído</span>
                </div>
                <p className="nv-mu-ok">✓ Confirmaste de leído hoy a las 9:14 a.m.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
