"use client";

// «Tu reclutador con IA en WhatsApp»: el teléfono de una candidata con la plática real del agente de reclutamiento
// (aviso de privacidad, datos de la vacante, pregunta de filtro con botones, base de conocimiento, sucursal más
// cercana, agenda y recordatorio) y, al lado, la bandeja de RH que se llena al mismo tiempo. Guion en novedades.mjs;
// reloj en useGuion.js. Dibujo genérico de chat (sin el logotipo de WhatsApp). Estilos en novedades.css (.nv-wa).
import Link from "next/link";
import useGuion from "./useGuion";
import ControlEscena from "./ControlEscena";
import { CHAT, FICHA_RH } from "./novedades.mjs";
import { duracionChat, marcasChat, pasosChat, vistaChat } from "./guion.mjs";

const PASOS = pasosChat(CHAT.mensajes);
const DURACIONES = PASOS.map((p) => duracionChat(p, CHAT.mensajes));
const LIGA = /(adamia\.com\.mx\/\S+)/;

// Botón que el candidato toca en el mensaje i (el siguiente mensaje es su respuesta con botón).
const tocadoEn = (i) => (CHAT.mensajes[i + 1]?.de === "yo" ? CHAT.mensajes[i + 1].toca ?? null : null);

function Texto({ texto }) {
  return texto.split(LIGA).map((t, k) => (LIGA.test(t) ? <span key={k} className="nv-wa-liga">{t}</span> : t));
}

function Palomitas({ leido }) {
  return (
    <svg className={`nv-wa-palomitas${leido ? " leido" : ""}`} viewBox="0 0 18 11" width={17} height={11} aria-hidden="true">
      <path d="M1 6.2 4.4 9.4 11 2M6.6 8.6l.9.8L14.5 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Burbuja({ m, i, vista, primera }) {
  const mia = m.de === "yo";
  const tocado = !mia && m.botones && vista.tocando && tocadoEn(i) === vista.tocando && !vista.mostrados.has(i + 1) ? vista.tocando : null;
  return (
    <div className={`nv-wa-msg ${mia ? "yo" : "ella"}${primera ? " primera" : ""}`} data-msg={i}>
      <div className="nv-wa-b">
        {m.cita ? (
          <div className="nv-wa-cita"><b>{CHAT.empresa}</b><span>{m.cita}</span></div>
        ) : null}
        <p><Texto texto={m.texto} /><span className="nv-wa-hueco" aria-hidden="true" /></p>
        <span className="nv-wa-meta">{m.hora}{mia ? <Palomitas leido={i <= vista.leidoHasta} /> : null}</span>
      </div>
      {m.botones ? (
        <div className="nv-wa-botones">
          {m.botones.map((b) => (
            <span key={b} className={`nv-wa-boton${tocado === b ? " tocado" : ""}`}>
              <svg viewBox="0 0 24 24" width={15} height={15} aria-hidden="true"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" fill="currentColor" /></svg>
              {b}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Telefono({ vista }) {
  let anterior = null;
  return (
    <div className="nv-tel flota" style={{ "--ft": "7s", "--fd": "-1.5s", "--fy": "5px" }}>
      <div className="nv-tel-pant">
        <div className="nv-wa-estado"><span>9:02</span><span className="nv-wa-senal"><i /><i /><i /><i /> 100%</span></div>
        <div className="nv-wa-cab">
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="nv-wa-av">MA</span>
          <div className="nv-wa-quien">
            <b>{CHAT.empresa}</b>
            <small className={vista.escribiendo ? "escribe" : undefined}>{vista.escribiendo ? "escribiendo…" : "en línea"}</small>
          </div>
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="12" height="10" rx="2" /><path d="m15 11 6-3v8l-6-3" /></svg>
          <svg viewBox="0 0 24 24" width={19} height={19} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
          <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" fill="currentColor"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
        </div>
        <div className="nv-wa-fondo">
          <div className="nv-wa-hilo">
            <div className="nv-wa-cifrado">🔒 Los mensajes y las llamadas están cifrados de extremo a extremo.</div>
            {CHAT.mensajes.map((m, i) => {
              if (!vista.mostrados.has(i)) return null;
              if (m.de === "fecha") { anterior = null; return <div key={i} className="nv-wa-fecha"><span>{m.texto}</span></div>; }
              const primera = anterior !== m.de;
              anterior = m.de;
              return <Burbuja key={i} m={m} i={i} vista={vista} primera={primera} />;
            })}
          </div>
        </div>
        <div className="nv-wa-escribir">
          <span className="nv-wa-caja">
            <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 10h.01M15 10h.01" /></svg>
            <span>Mensaje</span>
            <svg viewBox="0 0 24 24" width={19} height={19} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7" /></svg>
            <svg viewBox="0 0 24 24" width={19} height={19} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
          </span>
          <span className="nv-wa-mic">
            <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </span>
        </div>
      </div>
    </div>
  );
}

function FichaRH({ marcas }) {
  const etapa = marcas.has("califica") ? null : marcas.has("acepto") ? "Respondiendo preguntas" : marcas.has("aviso") ? "Pidiendo aceptar el aviso" : "Sin iniciar";
  return (
    <div className="nv-rh flota" style={{ "--ft": "8s", "--fd": "-3s", "--fy": "4px" }}>
      <div className="nv-rh-cab">
        <span className="nv-rh-icono"><svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /></svg></span>
        <div><b>Chats de reclutamiento</b><small>Así lo ve tu equipo en ADAMIA</small></div>
        <span className="nv-rh-agente"><i />Agente encendido</span>
      </div>
      <div className={`nv-rh-atn${marcas.has("sucursal") ? " on" : ""}`}>
        <i aria-hidden="true" />
        <span><b>1 candidato necesita atención</b> · {FICHA_RH.atencion.nombre} {FICHA_RH.atencion.motivo}</span>
        <em>Abrir chat</em>
      </div>
      <div className="nv-rh-chat">
        <span className="nv-rh-av">{marcas.has("nombre") ? "DO" : "+52"}</span>
        <div className="nv-rh-quien">
          <b>{marcas.has("nombre") ? CHAT.candidata : "+52 55 9876 5432"}</b>
          <small>{CHAT.vacante}{marcas.has("sucursal") ? " · Sucursal Norte" : ""}</small>
        </div>
        {etapa ? <span className="nv-chip gris">{etapa}</span> : <span className="nv-chip verde">Califica</span>}
      </div>
      <div className={`nv-rh-pts${marcas.has("califica") ? " on" : ""}`}>
        {FICHA_RH.puntajes.map(([t, v], k) => (
          <div key={t} className="nv-rh-pt" style={{ "--v": v / 5, "--k": k }}>
            <span>{t}</span><i><u /></i><b>{v}</b>
          </div>
        ))}
      </div>
      <div className={`nv-rh-cita${marcas.has("cita") ? " on" : ""}`}>
        <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
        <span>Entrevista · jue 3 dic, 9:00 a. m.</span>
        <span className={`nv-chip ${marcas.has("confirmada") ? "verde" : "azul"}`}>{marcas.has("confirmada") ? "Confirmada" : "Agendada"}</span>
      </div>
    </div>
  );
}

export default function SeccionReclutadorIA() {
  const g = useGuion({ total: PASOS.length, duraciones: DURACIONES, pausaFinal: 10000, vueltas: 3 });
  const vista = vistaChat(CHAT.mensajes, g.paso);
  const marcas = marcasChat(CHAT.mensajes, vista);
  return (
    <section className="nv nv-wa" id="reclutador-ia" aria-labelledby="nv-wa-tit">
      <div className="wrap nv-fila">
        <div className="txt reveal nv-txt">
          <span className="eyebrow">Nuevo · Reclutamiento con IA</span>
          <h2 id="nv-wa-tit">Tu reclutador con IA en WhatsApp.</h2>
          <p>Tus candidatos escriben al WhatsApp de la vacante. Adamia AI les contesta en segundos, los entrevista y les agenda la cita. Tú ves a cada uno calificado y entras cuando hace falta.</p>
          <ul className="nv-puntos">
            <li><b>Contesta con tus datos.</b> Sueldo, horario y dudas, con la información de la vacante y tu base de conocimiento.</li>
            <li><b>Filtra con tus preguntas.</b> Botones de Sí o No y opciones; la calificación sale de tus reglas.</li>
            <li><b>Sucursal y entrevista.</b> Propone las 3 sucursales más cercanas, agenda la cita y manda el recordatorio.</li>
            <li><b>Tú decides.</b> Te avisa cuando un candidato requiere atención y tomas el control del chat cuando quieras.</li>
          </ul>
          <div className="nv-ligas">
            <Link className="btn btn-primary" href="/contacto">Solicitar demo</Link>
            <Link className="nv-liga" href="/ayuda/reclutamiento/agente-de-whatsapp">Cómo funciona el agente <span aria-hidden="true">→</span></Link>
          </div>
          <ControlEscena escena={g} controla="nv-wa-escena" de="del chat de WhatsApp" />
          <p className="sr-only">
            Ejemplo animado con datos ficticios: una candidata escribe por la vacante de Cajera. El agente le pide aceptar el aviso de
            privacidad, le da el horario y el sueldo de la vacante, le pregunta con botones Sí y No si puede trabajar fines de semana,
            responde si dan uniforme, le propone las 3 sucursales más cercanas, agenda su entrevista y le manda el recordatorio, que ella
            confirma. Mientras tanto, en ADAMIA el equipo de RH la ve como «Califica» con sus puntajes y la cita confirmada, y otro
            candidato aparece como «Requiere atención» porque pidió hablar con una persona.
          </p>
        </div>
        <div
          className={`nv-escena nv-wa-escena reveal${g.quieto ? " nv-quieto" : ""}`}
          id="nv-wa-escena" ref={g.ref} aria-hidden="true" data-paso={g.paso} data-total={g.total}
          data-fin={vista.completo ? "" : undefined}
        >
          <Telefono vista={vista} />
          <FichaRH marcas={marcas} />
        </div>
      </div>
    </section>
  );
}
