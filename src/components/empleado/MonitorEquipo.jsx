"use client";

// «Monitor de mi equipo» (app del empleado, solo jefes): quién está trabajando, quién no ha llegado, en comida, etc.,
// con la misma lógica de estados del Monitor de RH (lib/asistencia/hoy.mjs vía lib/asistencia/hoyEquipo.mjs).
// Versión ligera propia: el componente de RH (VistaHoy) depende del panel (ficha del empleado, cuentas de horas) y lo
// está moviendo otra rebanada. Al tocar a alguien se ve su día en modo lectura; editar sigue siendo de RH.
import { useEffect, useMemo, useState } from "react";
import { Search, UsersRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { agruparHoy, checadasDelDia, describir, resumenHoy, TARJETAS, textoFechaHoy } from "@/lib/asistencia/hoy.mjs";
import { diaParaLeer, resultadosHoy } from "@/lib/asistencia/hoyEquipo.mjs";
import useMonitorEquipo from "@/hooks/useMonitorEquipo";
import { DataState } from "@/components/empleado/shared";

const nombreDe = (r) => [r.nombre, r.apellido_paterno].filter(Boolean).join(" ");
const iniciales = (r) => `${r.nombre?.[0] ?? ""}${r.apellido_paterno?.[0] ?? ""}`.toUpperCase() || "?";
const sinAcentos = (v) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CHIP = {
  rojo: "bg-red-100 text-red-800", naranja: "bg-orange-100 text-orange-800", amarillo: "bg-yellow-100 text-yellow-800",
  verde: "bg-green-100 text-green-800", azul: "bg-blue-100 text-blue-800", rosa: "bg-rose-100 text-rose-800",
  gris: "bg-slate-200 text-slate-700", neutro: "bg-slate-100 text-slate-600",
};

function Linea({ etiqueta, children }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-slate-100 py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-slate-500">{etiqueta}</span>
      <span className="text-right font-semibold tabular-nums text-slate-900">{children}</span>
    </div>
  );
}

function DiaEquipo({ registro, zona, onCerrar }) {
  const d = diaParaLeer(registro, zona);
  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-white sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>{nombreDe(registro)}</DialogTitle>
          <DialogDescription>{String(registro.fecha).slice(0, 10).split("-").reverse().join("/")} · {d.horario}</DialogDescription>
        </DialogHeader>
        <section aria-label="Checadas del día">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">Checadas</h3>
          {d.tramos.length ? d.tramos.map((t, i) => (
            <Linea key={`${t.entrada}-${i}`} etiqueta={`Tramo ${i + 1}`}>{t.entrada} → {t.salida ?? "sigue trabajando"}</Linea>
          )) : <p className="py-2 text-sm text-slate-500">Sin checadas este día.</p>}
        </section>
        {d.comida && (
          <section aria-label="Comida" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <b>Comida</b> · {d.comida.origen} · <span className="tabular-nums">{d.comida.rango}</span>{d.comida.minutos ? ` · ${d.comida.minutos}` : ""}
            {d.comida.agrego ? <span className="block text-xs">agregó {d.comida.agrego}</span> : null}
          </section>
        )}
        <section aria-label="Permisos del día">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">Permisos</h3>
          {d.permisos.length
            ? d.permisos.map((p) => <Linea key={p} etiqueta="Permiso">{p}</Linea>)
            : <p className="py-2 text-sm text-slate-500">Sin permisos.</p>}
        </section>
        <section aria-label="Horas extra">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">Horas extra</h3>
          {d.horasExtra.length ? d.horasExtra.map((h) => (
            <Linea key={h.rango} etiqueta={h.motivo}>{h.rango} · {h.minutos}</Linea>
          )) : <p className="py-2 text-sm text-slate-500">Sin horas extra registradas.</p>}
        </section>
        <p className="text-xs text-slate-500">Solo lectura. Si algo no está bien, avisa a Recursos Humanos.</p>
      </DialogContent>
    </Dialog>
  );
}

function Renglon({ r, onAbrir }) {
  const reg = r.dia.registro;
  const d = describir(r);
  const c = checadasDelDia(r);
  return (
    <li>
      <button type="button" onClick={() => onAbrir(reg)} aria-label={`Ver día de ${nombreDe(reg)}`} data-estado={r.estado}
        className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left hover:bg-slate-50
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-50 text-[13px] font-bold text-blue-800">
          {iniciales(reg)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="truncate text-[15px] text-slate-900">{nombreDe(reg)}</b>
          <span className="text-[13px] text-slate-600">{d.detalle}{d.resaltado ? <> · <b className="text-orange-800">{d.resaltado}</b></> : null}</span>
          {c.entrada ? (
            <span className="text-xs tabular-nums text-slate-500">
              Entrada {c.entrada}{c.salida ? ` · Salida ${c.salida}` : ""}{c.comida ? ` · Comida ${c.comida.texto}` : ""}
            </span>
          ) : null}
        </span>
        <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${CHIP[d.tono] ?? CHIP.neutro}`}>{d.chip}</span>
      </button>
    </li>
  );
}

export default function MonitorEquipo() {
  const { data, error, isLoading, mutate, esJefe } = useMonitorEquipo({ refrescar: true });
  const zona = data?.zona_horaria || "America/Mexico_City";
  const [reloj, setReloj] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setReloj(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const [filtro, setFiltro] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(null);

  const resultados = useMemo(() => resultadosHoy(data?.registros ?? [], zona, new Date(reloj)), [data, zona, reloj]);
  const visibles = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return q ? resultados.filter((r) => sinAcentos(nombreDe(r.dia.registro)).includes(q)) : resultados;
  }, [resultados, busqueda]);
  const resumen = useMemo(() => resumenHoy(visibles), [visibles]);
  const tarjeta = TARJETAS.find((t) => t.clave === filtro) ?? null;
  const grupos = useMemo(() => agruparHoy(tarjeta ? visibles.filter(tarjeta.es) : visibles, (r) => nombreDe(r.dia.registro)), [visibles, tarjeta]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monitor de mi equipo</h1>
        <p className="mt-1 text-sm text-slate-500">{textoFechaHoy(zona)} · quién está y quién falta, se actualiza cada minuto.</p>
      </div>
      <DataState loading={isLoading && !data} error={error} retry={mutate}>
        {!esJefe ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <UsersRound className="size-8 text-slate-400" aria-hidden="true" />
            <p className="font-semibold text-slate-900">No tienes personas a tu cargo</p>
            <p className="text-sm text-slate-500">Cuando Recursos Humanos te asigne un equipo, aquí verás su día.</p>
          </div>
        ) : (
          <>
            <div role="group" aria-label="Resumen de hoy" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0
              lg:grid-cols-7">
              {TARJETAS.map((t) => (
                <button key={t.clave} type="button" aria-pressed={filtro === t.clave} onClick={() => setFiltro((f) => (f === t.clave ? null : t.clave))}
                  className={`flex min-h-11 min-w-[104px] shrink-0 flex-col rounded-xl px-3 py-2 text-left sm:min-w-0 ${
                    filtro === t.clave ? "border-2 border-blue-600 bg-white" : "border border-slate-200 bg-white"}`}>
                  <span className="text-xs font-semibold text-slate-600">{t.titulo}</span>
                  <span className="text-2xl font-bold tabular-nums text-slate-900">{resumen.cuenta[t.clave]}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <label htmlFor="equipo-buscar" className="sr-only">Buscar en mi equipo</label>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input id="equipo-buscar" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en mi equipo…"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-[15px] focus:border-blue-500 focus:outline-none
                  sm:max-w-sm" />
            </div>
            {grupos.length ? grupos.map((g) => (
              <section key={g.clave} aria-label={`${g.titulo} (${g.filas.length})`} className="space-y-2">
                <h2 className={`text-xs font-bold tracking-[0.04em] ${g.clave === "atencion" ? "text-orange-800" : "text-slate-600"}`}>
                  {g.titulo.toUpperCase()} · {g.filas.length}
                </h2>
                <ul className="space-y-2">{g.filas.map((r) => <Renglon key={r.dia.id} r={r} onAbrir={setAbierto} />)}</ul>
              </section>
            )) : (
              <p className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-600">
                {tarjeta ? `Nadie en «${tarjeta.titulo}» ahora.` : busqueda ? "Nadie coincide con la búsqueda." : "Tu equipo no tiene registro para hoy."}
              </p>
            )}
          </>
        )}
      </DataState>
      {abierto ? <DiaEquipo registro={abierto} zona={zona} onCerrar={() => setAbierto(null)} /> : null}
    </div>
  );
}
