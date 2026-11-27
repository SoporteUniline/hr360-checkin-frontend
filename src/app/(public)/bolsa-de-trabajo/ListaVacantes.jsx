"use client";
/* eslint-disable @next/next/no-img-element -- logos de las empresas (S3) con tamaño fijo; next/image exige dominios */
import Link from "next/link";
import { Inbox, RotateCw, SearchX } from "lucide-react";
import {
  colorLogo, distanciaTexto, esNueva, haceCuanto, iniciales, jornadaVacante, postulaPorWhatsApp, sueldoVacante, ubicacionVacante,
} from "@/lib/bolsaTrabajo.mjs";
import IconoWhatsApp from "@/components/IconoWhatsApp";

// Logo de la empresa o sus iniciales en un cuadro de color fijo (decorativo: el nombre va en texto al lado).
export function LogoEmpresa({ v, tam = 48 }) {
  const nombre = v.nombre_empresa || v.titulo || "";
  if (v.url_imagen) return <img className="bt2-logo" src={v.url_imagen} alt="" width={tam} height={tam} loading="lazy" decoding="async" style={{ width: tam, height: tam }} />;
  return (
    <span className="bt2-logo ini" aria-hidden="true" style={{ width: tam, height: tam, background: colorLogo(nombre), fontSize: Math.round(tam * 0.36) }}>
      {iniciales(nombre)}
    </span>
  );
}

// Tarjeta de la lista. En escritorio, tocar el título elige la vacante (se ve a la derecha, ?v=slug); en celular abre su
// página. Es un enlace real a /vacante/<slug> en los dos casos (se puede abrir en otra pestaña o compartir).
function Tarjeta({ v, ahora, elegida, onElegir }) {
  const sueldo = sueldoVacante(v);
  const lugar = ubicacionVacante(v);
  const distancia = distanciaTexto(v.distancia_km);
  const fecha = haceCuanto(v.fecha_publicacion, ahora);
  const jornada = jornadaVacante(v);
  const wa = postulaPorWhatsApp(v);
  const nueva = esNueva(v.fecha_publicacion, ahora);
  const empresaLugar = [v.nombre_empresa, lugar, distancia].filter(Boolean).join(" · ");
  const alElegir = (e) => {
    if (!onElegir || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return; // celular: abre la página de la vacante
    e.preventDefault();
    onElegir(v.slug);
  };
  return (
    <li>
      <article className={`bt2-tarjeta${elegida ? " elegida" : ""}`} data-vacante={v.slug}>
        <LogoEmpresa v={v} />
        <div className="bt2-tarjeta-cuerpo">
          {nueva ? <p className="bt2-insignias"><span className="bt2-insignia nueva">Nueva</span></p> : null}
          <h3>
            <Link className="bt2-tarjeta-link" href={`/vacante/${encodeURIComponent(v.slug)}`} onClick={alElegir} aria-current={elegida ? "true" : undefined}>
              {v.titulo}
            </Link>
          </h3>
          {empresaLugar ? <p className="bt2-tarjeta-emp">{empresaLugar}</p> : null}
          <p className={`bt2-tarjeta-sueldo${sueldo.conocido ? "" : " sin"}`}><span className="sr-only">Sueldo: </span>{sueldo.texto}</p>
          {v.modalidad || jornada || wa ? (
            <ul className="bt2-chips-datos" aria-label="Datos de la vacante">
              {v.modalidad ? <li>{v.modalidad}</li> : null}
              {jornada ? <li>{jornada}</li> : null}
              {wa ? <li className="wa"><IconoWhatsApp />Postúlate por WhatsApp</li> : null}
            </ul>
          ) : null}
          {fecha ? <p className="bt2-tarjeta-fecha">{fecha}</p> : null}
        </div>
      </article>
    </li>
  );
}

// Flechas ↑ ↓ (e Inicio / Fin) recorren las tarjetas sin pasar por todo lo demás; Enter elige (escritorio) o abre.
function moverFoco(e) {
  const teclas = { ArrowDown: 1, ArrowUp: -1, Home: "inicio", End: "fin" };
  if (!(e.key in teclas) || !e.target.classList?.contains("bt2-tarjeta-link")) return;
  const enlaces = [...e.currentTarget.querySelectorAll(".bt2-tarjeta-link")];
  const i = enlaces.indexOf(e.target);
  const t = teclas[e.key];
  const j = t === "inicio" ? 0 : t === "fin" ? enlaces.length - 1 : Math.min(Math.max(i + t, 0), enlaces.length - 1);
  if (j !== i) {
    e.preventDefault();
    enlaces[j].focus();
  }
}

export default function ListaVacantes({ vacantes, actualizando, elegida, onElegir }) {
  const ahora = new Date();
  return (
    <ul className="bt2-lista" aria-busy={actualizando || undefined} aria-label="Vacantes" onKeyDown={moverFoco}>
      {vacantes.map((v) => <Tarjeta key={v.id_vacante ?? v.slug} v={v} ahora={ahora} elegida={elegida === v.slug} onElegir={onElegir} />)}
    </ul>
  );
}

export function Esqueletos({ n = 4 }) {
  return (
    <ul className="bt2-lista" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="bt2-esq">
          <i className="cuadro" />
          <div>
            <i style={{ width: "55%", height: 20 }} />
            <i style={{ width: "40%", height: 16 }} />
            <i style={{ width: "30%", height: 16 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Estado({ tipo, titulo, children, accion }) {
  const Icono = tipo === "error" ? RotateCw : tipo === "vacio-filtros" ? SearchX : Inbox;
  return (
    <div className={`bt2-estado${tipo === "error" ? " error" : ""}`} role={tipo === "error" ? "alert" : "status"}>
      <span className="ico" aria-hidden="true"><Icono /></span>
      <h3>{titulo}</h3>
      <p>{children}</p>
      {accion}
    </div>
  );
}
