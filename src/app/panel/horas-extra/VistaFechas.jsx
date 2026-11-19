"use client";

// «Control de horas extra» por fechas (maqueta aprobada 19/11/2026): días arriba, horas abajo.
// Clic en un día: sus registros (horario, checadas, tiempo de más, alertas), decidir Sí/No y
// «Abrir en Asistencias» (esa persona, ese día, con su ventana de edición abierta).
// Lógica: lib/asistencia/matrizHorasExtra.mjs.
import { useMemo, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/es";
import { ExternalLink } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CeldaAutorizarExtra } from "../registro-asistencia/CeldaHorasExtra";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { quienCuando } from "@/lib/asistencia/historial.mjs";
import { cambiosAutorizar, cambiosNoAutorizar, cambiosQuitar, DB_TZ } from "@/lib/asistencia/horasExtra.mjs";
import { alertasDia, semanaExtra } from "@/lib/asistencia/controlHorasExtra.mjs";
import { enlaceAsistencia, horaCorta, matrizHorasExtra } from "@/lib/asistencia/matrizHorasExtra.mjs";
import { hora12 } from "@/lib/hora12.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const diaSemana = (f) => DIAS[new Date(`${f}T00:00:00Z`).getUTCDay()];
const CELDA = {
  pendiente: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  autorizada: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  no_autorizada: "bg-slate-100 text-slate-400 line-through hover:bg-slate-200",
};
const ESTADO = {
  pendiente: ["Por autorizar", "bg-orange-50 text-orange-700"],
  autorizada: ["Autorizada", "bg-emerald-50 text-emerald-700"],
  no_autorizada: ["No autorizada", "bg-slate-100 text-slate-600"],
};
const hhmm = (v, zona) => (v ? hora12(dayjs.tz(v, DB_TZ).tz(zona || DB_TZ)) : "—");

export default function VistaFechas({ registros, dias, zonaDe, estados, tope, resumen, hx, mostrarTope, cargando }) {
  const [abierta, setAbierta] = useState(null); // { id, fecha }
  const hoy = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");
  const m = useMemo(() => matrizHorasExtra(registros, { dias, zonaDe, estados }), [registros, dias, zonaDe, estados]);
  const fila = abierta ? m.filas.find((f) => f.id === abierta.id) : null;
  const celda = fila?.celdas[abierta.fecha] ?? null;
  const nombre = (r) => `${r.nombre ?? ""} ${r.apellido_paterno ?? ""}`.trim();

  const acciones = (r) => ({
    autorizar: (op) => hx.guardar([{ registro: r, cambios: cambiosAutorizar({ forma: op?.forma, notas: op?.notas, idAutorizador: hx.usuario.idEmpleado }) }], `${nombre(r)}: horas extra autorizadas.`),
    noAutorizar: () => hx.guardar([{ registro: r, cambios: cambiosNoAutorizar(r, { quien: hx.usuario.nombre, zona: zonaDe(r) }) }], `${nombre(r)}: no autorizadas.`),
    quitar: () => hx.guardar([{ registro: r, cambios: cambiosQuitar(r, zonaDe(r)) }], `${nombre(r)}: decisión quitada.`),
  });

  if (cargando) return <p className="py-10 text-center text-sm text-slate-500">Cargando horas extra…</p>;
  if (!m.filas.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Nadie tiene horas extra {estados?.length ? "con este filtro " : ""}en este periodo.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600" aria-label="Colores">
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-orange-200 align-middle" />Por autorizar</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200 align-middle" />Autorizada</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-slate-200 align-middle" />No autorizada (no suma)</span>
        <span className="text-slate-400">⚠ más de 4 h en el día · clic en un día para ver sus registros</span>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-[13px] tabular-nums" aria-label="Horas extra por día">
          <thead className="sticky top-0 z-10 bg-slate-50 text-center text-[10.5px] font-bold uppercase tracking-wide text-slate-500 shadow-[0_1px_0_#e2e8f0]">
            <tr>
              <th scope="col" className="sticky left-0 z-20 min-w-[190px] bg-slate-50 px-3 py-2 text-left">Empleado</th>
              {dias.map((f) => (
                <th key={f} scope="col" className={`min-w-[62px] px-1 py-2 ${f === hoy ? "bg-blue-50 text-blue-700" : ""}`}>
                  {diaSemana(f)}<b className="block text-[15px] tracking-normal text-slate-900">{Number(f.slice(8, 10))}</b>
                </th>
              ))}
              <th scope="col" className="px-3 py-2">Total</th>
              {mostrarTope && <th scope="col" className="min-w-[140px] px-3 py-2">De {formatearMinutos(tope)} al doble</th>}
            </tr>
          </thead>
          <tbody>
            {m.filas.map((f) => {
              const pct = tope ? Math.min(100, (f.total / tope) * 100) : 0;
              return (
                <tr key={f.id} aria-label={f.nombre} className="border-t border-slate-100">
                  <td className="sticky left-0 z-[5] bg-white px-3 py-1.5 text-left">
                    <b className="block leading-tight text-slate-900">{f.nombre}</b>
                    <small className="text-[11px] text-slate-500">{f.departamento}</small>
                  </td>
                  {dias.map((d) => {
                    const c = f.celdas[d];
                    return (
                      <td key={d} className={`px-1 py-1.5 text-center ${d === hoy ? "bg-blue-50/50" : ""}`}>
                        {c ? (
                          <button type="button" onClick={() => setAbierta({ id: f.id, fecha: d })}
                            aria-label={`${f.nombre} ${d}: ${horaCorta(c.minutos)} ${ESTADO[c.estado][0]}`}
                            className={`relative w-[58px] rounded-lg py-1.5 font-bold ${CELDA[c.estado]} ${abierta?.id === f.id && abierta?.fecha === d ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}>
                            {horaCorta(c.minutos)}
                            {c.estado !== "no_autorizada" && c.minutos > 240 && <span className="absolute -right-1 -top-1.5 text-[11px] text-red-600" aria-hidden>⚠</span>}
                          </button>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-3 py-1.5 text-center font-bold">{formatearMinutos(f.total)}</td>
                  {mostrarTope && (
                    <td className="px-3 py-1.5">
                      <div className="mx-auto h-1.5 w-28 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                        <i className={`block h-full ${f.total > tope ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <small className={`block text-center text-[11px] ${f.total > tope ? "font-semibold text-red-700" : "text-slate-500"}`}>
                        {f.total > tope ? `${formatearMinutos(f.total - tope)} al triple` : `le quedan ${formatearMinutos(tope - f.total)}`}
                      </small>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
            <tr>
              <td className="sticky left-0 z-[5] bg-slate-50 px-3 py-2 text-left">Total del día</td>
              {dias.map((d) => {
                const t = m.totalesDia[d];
                return (
                  <td key={d} className="px-1 py-2 text-center">
                    {t.minutos ? horaCorta(t.minutos) : "—"}
                    {t.pendientes ? <small className="block text-[10.5px] font-semibold text-orange-700">{t.pendientes} por aut.</small> : null}
                  </td>
                );
              })}
              <td className="whitespace-nowrap px-3 py-2 text-center">{formatearMinutos(m.total)}</td>
              {mostrarTope && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      <Dialog open={Boolean(celda)} onOpenChange={(v) => { if (!v) setAbierta(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
          {celda && (
            <>
              <DialogHeader>
                <DialogTitle>{fila.nombre}{fila.departamento ? ` · ${fila.departamento}` : ""}</DialogTitle>
                <DialogDescription>{dayjs(abierta.fecha).locale("es").format("dddd D [de] MMMM YYYY")}</DialogDescription>
              </DialogHeader>
              {celda.registros.map(({ registro: r, info }) => {
                const zona = zonaDe(r);
                const alertas = alertasDia(r, resumen, { zona, tope });
                const semana = semanaExtra(r, resumen, tope);
                const tramos = Array.isArray(r.tramos_checadas) && r.tramos_checadas.length
                  ? r.tramos_checadas.map((t) => `${hhmm(t.entrada, zona)} → ${hhmm(t.salida, zona)}`).join(" · ")
                  : `${hhmm(r.entrada, zona)} → ${hhmm(r.salida, zona)}`;
                const a = acciones(r);
                const [etiqueta, color] = ESTADO[info.estado];
                const autorizador = [r.nombre_extra_autorizador, r.apellido_paterno_extra_autorizador].filter(Boolean).join(" ");
                return (
                  <section key={r.id} className="space-y-3 rounded-xl border border-slate-200 p-3" aria-label="Registro del día">
                    <div className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
                      <Dato titulo="Horario">{String(r.hora_entrada_programada ?? "—").slice(0, 5)} – {String(r.hora_salida_programada ?? "—").slice(0, 5)}</Dato>
                      <Dato titulo="Checadas del reloj">{tramos}</Dato>
                      <Dato titulo="Tiempo de más"><span className={info.estado === "pendiente" ? "text-orange-700" : info.estado === "autorizada" ? "text-emerald-700" : "text-slate-500 line-through"}>{formatearMinutos(info.minutos ?? 0)}</span></Dato>
                      <Dato titulo="Semana autorizadas">{formatearMinutos(semana.acumulado)} de {formatearMinutos(tope)}</Dato>
                    </div>
                    {alertas.length > 0 && (
                      <p className="rounded-lg bg-red-50 px-3 py-1.5 text-[12.5px] font-semibold text-red-700">⚠ {alertas.join(" · ")}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{etiqueta}</span>
                      <CeldaAutorizarExtra
                        registro={r}
                        info={info}
                        autorizador={autorizador || null}
                        readOnly={false}
                        guardando={hx.guardando}
                        onAutorizar={a.autorizar}
                        onNoAutorizar={a.noAutorizar}
                        onQuitar={a.quitar}
                      />
                      <span className="text-xs text-slate-500">
                        Editado: {Number(r.correccion) ? `Sí${r.ultimo_cambio ? ` · ${quienCuando(r.ultimo_cambio)}` : ""}` : "No"}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <Link href={enlaceAsistencia(r)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Abrir en Asistencias <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </section>
                );
              })}
              <p className="text-xs text-slate-500">«Abrir en Asistencias» lleva a esa persona y ese día con su ventana de edición abierta (corregir salida, comida, historial).</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Dato({ titulo, children }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">{titulo}</span>
      <b className="text-slate-900">{children}</b>
    </div>
  );
}
