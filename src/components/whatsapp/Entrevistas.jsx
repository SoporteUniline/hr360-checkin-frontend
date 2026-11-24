"use client";

// «Entrevistas»: agenda de citas por semana o día (lista en teléfono) con los horarios libres de la vacante. Arrastrar
// una cita → POST /citas/:id/reagendar; con 409 regresa a su lugar. Se refresca cada 30 s con la pestaña visible.
import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { CalendarDays, ChevronLeft, ChevronRight, List, Loader2, RefreshCw, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import {
  ESTADOS_FILTRO, agruparHorarios, agruparPorDia, diasDeSemana, etiquetaDiaLargo, fechaHoraCorta, horaTexto, hoyMx, inicioSemana, sumarDias, textoLugares,
} from "@/lib/whatsapp/agenda.mjs";
import { aplicarMovimiento, diasDeVista, moverVista, rangoAgenda, textoConfirmarMover, tituloVista } from "@/lib/whatsapp/calendario.mjs";
import { obtener, reagendarCita, rutaCitas, rutaHorarios, rutaVacantes } from "./api";
import { CLASE_ENTRADA } from "./controles";
import { TarjetaCita } from "./citas";
import CalendarioAgenda, { Leyenda, MiniMes, useAncho } from "./CalendarioAgenda";
import DialogoAgendarAqui from "./DialogoAgendarAqui";

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

// Teléfono: tira de días de la semana (se desliza) y lista del día con citas y horarios libres.
function DiaMovil({ dias, dia, onDia, hoy, citas, horarios, onCambio, onHorario }) {
  const delDia = citas.filter((c) => String(c.inicio).startsWith(dia)).sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
  const libres = (agruparHorarios(horarios).find((g) => g.clave === dia)?.horarios ?? []).filter((h) => h.libres > 0);
  const cuenta = (clave) => citas.filter((c) => String(c.inicio).startsWith(clave) && c.estado !== "cancelada").length;
  return (
    <div className="grid min-w-0 gap-3">
      <div role="group" aria-label="Días de la semana" className="-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1" data-tira-dias>
        {dias.map((d) => {
          const n = cuenta(d.clave);
          return (
            <button key={d.clave} type="button" onClick={() => onDia(d.clave)} aria-pressed={d.clave === dia} data-chip-dia={d.clave}
              aria-label={`${etiquetaDiaLargo(d.clave, hoy)}${n ? `, ${n} ${n === 1 ? "entrevista" : "entrevistas"}` : ""}`}
              className={`flex min-h-14 min-w-12 shrink-0 snap-start flex-col items-center justify-center rounded-xl border px-2 text-[12px] ${
                d.clave === dia ? "border-blue-600 bg-blue-600 text-white" : d.clave === hoy ? "border-blue-300 bg-blue-50 text-blue-800" : "border-gray-200 bg-white text-gray-700"}`}>
              <span className="font-semibold uppercase">{d.corto}</span>
              <span className="text-[16px] font-bold tabular-nums">{d.numero}</span>
              {n ? <span aria-hidden="true" className={`size-1.5 rounded-full ${d.clave === dia ? "bg-white" : "bg-blue-500"}`} /> : null}
            </button>
          );
        })}
      </div>
      <h3 className="text-[14px] font-bold text-gray-900 first-letter:uppercase">{etiquetaDiaLargo(dia, hoy)}</h3>
      <div className="grid gap-2" data-lista-citas>
        {delDia.map((c) => <TarjetaCita key={c.id} cita={c} hoy={hoy} onCambio={onCambio} conChat />)}
        {libres.length ? (
          <div className="grid gap-1.5" data-libres-dia>
            <p className="text-[12.5px] font-semibold text-gray-600">Horarios disponibles</p>
            <div className="flex flex-wrap gap-1.5">
              {libres.map((h) => (
                <button key={h.inicio} type="button" onClick={() => onHorario(h)} data-horario-libre={h.inicio}
                  aria-label={`Agendar aquí: ${horaTexto(h.inicio)}, ${textoLugares(h.libres, h.capacidad)}`}
                  className="inline-flex min-h-11 flex-col justify-center rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-3 text-left text-[12.5px] leading-tight text-emerald-900">
                  <span className="font-semibold tabular-nums">{horaTexto(h.inicio)}</span>
                  <span className="text-[11.5px]">{textoLugares(h.libres, h.capacidad)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {!delDia.length && !libres.length ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-[13px] text-gray-600" data-sin-citas>
            No hay entrevistas este día. Elige otro día o una vacante para ver sus horarios libres.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function Entrevistas({ idEmpresa, ahora }) {
  const hoy = hoyMx(ahora);
  const { mutate: mutarGlobal } = useSWRConfig();
  const ancho = useAncho("(min-width: 1024px)");
  const [dia, setDia] = useState(() => hoyMx());
  const [modo, setModo] = useState("semana"); // semana | dia | lista (en teléfono: día)
  const [idVacante, setIdVacante] = useState("");
  const [estado, setEstado] = useState("");
  const [abiertaId, setAbiertaId] = useState(null);
  const [libre, setLibre] = useState(null); // horario libre para «Agendar aquí»
  const [mover, setMover] = useState(null); // { cita, horario } por confirmar
  const [movida, setMovida] = useState(null); // vista optimista mientras se guarda
  const [guardandoMover, setGuardandoMover] = useState(false);
  const [aviso, setAviso] = useState("");
  const [anuncio, setAnuncio] = useState("");
  const lunes = inicioSemana(dia);
  const semana = useMemo(() => diasDeSemana(lunes), [lunes]);
  const modoVista = ancho ? modo : "dia";
  const dias = useMemo(() => (modoVista === "dia" ? diasDeVista("dia", dia) : semana), [modoVista, dia, semana]);
  const clave = rutaCitas(idEmpresa, { desde: lunes, hasta: sumarDias(lunes, 6), id_vacante: idVacante, estado });
  const { data, error, isLoading, mutate } = useSWR(clave, obtener, { refreshInterval: 30000, refreshWhenHidden: false, keepPreviousData: true });
  const { data: vacantes } = useSWR(rutaVacantes(idEmpresa), obtener, { revalidateOnFocus: false });
  // Horarios libres de la vacante elegida para la semana visible.
  const { data: libres } = useSWR(idVacante ? rutaHorarios(idVacante, lunes, 7) : null, obtener, { revalidateOnFocus: false });
  const horarios = useMemo(() => agruparHorarios(libres?.horarios).flatMap((g) => g.horarios), [libres]);
  const citasApi = useMemo(() => data?.citas ?? [], [data]);
  const citas = useMemo(() => aplicarMovimiento(citasApi, movida), [citasApi, movida]);
  const grupos = useMemo(() => agruparPorDia(citas), [citas]);
  const conCitas = useMemo(() => new Set(citas.filter((c) => c.estado !== "cancelada").map((c) => String(c.inicio).slice(0, 10))), [citas]);
  const abierta = citas.find((c) => String(c.id) === String(abiertaId)) ?? null;
  const activas = citas.filter((c) => c.estado !== "cancelada").length;
  const vacante = (vacantes?.vacantes ?? []).find((v) => String(v.id_vacante) === String(idVacante)) ?? null;
  const recargarHorarios = () => mutarGlobal((k) => typeof k === "string" && k.includes("/agenda/horarios"));
  // Tras una acción se vuelve a pedir la semana: el API puede mover la cita de día o cambiar su estado.
  const alCambiar = async () => { await mutate(); recargarHorarios(); };
  const confirmarMover = async () => {
    const { cita, horario } = mover;
    setGuardandoMover(true);
    setAviso("");
    setMovida({ id: cita.id, inicio: horario.inicio });
    setMover(null);
    try {
      await reagendarCita(cita.id, horario.inicio);
      await mutate();
      setAnuncio(`Entrevista movida al ${fechaHoraCorta(horario.inicio)}.`);
    } catch (e) {
      setAviso(mensajeErrorApi(e, "No se pudo mover la entrevista."));
    } finally {
      setMovida(null); // con error, la cita vuelve a su lugar
      setGuardandoMover(false);
      recargarHorarios();
    }
  };
  const navegar = (dir) => setDia(moverVista(modoVista === "dia" && ancho ? "dia" : "semana", dia, dir));
  const enSemana = modoVista !== "dia" || !ancho;

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
      {!idVacante ? <p className="basis-full text-[12px] text-gray-500 lg:basis-auto">Elige una vacante para ver sus horarios libres y agendar con un clic.</p> : null}
    </div>
  );
  const rango = rangoAgenda(citas.filter((c) => dias.some((d) => String(c.inicio).startsWith(d.clave))), horarios.filter((h) => dias.some((d) => String(h.inicio).startsWith(d.clave))));

  return (
    <section aria-label="Entrevistas" className="grid min-w-0 gap-3" data-vista-entrevistas>
      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setDia(hoy)} disabled={dia === hoy} className="min-h-11 md:min-h-9">Hoy</Button>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" onClick={() => navegar(-1)} aria-label={enSemana ? "Semana anterior" : "Día anterior"} className="size-11 md:size-9"><ChevronLeft className="size-4" /></Button>
            <Button type="button" variant="outline" size="icon" onClick={() => navegar(1)} aria-label={enSemana ? "Semana siguiente" : "Día siguiente"} className="size-11 md:size-9"><ChevronRight className="size-4" /></Button>
          </div>
          <h2 className="min-w-0 flex-1 text-[16px] font-bold first-letter:uppercase text-gray-900" aria-live="polite" data-semana>{tituloVista(ancho ? modoVista : "semana", dia)}</h2>
          {ancho ? (
            <div role="group" aria-label="Vista" className="flex rounded-lg bg-gray-100 p-0.5">
              {[{ v: "semana", t: "Semana", i: CalendarDays }, { v: "dia", t: "Día", i: Rows3 }, { v: "lista", t: "Lista", i: List }].map(({ v, t, i: Icono }) => (
                <button key={v} type="button" aria-pressed={modo === v} onClick={() => setModo(v)}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold ${modo === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}>
                  <Icono className="size-4" aria-hidden="true" /> {t}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {filtros}
        <p className="text-[12.5px] text-gray-600" data-resumen-semana>
          {isLoading && !data ? "Cargando entrevistas…" : `${activas} ${activas === 1 ? "entrevista" : "entrevistas"} esta semana${citas.length > activas ? ` · ${citas.length - activas} ${citas.length - activas === 1 ? "cancelada" : "canceladas"}` : ""}`}
        </p>
      </div>
      <p aria-live="polite" className="sr-only">{anuncio}</p>
      {aviso ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" data-aviso-agenda>
          <span className="min-w-0 flex-1">{aviso}</span>
          <button type="button" onClick={() => setAviso("")} className="min-h-9 rounded-md px-2 font-semibold hover:bg-red-100">Cerrar</button>
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="flex-1">{mensajeErrorApi(error, "No se pudieron cargar las entrevistas.")}</span>
          <Button type="button" variant="outline" onClick={() => mutate()} className="min-h-11 md:min-h-9" startIcon={<RefreshCw className="size-4" />}>Reintentar</Button>
        </div>
      ) : isLoading && !data ? (
        <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Cargando entrevistas…</p>
      ) : !ancho ? (
        <DiaMovil dias={semana} dia={dia} onDia={setDia} hoy={hoy} citas={citas} horarios={horarios} onCambio={alCambiar} onHorario={setLibre} />
      ) : (
        <div className="grid min-w-0 gap-3 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside aria-label="Calendario del mes" className="grid content-start gap-4 rounded-2xl border border-gray-200 bg-white p-3">
            <MiniMes dia={dia} hoy={hoy} onElegir={setDia} conCitas={conCitas} />
            <Leyenda conLibres={!!idVacante} />
          </aside>
          <div className="min-w-0">
            {modo === "lista" ? (
              citas.length ? <Lista grupos={grupos} hoy={hoy} onCambio={alCambiar} /> : (
                <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center" data-sin-citas>
                  <CalendarDays className="size-8 text-emerald-600" aria-hidden="true" />
                  <p className="font-semibold text-gray-800">No hay entrevistas esta semana{idVacante || estado ? " con estos filtros" : ""}</p>
                  <p className="max-w-sm text-sm text-gray-600">Cuando el agente o tú agenden una cita, aparece aquí. Configura la agenda en «Enlaces de vacantes → Agenda».</p>
                </div>
              )
            ) : (
              <>
                <CalendarioAgenda dias={dias} hoy={hoy} ahora={ahora} citas={citas} horarios={horarios} desde={rango.desde} hasta={rango.hasta}
                  onCita={(c) => setAbiertaId(c.id)} onHorario={setLibre} onMover={guardandoMover ? null : (cita, horario) => setMover({ cita, horario })}
                  onDia={(d) => { setDia(d); setModo("dia"); }} etiquetaGrupo="Agenda" />
                {!citas.length && !horarios.length ? <p className="mt-2 text-center text-sm text-gray-600">No hay entrevistas esta semana{idVacante || estado ? " con estos filtros" : ""}.</p> : null}
                {idVacante ? <p className="mt-2 text-[12px] text-gray-500">Arrastra una entrevista a un horario disponible para moverla (o ábrela y usa «Reagendar»).</p> : null}
              </>
            )}
          </div>
        </div>
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
      <Dialog open={!!mover} onOpenChange={(v) => { if (!v) setMover(null); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mover entrevista</DialogTitle>
            <DialogDescription>{mover ? textoConfirmarMover(mover.cita, mover.horario.inicio) : ""}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setMover(null)} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Volver</Button>
            <Button type="button" onClick={confirmarMover} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Mover</Button>
          </div>
        </DialogContent>
      </Dialog>
      <DialogoAgendarAqui horario={libre} onCerrar={() => setLibre(null)} idEmpresa={idEmpresa} vacante={vacante} onListo={async (r) => {
        setLibre(null);
        setAnuncio(r?.cita ? `Entrevista agendada para el ${fechaHoraCorta(r.cita.inicio)}.` : "Entrevista agendada.");
        await alCambiar();
      }} />
    </section>
  );
}
