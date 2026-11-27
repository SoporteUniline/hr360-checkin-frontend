// Muestra la respuesta de la IA con formato simple (negritas, viñetas, párrafos) sin insertar HTML: todo es texto,
// así nada de lo que escriba la IA puede ejecutarse en la página.
// (27/11/2026) Enlaces «[texto](https://…)» (las guías que cita «Cómo usar ADAMIA»): solo https, en otra pestaña.
function negritas(texto, base) {
  return String(texto).split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith("**") && parte.endsWith("**") ? <strong key={`${base}-${i}`}>{parte.slice(2, -2)}</strong> : parte,
  );
}
function enLinea(texto) {
  return String(texto).split(/(\[[^\]]+\]\(https:\/\/[^)\s]+\))/g).flatMap((parte, i) => {
    const m = /^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/.exec(parte);
    if (!m) return negritas(parte, i);
    return [<a key={`e-${i}`} href={m[2]} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline underline-offset-2">{m[1]}</a>];
  });
}

export default function TextoIA({ texto }) {
  const bloques = [];
  let lista = null;
  for (const linea of String(texto ?? "").split("\n")) {
    const vineta = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(linea);
    if (vineta) {
      if (!lista) { lista = []; bloques.push({ tipo: "lista", items: lista }); }
      lista.push(vineta[1]);
      continue;
    }
    lista = null;
    if (linea.trim()) bloques.push({ tipo: /^#{1,4}\s/.test(linea) ? "titulo" : "p", texto: linea.replace(/^#{1,4}\s/, "") });
  }
  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed">
      {bloques.map((b, i) =>
        b.tipo === "lista" ? (
          <ul key={i} className="ml-4 list-disc space-y-1">{b.items.map((t, j) => <li key={j}>{enLinea(t)}</li>)}</ul>
        ) : b.tipo === "titulo" ? (
          <p key={i} className="font-semibold text-[#080d36]">{enLinea(b.texto)}</p>
        ) : (
          <p key={i}>{enLinea(b.texto)}</p>
        ),
      )}
    </div>
  );
}
