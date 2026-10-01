"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  History,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  csvText,
  formatRange,
  isApproved,
  isPending,
  isVacation,
  normalize,
  overlaps,
} from "@/lib/solicitudes-equipo/model.mjs";
import RequestDetail from "./RequestDetail";
import TeamCalendar from "./TeamCalendar";
import {
  Empty,
  Loading,
  requestedDays,
  selectClass,
  Status,
  teamFetcher,
} from "./shared";

export default function TeamRequests() {
  const { dataUser, isAuthChecked, isLoggedIn } = useAuth();
  if (!isAuthChecked) return <Loading />;
  if (!isLoggedIn || !dataUser)
    return (
      <Empty title="Inicia sesión">
        Vuelve a ingresar a ADAMIA para consultar tu equipo.
      </Empty>
    );
  const identity = `${dataUser.id_usuario}:${dataUser.id_empleado}:${dataUser.id_empresa || dataUser.empresas?.[0] || dataUser.empresas_detalle?.[0]?.id_empresa}`;
  return <TeamRequestsContent key={identity} identity={identity} />;
}

function TeamRequestsContent({ identity }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ["/api/solicitudes-equipo", identity],
    teamFetcher,
    { shouldRetryOnError: false, refreshInterval: 60000 },
  );
  const [tab, setTab] = useState("pending");
  const [query, setQuery] = useState("");
  const [employee, setEmployee] = useState("all");
  const [status, setStatus] = useState("all");
  const [year, setYear] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const restoreFocus = useRef(null);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const update = () => setWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const requests = useMemo(() => data?.requests || [], [data]);
  const today = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: data?.timezone || "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, [data]);
  const pending = requests.filter(isPending);
  const history = requests.filter((row) => !isPending(row));
  const calendar = {
    holidays: data?.holidays || [],
    holidaysAvailable: data?.holidaysAvailable || false,
  };
  const filtered = useMemo(() => {
    const source =
      tab === "pending"
        ? requests.filter(isPending)
        : tab === "history"
          ? requests.filter((row) => !isPending(row))
          : requests;
    return source.filter(
      (row) =>
        (employee === "all" || String(row.id_empleado) === employee) &&
        (!query ||
          normalize(
            `${row.empleado_nombre} ${row.tipo_permiso_nombre} ${row.puesto} ${row.id}`,
          ).includes(normalize(query))) &&
        (tab !== "history" ||
          ((status === "all" || normalize(row.estado) === status) &&
            (year === "all" ||
              overlaps(row, `${year}-01-01`, `${year}-12-31`)))),
    );
  }, [requests, tab, employee, query, status, year]);
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const selected =
    requests.find((row) => String(row.id) === String(selectedId)) || null;
  const years = [
    ...new Set(
      history
        .flatMap((row) => [
          row.fecha_inicio?.slice(0, 4),
          row.fecha_fin?.slice(0, 4),
        ])
        .filter(Boolean),
    ),
  ]
    .sort()
    .reverse();

  function changeTab(value) {
    setTab(value);
    setPage(1);
    setSelectedId(null);
    setMobileOpen(false);
  }
  function openRequest(row) {
    restoreFocus.current = document.activeElement;
    setSelectedId(row.id);
    setMobileOpen(true);
  }
  function showHistory(id) {
    setTab("history");
    setEmployee(String(id));
    setQuery("");
    setStatus("all");
    setYear("all");
    setPage(1);
    setSelectedId(null);
    setMobileOpen(false);
  }
  function exportHistory() {
    const rows = [
      ["Colaborador", "Tipo", "Inicio", "Fin", "Días", "Estado"],
      ...filtered.map((row) => [
        row.empleado_nombre,
        row.tipo_permiso_nombre,
        row.fecha_inicio,
        row.fecha_fin,
        requestedDays(row, calendar) ?? "Por confirmar",
        row.estado,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([csvText(rows)], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial-equipo-${today}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const detail = selected ? (
    <RequestDetail
      key={selected.id}
      selected={selected}
      identity={identity}
      calendar={calendar}
      requests={requests}
      today={today}
      onResolved={mutate}
      onHistory={showHistory}
    />
  ) : null;
  const stats = [
    {
      label: "Por autorizar",
      value: pending.length,
      icon: ClipboardCheck,
      color: "text-amber-600 bg-amber-50",
      action: () => changeTab("pending"),
    },
    {
      label: "De vacaciones hoy",
      value: new Set(
        requests
          .filter(
            (row) =>
              isVacation(row) && isApproved(row) && overlaps(row, today, today),
          )
          .map((row) => row.id_empleado),
      ).size,
      icon: CalendarDays,
      color: "text-blue-600 bg-blue-50",
      action: () => changeTab("calendar"),
    },
    {
      label: "Colaboradores a tu cargo",
      value: data?.team.length || 0,
      icon: Users,
      color: "text-gray-600 bg-gray-100",
    },
  ];

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1600px] space-y-6 text-gray-900">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-400">Mi equipo</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Solicitudes de mi equipo
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            Revisa solicitudes, consulta su historial y organiza las vacaciones
            de tu equipo.
          </p>
        </div>
        <Button
          aria-label="Actualizar solicitudes"
          title="Actualizar"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={isValidating}
          onClick={() => mutate()}
        >
          <RefreshCw
            className={`size-4 ${isValidating ? "animate-spin" : ""}`}
          />
        </Button>
      </header>
      {isLoading ? (
        <Loading />
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-6"
        >
          <h2 className="font-medium text-red-800">
            No pudimos cargar tu equipo
          </h2>
          <p className="mt-2 text-sm text-red-700">{error.message}</p>
          <Button className="mt-4" variant="outline" onClick={() => mutate()}>
            Volver a intentar
          </Button>
        </div>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 sm:p-4"
                >
                  <div>
                    <p className="min-h-8 text-[10px] leading-4 text-gray-500 sm:min-h-0 sm:text-xs">
                      {item.label}
                    </p>
                    {item.action ? (
                      <button
                        type="button"
                        onClick={item.action}
                        aria-label={`${item.value} ${item.label}`}
                        className="mt-1 text-2xl font-semibold hover:text-blue-600"
                      >
                        {item.value}
                      </button>
                    ) : (
                      <p className="mt-1 text-2xl font-semibold">
                        {item.value}
                      </p>
                    )}
                  </div>
                  <span
                    className={`hidden rounded-xl p-2.5 sm:block ${item.color}`}
                  >
                    <item.icon className="size-5" />
                  </span>
                </div>
              ))}
            </div>
            <Tabs value={tab} onValueChange={changeTab}>
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-gray-200 bg-transparent p-0 pb-0.5">
                <TabsTrigger
                  value="pending"
                  className="flex-1 gap-2 rounded-none border-0 border-b-2 border-transparent px-2 py-3 sm:flex-none text-xs shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none sm:px-4 sm:text-sm"
                >
                  <ClipboardCheck className="hidden size-4 sm:block" />
                  Por autorizar{" "}
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                    {pending.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex-1 gap-2 rounded-none border-0 border-b-2 border-transparent px-2 py-3 sm:flex-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none sm:px-4 sm:text-sm"
                >
                  <History className="hidden size-4 sm:block" />
                  Historial
                </TabsTrigger>
                <TabsTrigger
                  value="calendar"
                  className="flex-1 gap-2 rounded-none border-0 border-b-2 border-transparent px-2 py-3 sm:flex-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none sm:px-4 sm:text-sm"
                >
                  <CalendarDays className="hidden size-4 sm:block" />
                  Calendario
                </TabsTrigger>
              </TabsList>
              <TabsContent value={tab} className="mt-4">
                {!data.team.length ? (
                  <Empty title="Aún no tienes colaboradores asignados">
                    RH puede asignarte como responsable de autorizar vacaciones
                    o permisos en el registro de cada colaborador.
                  </Empty>
                ) : (
                  <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
                    <section
                      className="min-w-0 space-y-4"
                      aria-label={
                        tab === "pending"
                          ? "Solicitudes pendientes"
                          : tab === "history"
                            ? "Historial de solicitudes"
                            : "Calendario de vacaciones"
                      }
                    >
                      <div className="flex flex-wrap gap-2">
                        <div className="relative min-w-40 flex-1">
                          <Search className="absolute left-3 top-3 size-4 text-gray-400" />
                          <Input
                            aria-label="Buscar solicitudes"
                            placeholder="Buscar colaborador o solicitud…"
                            className="h-10 rounded-lg border-gray-200 pl-9"
                            value={query}
                            onChange={(e) => {
                              setQuery(e.target.value);
                              setPage(1);
                            }}
                          />
                        </div>
                        <select
                          aria-label="Colaborador"
                          className={`${selectClass} max-w-full`}
                          value={employee}
                          onChange={(e) => {
                            setEmployee(e.target.value);
                            setPage(1);
                          }}
                        >
                          <option value="all">Todo mi equipo</option>
                          {data.team.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                        </select>
                        {tab === "history" && (
                          <>
                            <select
                              aria-label="Estado"
                              className={selectClass}
                              value={status}
                              onChange={(e) => {
                                setStatus(e.target.value);
                                setPage(1);
                              }}
                            >
                              <option value="all">Todos los estados</option>
                              <option value="aprobado">Aprobadas</option>
                              <option value="rechazado">Rechazadas</option>
                              <option value="cancelado">Canceladas</option>
                            </select>
                            <select
                              aria-label="Año del historial"
                              className={selectClass}
                              value={year}
                              onChange={(e) => {
                                setYear(e.target.value);
                                setPage(1);
                              }}
                            >
                              <option value="all">Todos los años</option>
                              {years.map((value) => (
                                <option key={value}>{value}</option>
                              ))}
                            </select>
                            <Button
                              variant="outline"
                              className="h-10"
                              disabled={!filtered.length}
                              onClick={exportHistory}
                            >
                              <Download className="size-4" />
                              Exportar
                            </Button>
                          </>
                        )}
                      </div>
                      {tab === "calendar" ? (
                        <TeamCalendar
                          requests={filtered}
                          today={today}
                          calendar={calendar}
                          onSelect={openRequest}
                          selectedId={selectedId}
                        />
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              {filtered.length}{" "}
                              {filtered.length === 1
                                ? "solicitud"
                                : "solicitudes"}
                              {tab === "pending"
                                ? " por revisar"
                                : " en el historial"}
                            </span>
                            <span>
                              {tab === "pending"
                                ? "Más recientes primero"
                                : "Aprobadas, rechazadas y canceladas"}
                            </span>
                          </div>
                          {!filtered.length ? (
                            <Empty
                              title={
                                query ||
                                employee !== "all" ||
                                status !== "all" ||
                                year !== "all"
                                  ? "Sin coincidencias"
                                  : tab === "pending"
                                    ? "Todo al día"
                                    : "Aún no hay solicitudes resueltas"
                              }
                            >
                              {tab === "pending" && !query && employee === "all"
                                ? "No tienes solicitudes pendientes. Puedes consultar el historial y el calendario en cualquier momento."
                                : "Prueba con otro colaborador o cambia los filtros."}
                            </Empty>
                          ) : (
                            <div className="space-y-2">
                              {visible.map((row) => (
                                <button
                                  type="button"
                                  key={row.id}
                                  onClick={() => openRequest(row)}
                                  aria-pressed={
                                    String(selectedId) === String(row.id)
                                  }
                                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${String(selectedId) === String(row.id) ? "border-blue-400 bg-blue-50/40 ring-1 ring-blue-100" : "border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50/50"}`}
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900">
                                      {row.empleado_nombre}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {row.tipo_permiso_nombre || "Permiso"} ·{" "}
                                      {requestedDays(row, calendar) ?? "—"} días
                                    </p>
                                    <p className="mt-2 text-xs leading-5 text-gray-600">
                                      {formatRange(row)}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-2">
                                    <Status row={row} />
                                    <span className="inline-flex items-center text-[11px] font-medium text-blue-600">
                                      Revisar
                                      <ChevronRight className="size-3" />
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {pages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                              <span>
                                Página {currentPage} de {pages}
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  aria-label="Página anterior"
                                  disabled={currentPage === 1}
                                  onClick={() => setPage(currentPage - 1)}
                                >
                                  <ChevronLeft className="size-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  aria-label="Página siguiente"
                                  disabled={currentPage === pages}
                                  onClick={() => setPage(currentPage + 1)}
                                >
                                  <ChevronRight className="size-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </section>
                    {wide && (
                      <aside
                        aria-label="Detalle de solicitud"
                        className="sticky top-5 max-h-[calc(100dvh-6rem)] overflow-hidden rounded-xl border border-gray-200 bg-white"
                      >
                        {detail ? (
                          <div className="h-[clamp(24rem,calc(100dvh-25rem),48rem)]">
                            {detail}
                          </div>
                        ) : (
                          <div className="px-7 py-20 text-center">
                            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                              <ClipboardCheck className="size-6" />
                            </span>
                            <h2 className="mt-4 text-sm font-semibold">
                              Selecciona una solicitud
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-gray-500">
                              Aquí verás las fechas, el saldo de vacaciones y el
                              historial del colaborador.
                            </p>
                          </div>
                        )}
                      </aside>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            {!wide && (
              <Dialog
                open={mobileOpen && !!selected}
                onOpenChange={setMobileOpen}
              >
                <DialogContent
                  style={{ top: 0, left: 0, transform: "none" }}
                  className="inset-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none"
                  onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    restoreFocus.current?.focus?.();
                  }}
                >
                  <div className="border-b border-gray-100 px-5 py-4 pr-12">
                    <DialogTitle className="text-base">
                      Detalle de solicitud
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Fechas, saldo, historial y acciones de autorización.
                    </DialogDescription>
                  </div>
                  <div className="min-h-0 flex-1">{detail}</div>
                </DialogContent>
              </Dialog>
            )}
          </>
        )
      )}
    </main>
  );
}
