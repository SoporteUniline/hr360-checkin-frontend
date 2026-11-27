/* eslint-disable @next/next/no-img-element -- imagen subida por el equipo de ADAMIA (S3), tamaño variable */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  enlaceConCupon, validoHasta, LADAS, LADA_PREDETERMINADA, ladaDe, soloDigitos, celularValido,
  celularInternacional, datosContactoValidos, mensajeContacto, enlaceWhatsApp,
} from "@/lib/popups/reglas.mjs";
import { DOCS_AVISO, registrarAceptacion } from "@/lib/legal/aceptacion";
import { NOTICIAS, MENSAJES_CORREO, estadoCorreo, limpiarCorreo } from "@/lib/prospectos/reglas.mjs";
import { guardarProspecto } from "@/lib/prospectos/guardar";
import PopupCollage from "./PopupCollage";
import "./popup-venta.css";

// La imagen la entrega el backend (ruta relativa a NEXT_PUBLIC_RUTA_BACKEND); una vista previa local trae blob:.
const fuenteImagen = (url) => (url?.startsWith("/") ? `${process.env.NEXT_PUBLIC_RUTA_BACKEND ?? ""}${url}` : url);
const SUBTITULO = "Déjanos tus datos y un asesor te llama para mostrarte cómo ADAMIA simplifica tu RH.";
// (27/11/2026) «contratos» y no «nómina»: ADAMIA no timbra; la frase no debe prometer lo que no hace.
const FRASE = "Checador, contratos y firma en una sola app";

// Pop-up de venta: a la izquierda «Conversemos» (nombre + celular con lada + correo opcional + aviso de privacidad y,
// aparte y desmarcada, la casilla de noticias); a la derecha
// el collage de marca (o la imagen que subió el equipo) con la frase de valor. La usan la página pública
// (PopupVenta) y la vista previa del panel (vistaPrevia: no envía nada).
export default function PopupTarjeta({ popup, alCerrar, alEnviar, alContinuar, cerrarRef, tituloId, vistaPrevia = false }) {
  // Ids propios: en el panel la vista previa convive con el formulario de edición (no deben repetirse).
  const uid = useId();
  const id = (n) => `pv${uid}${n}`;
  const [nombre, setNombre] = useState("");
  const [iso, setIso] = useState(LADA_PREDETERMINADA);
  const [celular, setCelular] = useState("");
  const [tocado, setTocado] = useState(false);
  const [acepta, setAcepta] = useState(false);
  const [correo, setCorreo] = useState("");
  const [correoTocado, setCorreoTocado] = useState(false);
  const [noticias, setNoticias] = useState(false);
  const correoRef = useRef(null);
  const [enviado, setEnviado] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const graciasRef = useRef(null);
  const lada = ladaDe(iso);
  const valido = datosContactoValidos({ nombre, iso, celular, acepta, correo, noticias });
  // Falta el correo con la casilla marcada: se avisa en ese momento. Mal escrito: al salir del campo.
  const { error: problemaCorreo } = estadoCorreo({ correo, noticias });
  const errorCorreo = problemaCorreo === "falta" || (problemaCorreo === "formato" && correoTocado) ? MENSAJES_CORREO[problemaCorreo] : null;
  const errorCelular = tocado && soloDigitos(celular).length > 0 && !celularValido(iso, celular);
  const hasta = validoHasta(popup.fecha_fin);
  const externo = /^https:\/\//i.test(popup.boton_url ?? "");

  useEffect(() => {
    if (enviado) graciasRef.current?.focus();
  }, [enviado]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(popup.cupon);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  const enviar = (e) => {
    e.preventDefault();
    if (!valido || vistaPrevia) return;
    // Mismo canal que /contacto: WhatsApp de ventas (se abre dentro del clic para que el navegador no lo bloquee).
    window.open(enlaceWhatsApp(mensajeContacto({ nombre, iso, celular, correo, titulo: popup.titulo, cupon: popup.cupon })), "_blank", "noopener,noreferrer");
    // Después de abrir WhatsApp y sin esperar: constancia del aviso de privacidad y el prospecto (con el permiso de
    // noticias, si lo dio). Si fallan, la persona sigue igual.
    const telefono = celularInternacional(iso, celular);
    const correoLimpio = limpiarCorreo(correo) || undefined;
    registrarAceptacion({ contexto: "contacto", documentos: DOCS_AVISO, nombre: nombre.trim(), correo: correoLimpio, telefono });
    guardarProspecto({ nombre, celular: telefono, correo, noticias, origen: { tipo: "popup", id: popup.id, titulo: popup.titulo } });
    alEnviar?.();
    setEnviado({ nombre: nombre.trim().split(/\s+/)[0], celular: `+${lada.codigo} ${soloDigitos(celular)}`, noticias: noticias ? correoLimpio : null });
  };

  const cupon = popup.cupon ? (
    <div className="pv-cupon">
      <span>Tu código</span>
      <b>{popup.cupon}</b>
      <button type="button" onClick={copiar} aria-live="polite">{copiado ? "¡Copiado!" : "Copiar"}</button>
    </div>
  ) : null;

  return (
    <div className="pv-marco">
      <div className={`pv-tarjeta${popup.imagen_url ? " con-imagen" : ""}`}>
        <button ref={cerrarRef} type="button" className="pv-cerrar" aria-label="Cerrar" onClick={alCerrar}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="pv-lado">
          {enviado ? (
            <div className="pv-gracias" aria-live="polite">
              <span className="pv-ok" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
              <h2 id={tituloId ?? id("titulo")} ref={graciasRef} tabIndex={-1}>¡Gracias, {enviado.nombre}!</h2>
              <p>Te abrimos WhatsApp con tus datos: envía el mensaje y un asesor de ADAMIA te llamará al <b>{enviado.celular}</b>.</p>
              {enviado.noticias ? (
                <p>Te enviaremos noticias a <b className="pv-correo">{enviado.noticias}</b>. Cada correo trae un enlace para darte de baja.</p>
              ) : null}
              {cupon}
              <a
                className="pv-boton"
                href={enlaceConCupon(popup.boton_url, popup.cupon)}
                onClick={alContinuar}
                {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                Continuar
              </a>
            </div>
          ) : (
            <form className="pv-form" onSubmit={enviar} noValidate>
              <span className="pv-marca">ADAMIA · Asesoría sin costo</span>
              <h2 id={tituloId ?? id("titulo")}>{popup.titulo}</h2>
              <p className="pv-sub">{popup.texto || SUBTITULO}</p>
              {cupon}
              <div className="pv-campo">
                <label htmlFor={id("nombre")}>Nombre</label>
                <input
                  id={id("nombre")}
                  name="nombre"
                  autoComplete="name"
                  placeholder="Tu nombre"
                  maxLength={150}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div className="pv-campo">
                <label htmlFor={id("celular")}>Número de celular</label>
                <div className="pv-tel">
                  <span className="pv-lada">
                    <span className="pv-bandera" aria-hidden="true">{lada.bandera}</span>
                    <span aria-hidden="true">+{lada.codigo}</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" /></svg>
                    <select aria-label="Lada del país" value={iso} onChange={(e) => setIso(e.target.value)}>
                      {LADAS.map((l) => (
                        <option key={l.iso} value={l.iso}>{`${l.pais} (+${l.codigo})`}</option>
                      ))}
                    </select>
                  </span>
                  <input
                    id={id("celular")}
                    name="celular"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder={lada.ejemplo}
                    maxLength={18}
                    value={celular}
                    aria-invalid={errorCelular || undefined}
                    aria-describedby={id("celular-ayuda")}
                    onChange={(e) => setCelular(e.target.value.replace(/[^\d\s()-]/g, ""))}
                    onBlur={() => setTocado(true)}
                  />
                </div>
                <small id={id("celular-ayuda")} className={errorCelular ? "pv-error" : ""}>
                  {errorCelular
                    ? `Revisa tu número: en ${lada.pais} lleva ${lada.digitos.join(" u ")} dígitos.`
                    : `${lada.digitos.join(" u ")} dígitos, sin la lada.`}
                </small>
              </div>
              <div className="pv-campo">
                <label htmlFor={id("correo")}>Correo <span className="pv-opcional">(opcional)</span></label>
                <input
                  ref={correoRef}
                  id={id("correo")}
                  name="correo"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nombre@empresa.com"
                  maxLength={255}
                  value={correo}
                  aria-invalid={errorCorreo ? true : undefined}
                  aria-describedby={errorCorreo ? id("correo-error") : undefined}
                  onChange={(e) => setCorreo(e.target.value)}
                  onBlur={() => setCorreoTocado(true)}
                />
                {errorCorreo ? <small id={id("correo-error")} className="pv-error" role="alert">{errorCorreo}</small> : null}
              </div>
              <label htmlFor={id("acepto")} className="pv-acepto">
                <input id={id("acepto")} type="checkbox" required checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
                <span>
                  He leído y acepto el <Link href="/aviso-privacidad" target="_blank">Aviso de privacidad</Link>.
                </span>
              </label>
              {/* Aparte del aviso y desmarcada: es un permiso distinto (se guarda con su propia constancia). */}
              <label htmlFor={id("noticias")} className="pv-acepto">
                <input
                  id={id("noticias")}
                  type="checkbox"
                  checked={noticias}
                  onChange={(e) => {
                    setNoticias(e.target.checked);
                    // Sin correo, se pide en ese momento: el foco va al campo y aparece el aviso.
                    if (e.target.checked && !limpiarCorreo(correo)) correoRef.current?.focus();
                  }}
                />
                <span>{NOTICIAS.texto}</span>
              </label>
              <button type="submit" className="pv-boton" disabled={!valido}>{popup.boton_texto || "Conversemos"}</button>
              {hasta ? <small className="pv-vigencia">Válido hasta el {hasta}.</small> : null}
            </form>
          )}
        </div>

        <div className="pv-visual">
          {popup.imagen_url ? (
            <div className="pv-imagen">
              <img src={fuenteImagen(popup.imagen_url)} alt="" />
            </div>
          ) : (
            <PopupCollage />
          )}
          <p className="pv-franja">{FRASE}</p>
        </div>
      </div>
    </div>
  );
}
