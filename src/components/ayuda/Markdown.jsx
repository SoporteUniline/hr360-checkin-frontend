// Centro de ayuda · pinta los bloques del subconjunto de Markdown (src/lib/ayuda/markdown.mjs) como elementos de React.
// Sin dangerouslySetInnerHTML: todo el texto va como texto. Sirve en las páginas públicas (servidor) y en el panel
// lateral de «Ayuda» dentro del sistema (cliente).
// - prefijo: antepone algo a los id de los encabezados (dentro del sistema, para no chocar con los de la pantalla).
// - alAbrirGuia(slug, ancla): dentro del sistema, un enlace a otra guía la abre en el mismo panel.
/* eslint-disable @next/next/no-img-element -- capturas estáticas con ancho y alto reales (no pasan por el optimizador) */
import Link from "next/link";
import { AVISOS } from "@/lib/ayuda/markdown.mjs";
import { rutaDeInstancia } from "@/lib/demo-base-path.mjs";

const RE_GUIA = /^\/ayuda\/([a-z0-9-]+\/[a-z0-9-]+)(?:#([\w-]+))?$/;

function Enlace({ href, children, ctx }) {
  if (/^https:\/\//.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="ay-sr"> (se abre en otra pestaña)</span></a>;
  }
  if (href.startsWith("#")) return <a href={`#${ctx.prefijo}${href.slice(1)}`}>{children}</a>;
  const guia = RE_GUIA.exec(href);
  if (guia && ctx.alAbrirGuia) {
    return <a href={rutaDeInstancia(href)} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); ctx.alAbrirGuia(guia[1], guia[2] ?? null); }}>{children}</a>;
  }
  return <Link href={href}>{children}</Link>;
}

function EnLinea({ nodos, ctx }) {
  return (nodos ?? []).map((n, i) => {
    if (n.t === "texto") return n.v;
    if (n.t === "codigo") return <code key={i} className="ay-boton">{n.v}</code>;
    if (n.t === "negrita") return <strong key={i}><EnLinea nodos={n.hijos} ctx={ctx} /></strong>;
    if (n.t === "cursiva") return <em key={i}><EnLinea nodos={n.hijos} ctx={ctx} /></em>;
    if (n.t === "enlace") return <Enlace key={i} href={n.href} ctx={ctx}><EnLinea nodos={n.hijos} ctx={ctx} /></Enlace>;
    return null;
  });
}

function Lista({ lista, ctx }) {
  const Etiqueta = lista.ordenada ? "ol" : "ul";
  return (
    <Etiqueta start={lista.ordenada && lista.inicio !== 1 ? lista.inicio : undefined}>
      {lista.items.map((it, i) => (
        <li key={i}>
          <EnLinea nodos={it.hijos} ctx={ctx} />
          {it.sub ? <Lista lista={it.sub} ctx={ctx} /> : null}
        </li>
      ))}
    </Etiqueta>
  );
}

function Imagen({ b, ctx }) {
  const src = b.src.startsWith("/") ? rutaDeInstancia(b.src) : b.src;
  const img = <img src={src} alt={b.alt} width={b.ancho || undefined} height={b.alto || undefined} loading={ctx.primeraImagen === b ? "eager" : "lazy"} decoding="async" />;
  return (
    <figure className={`ay-figura${b.ancho && b.ancho < 600 ? " ay-figura-movil" : ""}`}>
      {img}
      {b.titulo ? <figcaption>{b.titulo}</figcaption> : null}
    </figure>
  );
}

function Bloque({ b, ctx }) {
  switch (b.t) {
    case "h2": return <h2 id={`${ctx.prefijo}${b.id}`}><EnLinea nodos={b.hijos} ctx={ctx} /></h2>;
    case "h3": return <h3 id={`${ctx.prefijo}${b.id}`}><EnLinea nodos={b.hijos} ctx={ctx} /></h3>;
    case "p": return <p><EnLinea nodos={b.hijos} ctx={ctx} /></p>;
    case "lista": return <Lista lista={b} ctx={ctx} />;
    case "imagen": return <Imagen b={b} ctx={ctx} />;
    case "aviso":
      return (
        <aside className={`ay-aviso ay-aviso-${b.tipo}`} aria-label={AVISOS[b.tipo]}>
          <b className="ay-aviso-tipo">{AVISOS[b.tipo]}</b>
          {b.bloques.map((x, i) => <Bloque key={i} b={x} ctx={ctx} />)}
        </aside>
      );
    case "tabla":
      return (
        <div className="ay-tabla" role="region" aria-label="Tabla" tabIndex={0}>
          <table>
            {b.encabezado ? <thead><tr>{b.encabezado.map((c, i) => <th key={i} scope="col"><EnLinea nodos={c} ctx={ctx} /></th>)}</tr></thead> : null}
            <tbody>{b.filas.map((f, i) => <tr key={i}>{f.map((c, j) => <td key={j}><EnLinea nodos={c} ctx={ctx} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    default: return null;
  }
}

export default function Markdown({ bloques = [], prefijo = "", alAbrirGuia = null, className = "" }) {
  const ctx = { prefijo, alAbrirGuia, primeraImagen: bloques.find((b) => b.t === "imagen") ?? null };
  return <div className={`ay-md ${className}`}>{bloques.map((b, i) => <Bloque key={i} b={b} ctx={ctx} />)}</div>;
}
