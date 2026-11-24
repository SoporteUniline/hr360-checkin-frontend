// Muestra la respuesta de la IA con formato simple (negritas, viñetas, párrafos) sin insertar HTML: todo es texto,
// así nada de lo que escriba la IA puede ejecutarse en la página.
function enLinea(texto) {
  return String(texto).split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith("**") && parte.endsWith("**") ? <strong key={i}>{parte.slice(2, -2)}</strong> : parte,
  );
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
