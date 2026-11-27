import Link from "next/link";
import { Pastilla, tono } from "./tonos";

/**
 * Encabezado de una vista de detalle (docs/vistas-de-detalle.md). Limpio y corporativo: tarjeta BLANCA con un filo
 * azul ADAMIA arriba (4 px #2C56E8), texto oscuro, etiqueta azul en mayúsculas y pastilla de estado. Nunca con fondo
 * degradado (decisión del dueño, 27/11/2026: «jamás fondos degradados»).
 * - volver: { href, texto } — regreso a la lista («‹ Contratos»).
 * - iniciales, etiqueta (MAYÚSCULAS cortas), titulo (nombre), subtitulo (nodo: puesto · área · «Ver ficha»).
 * - estado: { texto, tono } — pastilla. filas: [{ etiqueta, valor, tono? }] (en escritorio). alerta: { texto, tono }.
 */
export default function EncabezadoDetalle({ volver, iniciales, etiqueta, titulo, subtitulo, estado, filas = [], alerta = null }) {
  return (
    <div className="flex flex-col gap-3">
      {volver ? (
        <nav aria-label="Ruta">
          <Link href={volver.href} className="inline-flex min-h-12 items-center text-[17px] font-semibold text-[#1E40C4] no-underline hover:text-[#1E3A8A] lg:text-[16px]">
            ‹ {volver.texto}
          </Link>
        </nav>
      ) : null}
      <section
        aria-label={`Resumen: ${titulo}`}
        data-encabezado-detalle
        className="grid grid-cols-1 items-center gap-5 rounded-3xl border border-[#E5E7EB] border-t-4 border-t-[#2C56E8] bg-white p-5 text-[#0B1033] sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-7 lg:px-8 lg:py-7"
      >
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="hidden h-[72px] w-[72px] flex-none items-center justify-center rounded-[22px] bg-[#EEF2FF] text-2xl font-bold text-[#2C56E8] sm:flex">
            {iniciales}
          </span>
          <div className="min-w-0">
            {etiqueta ? <p data-chico className="m-0 text-[15px] font-semibold uppercase tracking-wide text-[#1E40C4]">{etiqueta}</p> : null}
            <h1 className="mb-1 mt-0.5 break-words text-[24px] font-bold leading-tight text-[#0B1033] lg:text-[32px]">{titulo}</h1>
            {subtitulo ? <div className="m-0 text-[17px] text-[#374151] lg:text-[16px] [&_a]:font-semibold [&_a]:text-[#1E40C4] [&_a]:underline">{subtitulo}</div> : null}
            {estado ? <Pastilla texto={estado.texto} tono={estado.tono} className="mt-3 lg:hidden" /> : null}
          </div>
        </div>
        <dl className="m-0 hidden flex-col gap-2.5 rounded-[20px] border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4 text-[#111827] lg:flex">
          {estado ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[16px] text-[#374151]">Estado</dt>
              <dd className="m-0"><Pastilla texto={estado.texto} tono={estado.tono} /></dd>
            </div>
          ) : null}
          {filas.map((f) => (
            <div key={f.etiqueta} className="flex items-baseline justify-between gap-3">
              <dt className="flex-none text-[16px] text-[#374151]">{f.etiqueta}</dt>
              <dd className="m-0 text-right text-[16px] font-bold" style={f.tono ? { color: tono(f.tono).texto } : undefined}>{f.valor}</dd>
            </div>
          ))}
          {alerta ? (
            <dd className="m-0 rounded-xl px-3 py-2 text-[16px] font-semibold" style={{ background: tono(alerta.tono).suave, color: tono(alerta.tono).texto }} role="status">
              {alerta.texto}
            </dd>
          ) : null}
        </dl>
      </section>
    </div>
  );
}
