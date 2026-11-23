"use client";

// Lista de conversaciones de la bandeja de WhatsApp (R1).
import { Loader2, Search, X } from "lucide-react";
import { tiempoRelativo } from "@/lib/whatsapp/tiempo.mjs";
import { iniciales, nombreContacto } from "@/lib/whatsapp/telefono.mjs";
import { etiquetaControl, vistaPrevia } from "@/lib/whatsapp/reglas.mjs";

const TONO_CHIP = {
  azul: "bg-blue-50 text-blue-700",
  violeta: "bg-violet-50 text-violet-700",
  gris: "bg-gray-100 text-gray-700",
};

export function ChipControl({ conversacion, usuario }) {
  const { texto, tono } = etiquetaControl(conversacion, usuario);
  return <span className={`inline-flex max-w-full shrink-0 items-center truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONO_CHIP[tono]}`}>{texto}</span>;
}

export function Avatar({ contacto, className = "" }) {
  return (
    <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 ${className}`}>
      {iniciales(contacto)}
    </span>
  );
}

export default function ListaConversaciones({
  conversaciones, hayMas, errorMas, cargando, error, busqueda, setBusqueda, q, seleccionada, onAbrir, onMas, cargandoMas, onVacantes, usuario, ahora,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-gray-200 p-3">
        <label className="relative block">
          <span className="sr-only">Buscar conversación</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre, teléfono o vacante"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-10 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:h-10 md:text-sm"
          />
          {busqueda ? (
            <button type="button" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda" className="absolute right-0 top-0 grid h-full w-10 place-items-center text-gray-400 hover:text-gray-700">
              <X className="size-4" />
            </button>
          ) : null}
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={cargando}>
        {error ? (
          <p role="alert" className="m-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : cargando && !conversaciones.length ? (
          <p className="flex items-center gap-2 p-4 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Cargando conversaciones…</p>
        ) : !conversaciones.length ? (
          <div className="p-6 text-center text-sm text-gray-500">
            {q ? (
              <p>No hay conversaciones que coincidan con «{q}».</p>
            ) : (
              <>
                <p className="font-medium text-gray-700">Aún no hay conversaciones.</p>
                <p className="mt-1">Comparte el enlace de una vacante para recibir mensajes.</p>
                {onVacantes ? (
                  <button type="button" onClick={onVacantes} className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 md:min-h-9">
                    Ver enlaces de vacantes
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : (
          <ul aria-label="Conversaciones">
            {conversaciones.map((c) => {
              const activa = String(c.id) === String(seleccionada);
              const noLeidos = Number(c.no_leidos) || 0;
              const nombre = nombreContacto(c.contacto);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onAbrir(c.id)}
                    aria-current={activa ? "true" : undefined}
                    aria-label={`${nombre}${noLeidos ? `, ${noLeidos} sin leer` : ""}`}
                    className={`flex w-full min-w-0 items-start gap-3 border-b border-gray-100 px-3 py-3 text-left transition-colors ${
                      activa ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <Avatar contacto={c.contacto} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`min-w-0 flex-1 truncate text-[14px] ${noLeidos ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>{nombre}</span>
                        <span className={`shrink-0 text-[11.5px] ${noLeidos ? "font-semibold text-emerald-700" : "text-gray-500"}`}>
                          {tiempoRelativo(c.ultimo_mensaje?.creado_en ?? c.ultimo_entrante_en, ahora)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-gray-500">{c.vacante?.titulo || "Sin vacante"}</span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-[13px] ${noLeidos ? "text-gray-900" : "text-gray-600"}`}>{vistaPrevia(c.ultimo_mensaje)}</span>
                        {noLeidos ? (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white" aria-hidden="true">
                            {noLeidos > 99 ? "99+" : noLeidos}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1.5 flex"><ChipControl conversacion={c} usuario={usuario} /></span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {conversaciones.length > 0 && hayMas ? (
          <div className="grid gap-2 p-3">
            {errorMas ? <p role="alert" className="text-[13px] text-red-700">{errorMas}</p> : null}
            <button type="button" onClick={onMas} disabled={cargandoMas} className="h-11 w-full rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              {cargandoMas ? "Cargando…" : "Ver más conversaciones"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
