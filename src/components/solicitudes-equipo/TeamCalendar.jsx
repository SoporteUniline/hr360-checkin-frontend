"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  formatRange,
  isCalendarRequest,
  isPending,
  monthCells,
  monthKey,
  nextWorkday,
  overlaps,
} from "@/lib/solicitudes-equipo/model.mjs";
import { Empty, Status } from "./shared";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const monthName = (year, month) =>
  formatDate(`${monthKey(year, month)}-01`, {
    day: undefined,
    month: "long",
    year: undefined,
  });

function MiniMonth({ year, month, rows, today, onClick }) {
  const prefix = monthKey(year, month);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver ${monthName(year, month)} de ${year}`}
      className="rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/30 focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      <h3 className="mb-3 text-sm font-semibold capitalize text-gray-800">
        {monthName(year, month)}
      </h3>
      <div className="grid grid-cols-7 text-center text-[10px] text-gray-400">
        {weekdays.map((day) => (
          <span key={day}>{day[0]}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-[11px]">
        {monthCells(year, month).map((day) => {
          const events = rows.filter((row) => overlaps(row, day, day));
          const approved = events.some((row) => !isPending(row));
          const pending = events.some(isPending);
          return (
            <span
              key={day}
              className={`relative mx-auto flex size-6 items-center justify-center rounded-md ${!day.startsWith(prefix) ? "invisible" : approved ? "bg-blue-100 font-semibold text-blue-700" : pending ? "border border-dashed border-amber-400 bg-amber-50 text-amber-800" : day === today ? "ring-1 ring-blue-500 text-blue-600" : "text-gray-500"}`}
            >
              {Number(day.slice(-2))}
              {approved && pending && (
                <span className="absolute bottom-0 right-0 size-1.5 rounded-full bg-amber-500" />
              )}
            </span>
          );
        })}
      </div>
    </button>
  );
}

export default function TeamCalendar({
  requests,
  today,
  calendar,
  onSelect,
  selectedId,
}) {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  }));
  const [dayFilter, setDayFilter] = useState(null);
  const { year, month } = cursor;
  const prefix = monthKey(year, month);
  const rows = useMemo(() => requests.filter(isCalendarRequest), [requests]);
  // Rango civil real del mes, incluidos los días 28/29/30/31.
  const monthEnd = new Date(Date.UTC(year, month + 1, 0))
    .toISOString()
    .slice(0, 10);
  const agenda = rows
    .filter((row) =>
      overlaps(row, dayFilter || `${prefix}-01`, dayFilter || monthEnd),
    )
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  const cells = monthCells(year, month);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) =>
    cells.slice(i * 7, i * 7 + 7),
  );

  function move(delta) {
    const date = new Date(
      Date.UTC(year, view === "year" ? month : month + delta, 1),
    );
    setCursor({
      year: view === "year" ? year + delta : date.getUTCFullYear(),
      month: date.getUTCMonth(),
    });
    setDayFilter(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Periodo anterior"
            onClick={() => move(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2
            aria-live="polite"
            className="min-w-36 text-center text-base font-semibold capitalize text-gray-900"
          >
            {view === "year" ? year : `${monthName(year, month)} ${year}`}
          </h2>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Periodo siguiente"
            onClick={() => move(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCursor({
                year: Number(today.slice(0, 4)),
                month: Number(today.slice(5, 7)) - 1,
              });
              setDayFilter(null);
            }}
          >
            Hoy
          </Button>
        </div>
        <div
          className="flex rounded-lg bg-gray-100 p-1"
          aria-label="Vista del calendario"
        >
          {[
            ["month", "Mes"],
            ["year", "Año"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={view === value}
              onClick={() => {
                setView(value);
                setDayFilter(null);
              }}
              className={`rounded-md px-4 py-1.5 text-xs font-medium ${view === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-blue-500" />
          Aprobadas
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm border border-dashed border-amber-500 bg-amber-50" />
          Pendientes
        </span>
        <span>Vacaciones de tu equipo</span>
      </div>
      {view === "year" ? (
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 12 }, (_, i) => (
            <MiniMonth
              key={i}
              year={year}
              month={i}
              rows={rows}
              today={today}
              onClick={() => {
                setCursor({ year, month: i });
                setView("month");
                setDayFilter(null);
              }}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 py-3 text-center text-[11px] font-medium text-gray-500">
              {weekdays.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            {weeks.map((week) => {
              const events = rows.filter((row) =>
                overlaps(row, week[0], week[6]),
              );
              return (
                <div
                  key={week[0]}
                  className="relative border-b border-gray-100 last:border-b-0"
                >
                  <div className="grid grid-cols-7">
                    {week.map((day) => {
                      const dayEvents = events.filter((row) =>
                        overlaps(row, day, day),
                      );
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() =>
                            setDayFilter(day === dayFilter ? null : day)
                          }
                          aria-label={`${formatDate(day)}, ${dayEvents.length} solicitudes`}
                          aria-pressed={day === dayFilter}
                          className={`flex min-h-16 flex-col items-center gap-1 border-r border-gray-100 py-2 last:border-r-0 md:min-h-9 md:items-end md:px-2 ${day === dayFilter ? "bg-blue-50" : !day.startsWith(prefix) ? "bg-gray-50 text-gray-300" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                          <span
                            className={`flex size-6 items-center justify-center rounded-full text-xs ${day === today ? "bg-blue-600 font-semibold text-white" : ""}`}
                          >
                            {Number(day.slice(-2))}
                          </span>
                          <span className="flex gap-0.5 md:hidden">
                            {dayEvents.slice(0, 3).map((row) => (
                              <span
                                key={row.id}
                                className={`size-1 rounded-full ${isPending(row) ? "bg-amber-500" : "bg-blue-500"}`}
                              />
                            ))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="hidden min-h-20 space-y-1 pb-2 md:block">
                    {events.slice(0, 3).map((row) => {
                      const from = Math.max(
                        0,
                        week.findIndex((day) => day >= row.fecha_inicio),
                      );
                      const last = week.filter(
                        (day) => day <= row.fecha_fin,
                      ).length;
                      return (
                        <div key={row.id} className="grid grid-cols-7 px-1">
                          <button
                            type="button"
                            onClick={() => onSelect(row)}
                            style={{ gridColumn: `${from + 1} / ${last + 1}` }}
                            title={`${row.empleado_nombre} · ${formatRange(row)} · ${row.estado}`}
                            className={`mx-0.5 truncate rounded px-2 py-1 text-left text-[11px] font-medium ${isPending(row) ? "border border-dashed border-amber-400 bg-amber-50 text-amber-800" : "border border-blue-100 bg-blue-100 text-blue-800"} ${String(selectedId) === String(row.id) ? "ring-1 ring-blue-500" : ""}`}
                          >
                            {row.empleado_nombre}
                          </button>
                        </div>
                      );
                    })}
                    {events.length > 3 && (
                      <p className="px-3 text-[10px] text-gray-500">
                        +{events.length - 3} solicitudes más en la agenda de
                        abajo
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {dayFilter ? formatDate(dayFilter) : "Agenda del mes"}
                <span className="ml-2 font-normal text-gray-400">
                  {agenda.length}
                </span>
              </h3>
              {dayFilter && (
                <button
                  type="button"
                  onClick={() => setDayFilter(null)}
                  className="text-xs text-blue-600"
                >
                  Ver todo el mes
                </button>
              )}
            </div>
            {!agenda.length ? (
              <Empty title="Sin vacaciones en estas fechas">
                Cambia el mes o los filtros para consultar otras solicitudes.
              </Empty>
            ) : (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {agenda.map((row) => {
                  const back = nextWorkday(
                    row,
                    calendar.holidays,
                    calendar.holidaysAvailable,
                  );
                  return (
                    <button
                      type="button"
                      key={row.id}
                      onClick={() => onSelect(row)}
                      className={`flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 ${String(selectedId) === String(row.id) ? "bg-blue-50/50" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {row.empleado_nombre}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatRange(row)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Regreso: {back ? formatDate(back) : "por confirmar"}
                        </p>
                      </div>
                      <Status row={row} />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
