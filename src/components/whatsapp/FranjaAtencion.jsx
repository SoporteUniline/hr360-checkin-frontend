"use client";

// Franja «requiere atención» (wa2, 25/11/2026): arriba de la lista de chats, compacta y visible, cuando uno o más
// candidatos piden hablar con una persona o su entrevista pide atención. Los datos vienen en la misma respuesta de la lista
// (GET /conversaciones → `atencion`), así que se actualiza con el refresco normal de la bandeja (sin sondeo extra) y
// desaparece al marcar como atendido o tomar el control. «Ver»: con uno abre su chat; con varios filtra «Atención».
// Accesible: role=status (aviso cortés: se anuncia cuando cambia), contraste ≥ 4.5:1 y botón de 44 px.
import { AlertTriangle } from "lucide-react";
import { accionFranja, franjaAtencion, textoAccionFranja } from "@/lib/whatsapp/atencion.mjs";

export default function FranjaAtencion({ atencion, filtro, onAbrir, onFiltrar }) {
  const f = franjaAtencion(atencion);
  if (!f) return null;
  const accion = accionFranja(f, filtro);
  const texto = textoAccionFranja(f, filtro);
  const ver = () => (accion?.tipo === "abrir" ? onAbrir?.(accion.id) : onFiltrar?.());
  return (
    <div role="status" data-franja-atencion={f.total}
      className="mx-3 mb-2 flex shrink-0 items-center gap-2 rounded-lg border border-red-200 bg-red-50 py-0.5 pl-3 pr-1 text-red-800">
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 py-1 text-[13px] leading-snug">
        <span className="font-bold">{f.titulo}</span>
        {f.detalle || f.otros ? (
          <span className="flex min-w-0">
            <span data-franja-detalle="" className="min-w-0 truncate" title={f.detalle}>{f.detalle}</span>
            {/* «y N más» nunca se corta: el nombre largo es lo que se recorta. */}
            {f.otros > 0 ? <span className="shrink-0 whitespace-pre">{f.detalle ? " · " : ""}y {f.otros} más</span> : null}
          </span>
        ) : null}
      </p>
      <button type="button" onClick={ver} data-franja-ver={accion?.tipo ?? ""}
        aria-label={accion?.tipo === "abrir" ? `Abrir el chat: ${f.detalle}` : `Ver los ${f.total} chats que necesitan atención`}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md px-3 text-[13px] font-bold text-red-800 underline underline-offset-2 outline-none hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-700">
        {texto}
      </button>
    </div>
  );
}
