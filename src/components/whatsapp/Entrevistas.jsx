"use client";

// «Entrevistas» (R3): citas de la semana. Escritorio: calendario de 7 columnas por hora (o lista). Teléfono: lista
// agrupada por día. Filtros por vacante y estado. Cada cita: confirmar, reagendar, cancelar, asistió / no asistió y abrir
// el chat. GET /citas?empresa&desde&hasta&id_vacante&estado; se refresca cada 30 s con la pestaña visible.
import { useMemo, useState } from "react";
import useSWR from "swr";
import { CalendarDays, ChevronLeft, ChevronRight, List, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import {
  ESTADOS_FILTRO, agruparPorDia, carriles, diasDeSemana, etiquetaDiaLargo, etiquetaEstadoCita, etiquetaSemana, fechaHoraCorta, horaTexto, hoyMx, inicioSemana,
  minutosDelDia, rangoHorasCalendario, sumarDias,
} from "@/lib/whatsapp/agenda.mjs";
import { obtener, rutaCitas, rutaVacantes } from "./api";
import { CLASE_ENTRADA } from "./controles";
import { TarjetaCita } from "./citas";

const ALTO_HORA = 96; // px por hora: una cita de 30 min mide 48 px y se leen hora y nombre
const COLOR_BLOQUE = {
  azul: "border-blue-300 bg-blue-50 text-blue-950 hover:bg-blue-100",
  verde: "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100",
  rojo: "border-red-300 bg-red-50 text-red-950 hover:bg-red-100",
  gris: "border-gray-300 bg-gray-50 text-gray-500 line-through hover:bg-gray-100",
};
const horaEtiqueta = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "a.m." : "p.m."}`;

function Calendario({ dias, citas, hoy, onAbrir }) {
  const { desde, hasta } = rangoHorasCalendario(citas);
  const horas = Array.from({ length: hasta - desde }, (_, i) => desde + i);
  const porDia = agruparPorDia(citas, dias.map((d) => d.clave));
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white" data-calendario-semana>
      <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-gray-200 bg-gray-50">
        <span aria-hidden="true" />
        {dias.map((d) => (
          <p key={d.clave} className={`border-l border-gray-200 px-2 py-2 text-center text-[12.5px] font-semibold capitalize ${d.clave === hoy ? "text-emerald-700" : "text-gray-700"}`}>
            {d.corto} <span className={`ml-0.5 inline-grid size-6 place-items-center rounded-full ${d.clave === hoy ? "bg-emerald-600 text-white" : ""}`}>{d.numero}</span>
          </p>
        ))}
      </div>
      <div className="grid max-h-[calc(100dvh-20rem)] min-h-[360px] grid-cols-[4rem_repeat(7,minmax(0,1fr))] overflow-y-auto">
        <div className="relative" style={{ height: horas.length * ALTO_HORA }} aria-hidden="true">
          {horas.map((h, i) => (
            <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-gray-500" style={{ top: i * ALTO_HORA }}>{i ? horaEtiqueta(h) : ""}</span>
          ))}
        </div>
        {porDia.map((d) => {
          const c = carriles(d.citas);
          return (
            <div key={d.clave} role="list" aria-label={etiquetaDiaLargo(d.clave, hoy)} data-dia-calendario={d.clave}
              className={`relative border-l border-gray-200 ${d.clave === hoy ? "bg-emerald-50/30" : ""}`} style={{ height: horas.length * ALTO_HORA }}>
              {horas.map((h, i) => <span key={h} aria-hidden="true" className="absolute inset-x-0 border-t border-gray-100" style={{ top: i * ALTO_HORA }} />)}
              {d.citas.map((cita) => {
                const ini = minutosDelDia(cita.inicio);
                const fin = Math.max(ini + 15, cita.fin ? minutosDelDia(cita.fin) : ini + 30);
                const { carril, total } = c[cita.id] ?? { carril: 0, total: 1 };
                const tono = etiquetaEstadoCita(cita.estado).tono;
                const nombre = cita.candidato?.nombre || "Candidato";
                return (
                  <div key={cita.id} role="listitem" className="absolute px-0.5"
                    style={{ top: ((ini - desde * 60) / 60) * ALTO_HORA, height: Math.max(((fin - ini) / 60) * ALTO_HORA, 44), left: `${(carril / total) * 100}%`, width: `${100 / total}%` }}>
                    <button type="button" onClick={() => onAbrir(cita.id)} data-bloque-cita={cita.id}
                      aria-label={`${nombre}, ${horaTexto(cita.inicio)}, ${cita.vacante?.titulo || "sin vacante"}, ${etiquetaEstadoCita(cita.estado).texto}`}
                      className={`flex size-full flex-col overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11.5px] leading-tight shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${COLOR_BLOQUE[tono]}`}>
                      <span className="truncate font-semibold tabular-nums">{horaTexto(cita.inicio)}</span>
                      <span className="truncate font-medium">{nombre}</span>
                      {fin - ini >= 40 ? <span className="truncate opacity-80">{cita.vacante?.titulo}</span> : null}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Lista({ grupos, hoy, onCambio }) {
  if (!grupos.length) return null;
  return (
    <div className="grid gap-4" data-lista-citas>
      {grupos.map((g) => (
        <section key={g.clave} aria-labelledby={`dia-${g.clave}`} className="grid gap-2">
          <h3 id={`dia-${g.clave}`} className={`text-[13px] font-bold first-letter:uppercase ${g.clave === hoy ? "text-emerald-700" : "text-gray-700"}`}>
            {etiquetaDiaLargo(g.clave, hoy)} <span className="font-medium text-gray-500">· {g.citas.length} {g.citas.length === 1 ? "entrevista" : "entrevistas"}</span>
          </h3>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {g.citas.map((c) => <TarjetaCita key={c.id} cita={c} hoy={hoy} onCambio={onCambio} conChat />)}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function Entrevistas({ idEmpresa, ahora }) {
  const hoy = hoyMx(ahora);
  const [lunes, setLunes] = useState(() => inicioSemana(hoyMx()));
  const [idVacante, setIdVacante] = useState("");
  const [estado, setEstado] = useState("");
  const [vista, setVista] = useState("calendario");
  const [abiertaId, setAbiertaId] = useState(null);
  const dias = useMemo(() => diasDeSemana(lunes), [lunes]);
  const clave = rutaCitas(idEmpresa, { desde: lunes, hasta: sumarDias(lunes, 6), id_vacante: idVacante, estado });
  const { data, error, isLoading, mutate } = useSWR(clave, obtener, { refreshInterval: 30000, refreshWhenHidden: false, keepPreviousData: true });
  const { data: vacantes } = useSWR(rutaVacantes(idEmpresa), obtener, { revalidateOnFocus: false });
  const citas = useMemo(() => data?.citas ?? [], [data]);
  const grupos = useMemo(() => agruparPorDia(citas), [citas]);
  const abierta = citas.find((c) => String(c.id) === String(abiertaId)) ?? null;
  const activas = citas.filter((c) => c.estado !== "cancelada").length;
  // Tras una acción se vuelve a pedir la semana: el API puede mover la cita de día o cambiar su estado.
  const alCambiar = async () => { await mutate(); };

  const filtros = (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none">
        <span aria-hidden="true" className="shrink-0 text-gray-500">Vacante</span>
        <select aria-label="Vacante" value={idVacante} onChange={(e) => setIdVacante(e.target.value)} className={`${CLASE_ENTRADA.replace("w-full ", "")} h-11 w-full min-w-0 sm:w-56 md:h-9`}>
          <option value="">Todas</option>
          {(vacantes?.vacantes ?? []).map((v) => <option key={v.id_vacante} value={v.id_vacante}>{v.titulo}</option>)}
        </select>
      </label>
      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none">
        <span aria-hidden="true" className="shrink-0 text-gray-500">Estado</span>
        <select aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} className={`${CLASE_ENTRADA.replace("w-full ", "")} h-11 w-full min-w-0 sm:w-44 md:h-9`}>
          <option value="">Todos</option>
          {ESTADOS_FILTRO.map((e) => <option key={e.valor} value={e.valor}>{e.texto}</option>)}
        </select>
      </label>
    </div>
  );

  return (
    <section aria-label="Entrevistas" className="grid min-w-0 gap-3" data-vista-entrevistas>
      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior" className="size-11 md:size-9"><ChevronLeft className="size-4" /></Button>
            <Button type="button" variant="outline" onClick={() => setLunes(inicioSemana(hoy))} disabled={lunes === inicioSemana(hoy)} className="min-h-11 md:min-h-9">Hoy</Button>
            <Button type="button" variant="outline" size="icon" onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente" className="size-11 md:size-9"><ChevronRight className="size-4" /></Button>
          </div>
          <h2 className="min-w-0 flex-1 text-[15px] font-bold text-gray-900" aria-live="polite" data-semana>{etiquetaSemana(lunes)}</h2>
          <div role="group" aria-label="Vista" className="hidden rounded-lg bg-gray-100 p-0.5 lg:flex">
            {[{ v: "calendario", t: "Calendario", i: CalendarDays }, { v: "lista", t: "Lista", i: List }].map(({ v, t, i: Icono }) => (
              <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold ${vista === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}>
                <Icono className="size-4" aria-hidden="true" /> {t}
              </button>
            ))}
          </div>
        </div>
        {filtros}
        <p className="text-[12.5px] text-gray-600" data-resumen-semana>
          {isLoading && !data ? "Cargando entrevistas…" : `${activas} ${activas === 1 ? "entrevista" : "entrevistas"} esta semana${citas.length > activas ? ` · ${citas.length - activas} ${citas.length - activas === 1 ? "cancelada" : "canceladas"}` : ""}`}
        </p>
      </div>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="flex-1">{mensajeErrorApi(error, "No se pudieron cargar las entrevistas.")}</span>
          <Button type="button" variant="outline" onClick={() => mutate()} className="min-h-11 md:min-h-9" startIcon={<RefreshCw className="size-4" />}>Reintentar</Button>
        </div>
      ) : isLoading && !data ? (
        <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Cargando entrevistas…</p>
      ) : (
        <>
          <div className={vista === "calendario" ? "hidden lg:block" : "hidden"}>
            <Calendario dias={dias} citas={citas} hoy={hoy} onAbrir={setAbiertaId} />
            {!citas.length ? <p className="mt-2 text-center text-sm text-gray-600">No hay entrevistas esta semana{idVacante || estado ? " con estos filtros" : ""}.</p> : null}
          </div>
          <div className={vista === "calendario" ? "lg:hidden" : ""}>
            {citas.length ? <Lista grupos={grupos} hoy={hoy} onCambio={alCambiar} /> : (
              <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center" data-sin-citas>
                <CalendarDays className="size-8 text-emerald-600" aria-hidden="true" />
                <p className="font-semibold text-gray-800">No hay entrevistas esta semana{idVacante || estado ? " con estos filtros" : ""}</p>
                <p className="max-w-sm text-sm text-gray-600">Cuando el agente o tú agenden una cita, aparece aquí. Configura la agenda en «Enlaces de vacantes → Agenda».</p>
              </div>
            )}
          </div>
        </>
      )}
      <Dialog open={!!abierta} onOpenChange={(v) => { if (!v) setAbiertaId(null); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Entrevista</DialogTitle>
            <DialogDescription>{abierta ? fechaHoraCorta(abierta.inicio) : ""}</DialogDescription>
          </DialogHeader>
          {abierta ? <TarjetaCita cita={abierta} hoy={hoy} onCambio={alCambiar} conChat className="border-0 p-0" /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
