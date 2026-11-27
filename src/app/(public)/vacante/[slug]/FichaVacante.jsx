"use client";
// Ficha de una vacante (bolsa v2, 27/11/2026): la misma en el panel derecho de la bolsa (escritorio) y en su página
// /vacante/<slug>. Texto grande y en palabras de todos los días: Sueldo, Dónde, Horario, Qué harás, Cómo postularte.
// Solo se muestra lo que trae el API (sin «personas postuladas», «contratación inmediata» ni prestaciones inventadas).
import { useState } from "react";
import Link from "next/link";
import { Check, Share2 } from "lucide-react";
// HTML de la vacante saneado antes de insertarlo (INC-REC-003).
import { sanearHtml } from "@/lib/htmlSeguro.mjs";
import {
  apoyoWhatsApp, distanciaTexto, dondeVacante, etiquetaWhatsApp, experienciaTexto, haceCuanto, jornadaVacante, postulaPorWhatsApp,
  sueldoVacante, textoPlano, ubicacionVacante, whatsappDeVacante,
} from "@/lib/bolsaTrabajo.mjs";
import IconoWhatsApp from "@/components/IconoWhatsApp";
import { LogoEmpresa } from "../../bolsa-de-trabajo/ListaVacantes";
import AccionesPostular from "./Postular";

const tieneTexto = (html) => textoPlano(html).length > 0;
const fechaLarga = (dia) => {
  const m = String(dia ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: "UTC" });
};

function Prosa({ html }) {
  return <div className="bt2-prosa" dangerouslySetInnerHTML={{ __html: sanearHtml(html) }} />;
}

// Compartir: el menú del celular si existe; si no, copia el enlace.
function Compartir({ v }) {
  const [copiado, setCopiado] = useState(false);
  const compartir = async () => {
    const url = `${window.location.origin}/vacante/${encodeURIComponent(v.slug)}`;
    const titulo = v.nombre_empresa ? `${v.titulo} en ${v.nombre_empresa}` : v.titulo;
    try {
      if (navigator.share) return await navigator.share({ title: titulo, text: `Vacante: ${titulo}`, url });
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* canceló o sin permiso: no pasa nada */
    }
  };
  return (
    <>
      <button type="button" className="bt2-btn secundario" onClick={compartir}>
        {copiado ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}{copiado ? "Enlace copiado" : "Compartir"}
      </button>
      <span className="sr-only" role="status">{copiado ? "Enlace copiado" : ""}</span>
    </>
  );
}

// Pasos de «Cómo postularte» según el camino principal.
function ComoPostularte({ wa, empresa, Sub, id }) {
  const pasos = wa
    ? ["Toca el botón verde «Postularme por WhatsApp».", `Contesta unas preguntas en WhatsApp${empresa ? ` con el asistente de ${empresa}` : ""}.`, "Te damos día y hora de entrevista."]
    : ["Toca «Postularme».", "Escribe tu nombre y tu celular y contesta las preguntas.", "Confirma con el código que te llega por SMS. ¡Listo!"];
  return (
    <section className="bt2-como" aria-labelledby={id}>
      <Sub id={id}>Cómo postularte</Sub>
      <ol>
        {pasos.map((p, i) => <li key={p} className={i === 2 ? "ultimo" : undefined}><span className="num" aria-hidden="true">{i + 1}</span><span>{p}</span></li>)}
      </ol>
    </section>
  );
}

export default function FichaVacante({ v, nivel = "h1", pagina = false, completo = true }) {
  const Titulo = nivel;
  const Sub = nivel === "h1" ? "h2" : "h3";
  const sueldo = sueldoVacante(v);
  const lugar = ubicacionVacante(v);
  const distancia = distanciaTexto(v.distancia_km);
  const wa = postulaPorWhatsApp(v);
  const waInfo = whatsappDeVacante(v);
  const experiencia = experienciaTexto(v);
  const jornada = jornadaVacante(v);
  const cierre = fechaLarga(v.cierra_el);
  const publicada = haceCuanto(v.fecha_publicacion);
  const datos = [
    ["Sueldo", sueldo.texto, !sueldo.conocido],
    ["Dónde", [dondeVacante(v), distancia].filter(Boolean).join(" · ")],
    ["Horario", v.horario],
    ["Jornada", jornada],
    ["Modalidad", v.modalidad],
    ["Contrato", v.tipo_contrato && v.tipo_contrato !== jornada ? v.tipo_contrato : ""],
    ["Experiencia", experiencia],
    ["Recibe postulaciones", cierre ? `Hasta el ${cierre}` : ""],
  ].filter(([, valor]) => valor && String(valor).trim());
  const queHaras = tieneTexto(v.responsabilidades) ? v.responsabilidades : v.descripcion;
  const sobre = tieneTexto(v.responsabilidades) && tieneTexto(v.descripcion) ? v.descripcion : "";
  const requisitos = [
    ["Escolaridad", v.escolaridad],
    ["Experiencia", experiencia === "No necesaria" ? "" : v.experiencia],
    ["Habilidades", v.habilidades],
    ["Idiomas", v.idiomas],
  ].filter(([, html]) => tieneTexto(html));

  return (
    <article className={`bt2-ficha${pagina ? " pagina" : ""}`} data-ficha={v.slug}>
      <header className="bt2-ficha-cab">
        <LogoEmpresa v={v} tam={64} />
        <div>
          <Titulo className="bt2-ficha-titulo">{v.titulo}</Titulo>
          <p className="bt2-ficha-emp">{[v.nombre_empresa, lugar].filter(Boolean).join(" · ")}</p>
          {publicada ? <p className="bt2-ficha-fecha">{publicada}</p> : null}
        </div>
      </header>

      <AccionesPostular v={v} pagina={pagina} completo={completo} />

      {datos.length ? (
        <dl className="bt2-datos">
          {datos.map(([t, valor, gris]) => (
            <div key={t}><dt>{t}</dt><dd className={gris ? "sin" : undefined}>{valor}</dd></div>
          ))}
        </dl>
      ) : null}

      {tieneTexto(queHaras) ? (
        <section className="bt2-bloque" aria-labelledby={`h-hara-${v.slug}`}>
          <Sub id={`h-hara-${v.slug}`}>Qué harás</Sub>
          <Prosa html={queHaras} />
        </section>
      ) : null}

      <ComoPostularte wa={wa} empresa={v.nombre_empresa} Sub={Sub} id={`h-como-${v.slug}`} />

      {sobre ? (
        <section className="bt2-bloque" aria-labelledby={`h-sobre-${v.slug}`}>
          <Sub id={`h-sobre-${v.slug}`}>Sobre el puesto</Sub>
          <Prosa html={sobre} />
        </section>
      ) : null}

      {requisitos.length ? (
        <section className="bt2-bloque" aria-labelledby={`h-busca-${v.slug}`}>
          <Sub id={`h-busca-${v.slug}`}>Lo que buscamos</Sub>
          <dl className="bt2-requisitos">
            {requisitos.map(([t, html]) => <div key={t}><dt>{t}</dt><dd><Prosa html={html} /></dd></div>)}
          </dl>
        </section>
      ) : null}

      {waInfo && !wa ? (
        <section className="bt2-bloque bt2-dudas" aria-labelledby={`h-dudas-${v.slug}`}>
          <Sub id={`h-dudas-${v.slug}`}>¿Tienes dudas?</Sub>
          <a className="bt2-btn contorno-verde" href={waInfo.enlace} target="_blank" rel="noopener noreferrer" aria-label={etiquetaWhatsApp(v.titulo)} aria-describedby={`wa-apoyo-${v.slug}`}>
            <IconoWhatsApp />Preguntar por WhatsApp
          </a>
          <p id={`wa-apoyo-${v.slug}`} className="bt2-ayuda">{apoyoWhatsApp(waInfo)}</p>
        </section>
      ) : null}

      <footer className="bt2-ficha-pie">
        {v.nombre_empresa ? (
          <div className="bt2-empresa">
            <b>{v.nombre_empresa}</b>
            {v.giro ? <span>{v.giro}</span> : null}
            {v.id_empresa ? <Link href={`/bolsa-de-trabajo?empresa=${encodeURIComponent(v.id_empresa)}`}>Ver más vacantes de esta empresa</Link> : null}
          </div>
        ) : null}
        <Compartir v={v} />
      </footer>
    </article>
  );
}
