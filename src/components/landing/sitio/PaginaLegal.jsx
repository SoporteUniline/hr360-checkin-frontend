import Link from "next/link";
import { hayPendientes } from "@/lib/legal/responsable";
import "@/components/landing/home/landing-home.css";
import "./legal.css";

// Documento legal con el estilo del sitio: índice, versión y fecha. Contenido en src/lib/legal/documentos.js.
export default function PaginaLegal({ doc, relacionados = [] }) {
  return (
    <div className="lh lg">
      <section className="lg-hero">
        <div className="wrap">
          <span className="eyebrow">Legal</span>
          <h1>{doc.titulo}</h1>
          <p>Versión {doc.version} · Última actualización: {doc.fecha}</p>
        </div>
      </section>
      <div className="wrap lg-grid">
        <nav className="lg-indice" aria-label="Contenido">
          <b>Contenido</b>
          <ol>
            {doc.secciones.map((s) => (
              <li key={s.id}><a href={`#${s.id}`}>{s.titulo}</a></li>
            ))}
          </ol>
          {relacionados.length ? (
            <>
              <b>Otros documentos</b>
              <ul>
                {relacionados.map((r) => (
                  <li key={r.ruta}><Link href={r.ruta}>{r.titulo}</Link></li>
                ))}
              </ul>
            </>
          ) : null}
        </nav>
        <article className="lg-texto">
          {hayPendientes() ? (
            <p className="lg-borrador" role="note">
              Documento en revisión: algunos datos están marcados como pendientes y el texto será revisado por un abogado.
            </p>
          ) : null}
          <p className="lg-intro">{doc.intro}</p>
          {doc.secciones.map((s, i) => (
            <section key={s.id} id={s.id}>
              <h2>{i + 1}. {s.titulo}</h2>
              {(s.parrafos ?? []).map((p) => <p key={p}>{p}</p>)}
              {s.lista ? <ul>{s.lista.map((x) => <li key={x}>{x}</li>)}</ul> : null}
              {(s.despues ?? []).map((p) => <p key={p}>{p}</p>)}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
