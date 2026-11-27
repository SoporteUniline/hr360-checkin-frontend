"use client";
/* eslint-disable @next/next/no-img-element -- QR generado en el navegador (data: URL) */
// Postularse a una vacante (bolsa v2, 27/11/2026). Dos caminos, una sola acción principal por pantalla:
//   · WhatsApp (solo si la empresa tiene el asistente encendido): el MISMO enlace wa.me con código que copia RH; el agente
//     entrevista por chat. En celular el botón verde lo abre directo; en computadora se muestra además un QR.
//   · Solicitud corta: nombre, celular (verificado por SMS), correo opcional, preguntas del puesto, CV opcional y aviso
//     de privacidad → POST /otp/send, /otp/verify y /postulaciones/create con el token de un solo uso (INC-REC-002), sin
//     cambios de seguridad. Con sesión de candidato: confirmación + POST /postulaciones/postulacion-auth (como antes).
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import useSWR, { mutate } from "swr";
import Cookies from "js-cookie";
import { CheckCircle2, Loader2, Paperclip, X } from "lucide-react";
import axios from "axios";
import { fetcher, fetcherWithToken, swr_config } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import { qrComoDataUrl } from "@/lib/qrImagen.mjs";
import { postulaPorWhatsApp } from "@/lib/bolsaTrabajo.mjs";
import { respuestasParaEnviar } from "@/lib/reclutamiento/respuestas.mjs";
import IconoWhatsApp from "@/components/IconoWhatsApp";
import PreguntasGrandes, { faltantes } from "./PreguntasGrandes";

// Mismas llamadas que la solicitud anterior: axios directo a NEXT_PUBLIC_RUTA_BACKEND (la instancia del panel manda JSON
// por omisión y convertiría el FormData de /postulaciones/create).
const api = (ruta) => `${String(process.env.NEXT_PUBLIC_RUTA_BACKEND ?? "").replace(/\/$/, "")}${ruta}`;
const soloDigitos = (t) => String(t ?? "").replace(/\D/g, "");
// 10 dígitos de México; si escribe +52 o 52 adelante, se quitan.
export const celularDiez = (t) => {
  const d = soloDigitos(t);
  return d.length === 12 && d.startsWith("52") ? d.slice(2) : d;
};
const celularBonito = (d) => (d.length === 10 ? `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : d);
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mensajeApi = (e, porDefecto) => e?.response?.data?.error || porDefecto;
// Lleva el foco al primer campo marcado (en un grupo de botones, a su primera opción).
export function enfocarPrimerError(raiz) {
  const el = raiz?.querySelector("[aria-invalid=true]");
  (el?.matches("input, select, textarea") ? el : el?.querySelector("input, select, textarea"))?.focus();
}

// Estado de la postulación para esta vacante: sesión, ya postulado, lugares y periodo.
export function usePostulacion(v) {
  const { dataUser, isLoggedIn } = useAuth();
  const { data: disponibilidad } = useSWR(v?.id_vacante ? `/vacantes/check-positions/${v.id_vacante}` : null, fetcher, swr_config);
  const { data: postulaciones } = useSWR(dataUser?.id_usuario && dataUser?.tipo_usuario === "User" ? `/postulaciones/by-correo/${dataUser.correo}` : null, fetcherWithToken, swr_config);
  const candidato = isLoggedIn && dataUser?.tipo_usuario === "User";
  const puede = candidato || !isLoggedIn; // RH o empleado viendo la página pública: sin botón
  const ya = Boolean(postulaciones?.data?.some((p) => p.slug === v?.slug));
  let estado = "puede";
  if (!puede) estado = "no-aplica";
  else if (ya) estado = "ya";
  else if (disponibilidad && !disponibilidad.available) estado = "sin-lugares";
  else if (v?.recibe_postulaciones === false) estado = "cerrada";
  return { estado, candidato, dataUser };
}

function QrWhatsApp({ enlace }) {
  const src = useMemo(() => {
    try {
      return qrComoDataUrl(enlace, { celda: 5, margen: 2 });
    } catch {
      return "";
    }
  }, [enlace]);
  if (!src) return null;
  return <img className="bt2-qr" src={src} alt="Código QR para abrir WhatsApp en tu celular" width={176} height={176} />;
}

// Lado verde del diálogo (computadora): QR + «Abrir WhatsApp».
function LadoWhatsApp({ wa, empresa }) {
  return (
    <div className="bt2-lado-wa" data-postular-whatsapp>
      <p className="bt2-sobre">Lo más rápido</p>
      <h2 id="postular-titulo-wa">Postúlate por WhatsApp</h2>
      <p>Te abre un chat con el asistente{empresa ? ` de ${empresa}` : ""}. Te hace unas preguntas y te da día y hora de entrevista. Sin llenar formularios.</p>
      <div className="bt2-qr-caja">
        <QrWhatsApp enlace={wa.enlace} />
        <p>Escanea el código con la cámara de tu celular.</p>
      </div>
      <a className="bt2-btn principal ancho" href={wa.enlace} target="_blank" rel="noopener noreferrer">
        <IconoWhatsApp />Abrir WhatsApp
      </a>
    </div>
  );
}

// Solicitud corta en 3 pasos: datos → código por SMS → listo.
function SolicitudCorta({ v, onEnviada }) {
  const preguntas = useMemo(() => v?.preguntas_formulario ?? [], [v]);
  const [datos, setDatos] = useState({ nombre: "", telefono: "", correo: "" });
  const [respuestas, setRespuestas] = useState({});
  const [cv, setCv] = useState(null);
  const [acepto, setAcepto] = useState(false);
  const [errores, setErrores] = useState({});
  const [sinResponder, setSinResponder] = useState([]);
  const [paso, setPaso] = useState("datos");
  const [codigo, setCodigo] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const raiz = useRef(null);
  const tel = celularDiez(datos.telefono);

  useEffect(() => {
    if (paso === "codigo") raiz.current?.querySelector("#sol-codigo")?.focus();
    if (paso === "listo") raiz.current?.querySelector("[data-solicitud-enviada]")?.focus();
  }, [paso]);

  const poner = (k) => (e) => setDatos((d) => ({ ...d, [k]: e.target.value }));
  const enfocarError = () => requestAnimationFrame(() => enfocarPrimerError(raiz.current));

  const pedirCodigo = async (e) => {
    e?.preventDefault();
    setAviso("");
    const err = {};
    if (datos.nombre.trim().length < 3) err.nombre = "Escribe tu nombre completo.";
    if (tel.length !== 10) err.telefono = "Escribe tu celular a 10 dígitos, por ejemplo 33 1234 5678.";
    if (datos.correo.trim() && !CORREO.test(datos.correo.trim())) err.correo = "Revisa tu correo o déjalo vacío.";
    if (cv && cv.size > 10 * 1024 * 1024) err.cv = "Tu CV pesa más de 10 MB. Puedes enviar sin CV.";
    if (!acepto) err.acepto = "Para enviar, marca que leíste el aviso de privacidad.";
    const pendientes = faltantes(preguntas, respuestas);
    setErrores(err);
    setSinResponder(pendientes);
    if (Object.keys(err).length || pendientes.length) {
      setAviso("Revisa lo que está marcado en rojo.");
      enfocarError();
      return;
    }
    setEnviando(true);
    try {
      await axios.post(api("/otp/send"), { telefono: tel });
      setCodigo("");
      setPaso("codigo");
    } catch (error) {
      setAviso(mensajeApi(error, "No pudimos mandar el código. Revisa tu conexión e intenta de nuevo."));
    } finally {
      setEnviando(false);
    }
  };

  const enviar = async (e) => {
    e.preventDefault();
    setAviso("");
    if (soloDigitos(codigo).length !== 6) {
      setErrores({ codigo: "El código tiene 6 números." });
      enfocarError();
      return;
    }
    setErrores({});
    setEnviando(true);
    try {
      const r = await axios.post(api("/otp/verify"), { telefono: tel, code: soloDigitos(codigo) });
      const form = new FormData();
      form.append("id_vacante", v.id_vacante);
      form.append("nombre_completo", datos.nombre.trim());
      form.append("correo", datos.correo.trim());
      form.append("telefono", tel);
      // Prueba de que el teléfono se verificó; el backend la valida y la consume (INC-REC-002).
      form.append("telefono_verificacion_token", r?.data?.verification_token || "");
      if (preguntas.length) form.append("respuestas", JSON.stringify(respuestasParaEnviar(preguntas, respuestas)));
      if (cv) form.append("cv", cv);
      await axios.post(api("/postulaciones/create"), form);
      setPaso("listo");
      onEnviada?.();
    } catch (error) {
      setAviso(mensajeApi(error, "No pudimos enviar tu postulación. Revisa tu conexión e intenta de nuevo."));
    } finally {
      setEnviando(false);
    }
  };

  if (paso === "listo") {
    return (
      <div ref={raiz} className="bt2-listo" role="status" tabIndex={-1} data-solicitud-enviada>
        <CheckCircle2 aria-hidden="true" />
        <h3>¡Listo! Enviamos tu postulación</h3>
        <p>{v.nombre_empresa || "La empresa"} la va a revisar y te va a llamar o escribir al {celularBonito(tel)}.</p>
        <Link className="bt2-btn secundario ancho" href="/bolsa-de-trabajo">Ver más vacantes</Link>
      </div>
    );
  }

  if (paso === "codigo") {
    return (
      <form ref={raiz} className="bt2-form" onSubmit={enviar} noValidate data-paso="codigo">
        <h3 className="bt2-paso">Paso 2 de 2 · Confirma tu celular</h3>
        <p>Te mandamos un código de 6 números por SMS al <b>{celularBonito(tel)}</b>.</p>
        <div className="bt2-campo-grupo">
          <label htmlFor="sol-codigo" className="bt2-etiqueta">Código del SMS</label>
          <input id="sol-codigo" className="bt2-campo codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo}
            onChange={(e) => setCodigo(soloDigitos(e.target.value).slice(0, 6))} aria-invalid={errores.codigo ? true : undefined}
            aria-describedby={errores.codigo ? "sol-codigo-error" : undefined} disabled={enviando} />
          {errores.codigo ? <p id="sol-codigo-error" className="bt2-error">{errores.codigo}</p> : null}
        </div>
        {aviso ? <p className="bt2-aviso-error" role="alert">{aviso}</p> : null}
        <button type="submit" className="bt2-btn principal ancho" disabled={enviando}>
          {enviando ? <Loader2 className="girar" aria-hidden="true" /> : null}Confirmar y enviar
        </button>
        <div className="bt2-fila-links">
          <button type="button" className="bt2-texto-btn" onClick={() => { setPaso("datos"); setAviso(""); }} disabled={enviando}>Cambiar mi número</button>
          <button type="button" className="bt2-texto-btn" onClick={() => pedirCodigo()} disabled={enviando}>Mandar otro código</button>
        </div>
      </form>
    );
  }

  return (
    <form ref={raiz} className="bt2-form" onSubmit={pedirCodigo} noValidate data-paso="datos">
      <h3 className="bt2-paso">Paso 1 de 2 · Tus datos</h3>
      <div className="bt2-campo-grupo">
        <label htmlFor="sol-nombre" className="bt2-etiqueta">Nombre completo</label>
        <input id="sol-nombre" className="bt2-campo" autoComplete="name" maxLength={150} value={datos.nombre} onChange={poner("nombre")} disabled={enviando}
          aria-invalid={errores.nombre ? true : undefined} aria-describedby={errores.nombre ? "sol-nombre-error" : undefined} />
        {errores.nombre ? <p id="sol-nombre-error" className="bt2-error">{errores.nombre}</p> : null}
      </div>
      <div className="bt2-campo-grupo">
        <label htmlFor="sol-telefono" className="bt2-etiqueta">Celular</label>
        <p id="sol-telefono-ayuda" className="bt2-ayuda">10 números. Te mandamos un código por SMS para confirmarlo.</p>
        <input id="sol-telefono" className="bt2-campo" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={16} value={datos.telefono} onChange={poner("telefono")}
          disabled={enviando} aria-invalid={errores.telefono ? true : undefined} aria-describedby={errores.telefono ? "sol-telefono-ayuda sol-telefono-error" : "sol-telefono-ayuda"} />
        {errores.telefono ? <p id="sol-telefono-error" className="bt2-error">{errores.telefono}</p> : null}
      </div>
      <div className="bt2-campo-grupo">
        <label htmlFor="sol-correo" className="bt2-etiqueta">Correo <span className="bt2-opcional">(opcional)</span></label>
        <input id="sol-correo" className="bt2-campo" type="email" autoComplete="email" maxLength={120} value={datos.correo} onChange={poner("correo")} disabled={enviando}
          aria-invalid={errores.correo ? true : undefined} aria-describedby={errores.correo ? "sol-correo-error" : undefined} />
        {errores.correo ? <p id="sol-correo-error" className="bt2-error">{errores.correo}</p> : null}
      </div>
      <PreguntasGrandes preguntas={preguntas} valores={respuestas} onCambiar={setRespuestas} errores={sinResponder} disabled={enviando} />
      <div className="bt2-campo-grupo">
        <span className="bt2-etiqueta" id="sol-cv-t">Tu CV <span className="bt2-opcional">(opcional)</span></span>
        <label className="bt2-btn secundario ancho bt2-archivo">
          <Paperclip aria-hidden="true" />
          <span>{cv ? `Cambiar: ${cv.name}` : "Agregar mi CV (PDF o foto)"}</span>
          <input type="file" className="sr-only" accept="application/pdf,image/*" aria-labelledby="sol-cv-t" disabled={enviando}
            aria-invalid={errores.cv ? true : undefined} aria-describedby={errores.cv ? "sol-cv-error" : undefined}
            onChange={(e) => setCv(e.target.files?.[0] ?? null)} />
        </label>
        {cv ? <button type="button" className="bt2-texto-btn" onClick={() => setCv(null)}>Quitar el CV</button> : null}
        {errores.cv ? <p id="sol-cv-error" className="bt2-error">{errores.cv}</p> : null}
      </div>
      <div className="bt2-campo-grupo">
        <label className="bt2-acepto">
          <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} disabled={enviando}
            aria-invalid={errores.acepto ? true : undefined} aria-describedby={errores.acepto ? "sol-acepto-error" : undefined} />
          <span>Leí el <a href="/aviso-privacidad" target="_blank" rel="noopener noreferrer">aviso de privacidad</a> y acepto que la empresa me contacte.</span>
        </label>
        {errores.acepto ? <p id="sol-acepto-error" className="bt2-error">{errores.acepto}</p> : null}
      </div>
      {aviso ? <p className="bt2-aviso-error" role="alert">{aviso}</p> : null}
      <button type="submit" className="bt2-btn principal ancho" disabled={enviando}>
        {enviando ? <Loader2 className="girar" aria-hidden="true" /> : null}Enviar postulación
      </button>
    </form>
  );
}

// Con sesión de candidato: mismas preguntas y confirmación (POST /postulaciones/postulacion-auth, como antes).
function ConfirmarConSesion({ v, dataUser, onEnviada }) {
  const preguntas = useMemo(() => v?.preguntas_formulario ?? [], [v]);
  const [respuestas, setRespuestas] = useState({});
  const [sinResponder, setSinResponder] = useState([]);
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e) => {
    e.preventDefault();
    const pendientes = faltantes(preguntas, respuestas);
    setSinResponder(pendientes);
    if (pendientes.length) return setAviso("Responde las preguntas marcadas.");
    setEnviando(true);
    setAviso("");
    try {
      await axios.post(api("/postulaciones/postulacion-auth"), { id_vacante: v.id_vacante, id_usuario: dataUser.id_usuario, respuestas: respuestasParaEnviar(preguntas, respuestas) },
        { headers: { Authorization: `Bearer ${Cookies.get("token")}` } });
      mutate(`/postulaciones/by-correo/${dataUser.correo}`);
      onEnviada?.();
    } catch (error) {
      setAviso(mensajeApi(error, "No pudimos enviar tu postulación. Intenta de nuevo."));
    } finally {
      setEnviando(false);
    }
  };
  return (
    <form className="bt2-form" onSubmit={enviar} noValidate>
      <p>Te vas a postular con los datos de tu cuenta ({dataUser?.correo}).</p>
      <PreguntasGrandes preguntas={preguntas} valores={respuestas} onCambiar={setRespuestas} errores={sinResponder} disabled={enviando} />
      {aviso ? <p className="bt2-aviso-error" role="alert">{aviso}</p> : null}
      <button type="submit" className="bt2-btn principal ancho" disabled={enviando}>Sí, postularme</button>
    </form>
  );
}

// Diálogo de postulación. conWhatsApp: en computadora, el lado verde con QR a la izquierda.
function DialogoPostular({ abierto, onAbierto, v, wa, conWhatsApp, candidato, dataUser, onEnviada, alCerrar }) {
  return (
    <Dialog.Root open={abierto} onOpenChange={onAbierto}>
      <Dialog.Portal>
        <Dialog.Overlay className="bt2-velo" />
        <Dialog.Content className={`bt2 bt2-dialogo${conWhatsApp ? " doble" : ""}`} aria-describedby={undefined} data-dialogo-postular
          onCloseAutoFocus={(e) => { e.preventDefault(); alCerrar?.(); }}>
          {conWhatsApp ? <LadoWhatsApp wa={wa} empresa={v.nombre_empresa} /> : null}
          <div className="bt2-lado-form">
            <div className="bt2-dialogo-cab">
              <Dialog.Title asChild>
                <h2>{conWhatsApp ? "O con un formulario corto" : `Postularme a ${v.titulo}`}</h2>
              </Dialog.Title>
              <Dialog.Close className="bt2-icono-btn" aria-label="Cerrar"><X aria-hidden="true" /></Dialog.Close>
            </div>
            {candidato ? <ConfirmarConSesion v={v} dataUser={dataUser} onEnviada={onEnviada} /> : <SolicitudCorta v={v} onEnviada={onEnviada} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Botones de postulación de la ficha. pagina: en celular van fijos abajo. completo: ya llegaron los datos de la página de
// la vacante (preguntas, periodo); antes no se ofrece postularse.
export default function AccionesPostular({ v, pagina = false, completo = true }) {
  const { estado, candidato, dataUser } = usePostulacion(completo ? v : null);
  const [abierto, setAbierto] = useState(false);
  const [conWhatsApp, setConWhatsApp] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const origen = useRef(null);
  const wa = postulaPorWhatsApp(v);
  useEffect(() => { setEnviada(false); setAbierto(false); }, [v?.slug]);

  if (!completo) return <div className={`bt2-acciones${pagina ? " barra" : ""}`} aria-hidden="true"><span className="bt2-btn principal ancho esqueleto" /></div>;
  if (estado === "no-aplica") return null;
  let nota = null;
  if (enviada || estado === "ya") nota = enviada ? "Ya enviamos tu postulación. La empresa te va a contactar." : "Ya te postulaste a esta vacante.";
  else if (estado === "sin-lugares") nota = "Ya no hay lugares disponibles para esta vacante.";
  else if (estado === "cerrada") nota = "Esta vacante ya cerró su periodo de postulaciones.";
  // Se abre desde botones propios (no Dialog.Trigger): al cerrar, el foco vuelve al que lo abrió (o a la ficha).
  const abrir = (doble) => { origen.current = document.activeElement; setConWhatsApp(doble); setAbierto(true); };
  const alCerrar = () => {
    const el = origen.current;
    if (el?.isConnected && el.offsetParent !== null) el.focus();
    else document.querySelector(".bt2-acciones .bt2-nota, [data-ficha] h1, [data-ficha] h2")?.focus?.();
  };
  // El diálogo sigue montado después de enviar para que se vea «¡Listo!» hasta que la persona lo cierre.
  const dialogo = (
    <DialogoPostular abierto={abierto} onAbierto={setAbierto} v={v} wa={wa} conWhatsApp={conWhatsApp && Boolean(wa)} candidato={candidato} dataUser={dataUser}
      onEnviada={() => { setEnviada(true); if (candidato) setAbierto(false); }} alCerrar={alCerrar} />
  );
  // Misma estructura con nota o con botones (el diálogo en el mismo lugar): así no se reinicia al enviar.
  return (
    <div className={`bt2-acciones${pagina ? " barra" : ""}${nota ? " nota" : ""}`} data-acciones-postular={nota ? undefined : ""}>
      {nota ? (
        <p className={`bt2-nota${enviada || estado === "ya" ? " ok" : ""}`} role="status" tabIndex={-1}>{enviada || estado === "ya" ? <CheckCircle2 aria-hidden="true" /> : null}{nota}</p>
      ) : (
        <div className="bt2-acciones-botones">
          {/* Celular: verde a WhatsApp (directo) y «No tengo WhatsApp» al formulario; sin asistente, «Postularme». */}
          <div className="solo-movil">
            {wa ? (
              <>
                <a className="bt2-btn verde ancho" href={wa.enlace} target="_blank" rel="noopener noreferrer" data-boton-principal>
                  <IconoWhatsApp />Postularme por WhatsApp
                </a>
                <button type="button" className="bt2-texto-btn grande" onClick={() => abrir(false)}>No tengo WhatsApp: llenar formulario</button>
              </>
            ) : (
              <button type="button" className="bt2-btn principal ancho" onClick={() => abrir(false)} data-boton-principal>Postularme</button>
            )}
          </div>
          {/* Computadora: «Postularme» abre el diálogo (con QR si hay asistente). */}
          <div className="solo-escritorio">
            <button type="button" className="bt2-btn principal" onClick={() => abrir(Boolean(wa))} data-boton-principal>Postularme</button>
            {wa ? (
              <button type="button" className="bt2-btn contorno-verde" onClick={() => abrir(true)}>
                <IconoWhatsApp />Postularme por WhatsApp
              </button>
            ) : null}
          </div>
        </div>
      )}
      {dialogo}
    </div>
  );
}
