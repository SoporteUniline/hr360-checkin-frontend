"use client";
/* eslint-disable @next/next/no-img-element -- logos de las empresas (S3) con tamaño fijo; next/image exige dominios */
import Link from "next/link";
import { Briefcase, Building2, Clock, MapPin, RotateCw, SearchX, Inbox } from "lucide-react";
import { esNueva, formatoSueldo, haceCuanto, textoPlano, ubicacionVacante } from "@/lib/bolsaTrabajo.mjs";

function Logo({ v }) {
  if (v.url_imagen) return <img className="bt-vac-logo" src={v.url_imagen} alt="" width={56} height={56} loading="lazy" decoding="async" />;
  const inicial = (v.nombre_empresa || v.titulo || "?").trim().charAt(0).toUpperCase();
  return <span className="bt-vac-logo ini" aria-hidden="true">{inicial}</span>;
}

function Vacante({ v, ahora }) {
  const sueldo = formatoSueldo(v.salario);
  const fecha = haceCuanto(v.fecha_publicacion, ahora);
  const lugar = ubicacionVacante(v);
  const extracto = textoPlano(v.descripcion, 180);
  return (
    <li>
      <article className="bt-vac" data-vacante={v.slug}>
        <Logo v={v} />
        <div className="bt-vac-main">
          <h3>
            <Link className="bt-vac-link" href={`/vacante/${encodeURIComponent(v.slug)}`}>{v.titulo}</Link>
          </h3>
          {v.nombre_empresa ? <p className="bt-vac-emp">{v.nombre_empresa}</p> : null}
          <ul className="bt-meta" aria-label="Datos de la vacante">
            {lugar ? <li><MapPin aria-hidden="true" /><span>{lugar}</span></li> : null}
            {v.modalidad ? <li><Building2 aria-hidden="true" /><span>{v.modalidad}</span></li> : null}
            {v.tipo_contratacion ? <li><Briefcase aria-hidden="true" /><span>{v.tipo_contratacion}</span></li> : null}
          </ul>
          {extracto ? <p className="bt-vac-ext">{extracto}</p> : null}
        </div>
        <div className="bt-vac-lado">
          {sueldo ? <p className="bt-sueldo"><span className="sr-only">Sueldo: </span>{sueldo}</p> : null}
          {esNueva(v.fecha_publicacion, ahora) ? <span className="bt-nueva">Nueva</span> : null}
          {fecha ? <p className="bt-fecha"><Clock aria-hidden="true" />{fecha}</p> : null}
        </div>
      </article>
    </li>
  );
}

export function Esqueletos({ n = 5 }) {
  return (
    <ul className="bt-lista" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="bt-esq">
          <i />
          <div>
            <i style={{ width: "48%", height: 20 }} />
            <i style={{ width: "30%", height: 14 }} />
            <i style={{ width: "70%", height: 14 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Estado({ tipo, titulo, children, accion }) {
  const Icono = tipo === "error" ? RotateCw : tipo === "vacio-filtros" ? SearchX : Inbox;
  return (
    <div className={`bt-estado ${tipo === "error" ? "error" : ""}`} role={tipo === "error" ? "alert" : "status"}>
      <span className="ico" aria-hidden="true"><Icono /></span>
      <h3>{titulo}</h3>
      <p>{children}</p>
      {accion}
    </div>
  );
}

export default function ListaVacantes({ vacantes, actualizando }) {
  const ahora = new Date();
  return (
    <ul className="bt-lista" aria-busy={actualizando || undefined}>
      {vacantes.map((v) => <Vacante key={v.id_vacante ?? v.slug} v={v} ahora={ahora} />)}
    </ul>
  );
}
