"use client";

// Lista de conversaciones de la bandeja de WhatsApp (R1). R2: filtros por calificación/atención y chip de calificación.
// Estilo WhatsApp Web (25/11/2026): buscador gris redondeado, filtros en pastillas, etapa como filtro compacto y filas con
// avatar de color, nombre y hora, vacante, etiqueta de control (IA / persona), último mensaje (o el motivo de atención)
// y no leídos. Mismos datos, parámetros y paginación que antes.
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { tiempoRelativo } from "@/lib/whatsapp/tiempo.mjs";
import { iniciales, nombreContacto } from "@/lib/whatsapp/telefono.mjs";
import { etiquetaControl, vistaPrevia } from "@/lib/whatsapp/reglas.mjs";
import { FILTROS, etiquetaCalificacion } from "@/lib/whatsapp/entrevista.mjs";
import { ChipCalificacion } from "./controles";
import { FILTROS_ETAPA, textoEtapa } from "@/lib/reclutamiento/procesoWhatsapp.mjs";
import { ChipEtapa } from "./ProcesoChat";

const TONO_CHIP = {
  azul: "bg-blue-50 text-blue-800",
  violeta: "bg-violet-100 text-violet-800",
  gris: "bg-gray-100 text-gray-700",
};

export function ChipControl({ conversacion, usuario, className = "" }) {
  const { texto, tono } = etiquetaControl(conversacion, usuario);
  return <span className={`inline-flex max-w-full shrink-0 items-center truncate rounded-md px-1.5 py-px text-[11.5px] font-bold ${TONO_CHIP[tono]} ${className}`}>{texto}</span>;
}

// Avatar con iniciales; el color sale del teléfono (o id) para que cada candidato conserve el suyo, como en WhatsApp.
const COLORES_AVATAR = [
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-900",
  "bg-blue-100 text-blue-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
];
export function colorAvatar(contacto) {
  const clave = String(contacto?.telefono ?? contacto?.id ?? contacto?.nombre ?? "");
  let h = 0;
  for (let i = 0; i < clave.length; i++) h = (h * 31 + clave.charCodeAt(i)) >>> 0;
  return COLORES_AVATAR[h % COLORES_AVATAR.length];
}

export function Avatar({ contacto, className = "size-10 text-sm" }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full font-bold ${colorAvatar(contacto)} ${className}`}>
      {iniciales(contacto)}
    </span>
  );
}

// Texto corto de cada pastilla (el filtro y sus parámetros siguen en entrevista.mjs).
const TEXTO_CORTO = { atencion: "Atención" };

// Pastillas de filtro: en teléfono una fila que se desliza de lado (la página no se desborda); en escritorio se acomodan
// en dos renglones para que todas se vean. La etapa del proceso es una pastilla con lista desplegable al final.
function Filtros({ filtro, onFiltro, etapa, onEtapa }) {
  const conEtapa = Boolean(etapa);
  return (
    <div role="group" aria-label="Filtrar conversaciones" className="flex gap-1.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible">
      {FILTROS.map((f) => {
        const activo = f.valor === filtro;
        return (
          <button key={f.valor} type="button" aria-pressed={activo} onClick={(e) => { e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" }); onFiltro(f.valor); }}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] transition-colors lg:min-h-8 ${
              activo ? "bg-[#D9FDD3] font-bold text-[#0B5C2E]" : "bg-[#F0F2F5] font-semibold text-[#3B4A54] hover:bg-[#E4E7EA]"
            }`}>
            {f.valor === "atencion" ? <span aria-hidden="true" className="size-2 rounded-full bg-red-600" /> : null}
            {TEXTO_CORTO[f.valor] ?? f.texto}
          </button>
        );
      })}
      {onEtapa ? (
        <label className={`relative inline-flex min-h-11 shrink-0 items-center rounded-full text-[13px] lg:min-h-8 ${conEtapa ? "bg-[#D9FDD3] font-bold text-[#0B5C2E]" : "bg-[#F0F2F5] font-semibold text-[#3B4A54]"}`}>
          <span className="sr-only">Etapa</span>
          <select value={etapa} onChange={(e) => onEtapa(e.target.value)} data-filtro-etapa=""
            className="h-full min-h-11 cursor-pointer appearance-none rounded-full bg-transparent py-0 pl-3 pr-8 text-base outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:min-h-8 lg:text-[13px]">
            {FILTROS_ETAPA.map((f) => <option key={f.valor || "todas"} value={f.valor}>{f.valor ? `Etapa: ${f.texto}` : "Etapa: todas"}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 size-4" aria-hidden="true" />
        </label>
      ) : null}
    </div>
  );
}

export default function ListaConversaciones({
  conversaciones, hayMas, errorMas, cargando, error, busqueda, setBusqueda, q, seleccionada, onAbrir, onMas, cargandoMas, onVacantes, usuario, ahora,
  filtro = "todos", onFiltro, etapa = "", onEtapa,
}) {
  const textoFiltro = [FILTROS.find((f) => f.valor === filtro && f.valor !== "todos")?.texto, FILTROS_ETAPA.find((f) => f.valor && f.valor === etapa)?.texto]
    .filter(Boolean).join(" · ") || FILTROS[0].texto;
  const conFiltro = filtro !== "todos" || Boolean(etapa);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pb-2">
        <label className="relative block">
          <span className="sr-only">Buscar conversación</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#54656F]" aria-hidden="true" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar nombre, teléfono o vacante"
            className="h-11 w-full rounded-lg bg-[#F0F2F5] pl-10 pr-10 text-base text-[#111B21] outline-none placeholder:text-[#54656F] focus:bg-white focus:ring-2 focus:ring-emerald-600 lg:h-10 lg:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {busqueda ? (
            <button type="button" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda" className="absolute right-0 top-0 grid h-full w-11 place-items-center rounded-r-lg text-[#54656F] hover:text-[#111B21]">
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </label>
      </div>
      {onFiltro ? <Filtros filtro={filtro} onFiltro={onFiltro} etapa={etapa} onEtapa={onEtapa} /> : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-busy={cargando}>
        {error ? (
          <p role="alert" className="m-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : cargando && !conversaciones.length ? (
          <p className="flex items-center gap-2 p-4 text-sm text-[#54656F]"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando conversaciones…</p>
        ) : !conversaciones.length ? (
          <div className="p-6 text-center text-sm text-[#54656F]">
            {q ? (
              <p>No hay conversaciones que coincidan con «{q}»{conFiltro ? ` en «${textoFiltro}»` : ""}.</p>
            ) : conFiltro ? (
              <>
                <p>No hay conversaciones en «{textoFiltro}».</p>
                <button type="button" onClick={() => { onFiltro?.("todos"); onEtapa?.(""); }} className="mt-2 inline-flex min-h-11 items-center rounded-full border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 lg:min-h-9">
                  Ver todas
                </button>
              </>
            ) : (
              <>
                <p className="font-semibold text-[#111B21]">Aún no hay conversaciones.</p>
                <p className="mt-1">Comparte el enlace de una vacante para recibir mensajes.</p>
                {onVacantes ? (
                  <button type="button" onClick={onVacantes} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 lg:min-h-9">
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
              const calif = etiquetaCalificacion(c.entrevista?.calificacion);
              const atencion = c.entrevista?.requiere_atencion === true;
              const motivo = c.entrevista?.motivo_atencion || "Requiere atención";
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onAbrir(c.id)}
                    aria-current={activa ? "true" : undefined}
                    aria-label={`${nombre}${noLeidos ? `, ${noLeidos} sin leer` : ""}${c.proceso?.etapa ? `, etapa ${textoEtapa(c.proceso.etapa)}` : ""}${calif ? `, ${calif.texto}` : ""}${atencion ? `, requiere atención: ${motivo}` : ""}`}
                    className={`flex w-full min-w-0 items-start gap-3 px-3.5 pt-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 ${
                      activa ? "bg-[#F0F2F5]" : "hover:bg-[#F5F6F6]"
                    }`}
                  >
                    <span className="relative shrink-0">
                      <Avatar contacto={c.contacto} className="size-12 text-[15px]" />
                      {atencion ? (
                        <span title={motivo} data-atencion={c.id} className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full bg-red-600 ring-2 ring-white" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 border-b border-[#E9EDEF] pb-2.5">
                      <span className="flex items-baseline gap-2">
                        <span className={`min-w-0 flex-1 truncate text-[16px] text-[#111B21] ${noLeidos ? "font-bold" : "font-semibold"}`}>{nombre}</span>
                        <span className={`shrink-0 text-[12.5px] ${noLeidos ? "font-semibold text-[#15803D]" : "text-[#54656F]"}`}>
                          {tiempoRelativo(c.ultimo_mensaje?.creado_en ?? c.ultimo_entrante_en, ahora)}
                        </span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 truncate text-[13px] text-[#54656F]">{c.vacante?.titulo || "Sin vacante"}</span>
                        <ChipEtapa etapa={c.proceso?.etapa} className="!py-0" />
                      </span>
                      <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
                        <ChipControl conversacion={c} usuario={usuario} className="max-w-[45%]" />
                        <ChipCalificacion calificacion={c.entrevista?.calificacion} className="!rounded-md !px-1.5 !py-px !text-[11.5px]" />
                        {atencion ? (
                          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-red-700" title={motivo}>{motivo}</span>
                        ) : (
                          <span className={`min-w-0 flex-1 truncate text-[14px] ${noLeidos ? "text-[#111B21]" : "text-[#54656F]"}`}>{vistaPrevia(c.ultimo_mensaje)}</span>
                        )}
                        {noLeidos ? (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-emerald-700 px-1.5 text-[12px] font-bold text-white" aria-hidden="true">
                            {noLeidos > 99 ? "99+" : noLeidos}
                          </span>
                        ) : null}
                      </span>
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
            <button type="button" onClick={onMas} disabled={cargandoMas} className="h-11 w-full rounded-full border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60">
              {cargandoMas ? "Cargando…" : "Ver más conversaciones"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
