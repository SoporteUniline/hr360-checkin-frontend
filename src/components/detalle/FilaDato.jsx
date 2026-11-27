import { tono } from "./tonos";

/** Lista de datos (dl) para FilaDato. */
export function ListaDatos({ children, className = "" }) {
  return <dl className={`m-0 flex flex-col gap-2 ${className}`}>{children}</dl>;
}

/** Un dato: etiqueta gris oscuro a la izquierda y valor en negritas a la derecha. Se acomoda en dos líneas si no cabe. */
export default function FilaDato({ etiqueta, valor, tono: t = null, children }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <dt className="text-[#374151]">{etiqueta}</dt>
      <dd className="m-0 min-w-0 break-words text-right font-semibold" style={t ? { color: tono(t).texto } : undefined}>{valor ?? children ?? "—"}</dd>
    </div>
  );
}
