"use client";

// Panel lateral de detalle del día (se abre al hacer clic en una fila).
// Solo lectura + acceso rápido a la corrección inline existente.

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Pencil, LogIn, LogOut, UtensilsCrossed, History } from "lucide-react";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TIMEZONE = "America/Mexico_City";

const fmtHora = (v) => (v ? dayjs.tz(v, DB_TIMEZONE).format("HH:mm") : null);

const fmtFecha = (v) =>
  v ? dayjs.tz(v, DB_TIMEZONE).format("DD/MM/YYYY") : "—";

function EstadoPill({ estado }) {
  const e = String(estado || "").toLowerCase();
  const cls =
    e === "presente"
      ? "text-green-700 bg-green-50 border-green-200"
      : e === "ausente"
        ? "text-red-700 bg-red-50 border-red-200"
        : e === "tardanza"
          ? "text-yellow-700 bg-yellow-50 border-yellow-200"
          : "text-gray-600 bg-gray-50 border-gray-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {estado || "—"}
    </span>
  );
}

export default function AsistenciaDetalleSheet({
  registro,
  open,
  onOpenChange,
  onCorregir,
  onVerHistorial,
}) {
  if (!registro) return null;

  const nombre = [
    registro.nombre,
    registro.apellido_paterno,
    registro.apellido_materno,
  ]
    .filter(Boolean)
    .join(" ");
  const iniciales = [registro.nombre, registro.apellido_paterno]
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const unidad =
    registro.unidad_negocio || registro.sucursal || registro.empresa_nombre;
  const estado = registro.estadoAsistencia || registro.estado;

  const entrada = fmtHora(registro.entrada);
  const salida = fmtHora(registro.salida);

  let horas = "—";
  if (registro.entrada && registro.salida) {
    const mins = dayjs(registro.salida).diff(dayjs(registro.entrada), "minute");
    if (mins > 0)
      horas = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
  }

  const kv = [
    { k: "Fecha", v: fmtFecha(registro.fecha) },
    { k: "Estado", v: <EstadoPill estado={estado} /> },
    { k: "Horas trabajadas", v: horas },
    { k: "Tipo", v: registro.tipo_registro_nombre || "—" },
    { k: "Departamento", v: registro.departamento || "—" },
    { k: "Goce de sueldo", v: registro.goce_sueldo ? "Sí" : "No" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[400px]">
        <SheetHeader className="flex-row items-center gap-3.5 space-y-0 px-6 pb-4 pt-6">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-[15px] font-extrabold text-white shadow-[0_8px_18px_rgba(37,99,235,0.3)]">
            {iniciales || "—"}
          </div>
          <div className="min-w-0">
            <SheetTitle className="truncate text-left text-[15.5px] font-extrabold tracking-tight text-gray-900">
              {nombre || "Empleado"}
            </SheetTitle>
            <div className="truncate text-[11.5px] font-medium text-gray-500">
              {[registro.nip, unidad, registro.departamento]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </SheetHeader>
        <div className="h-[2.5px] bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />

        <div className="flex-1 px-6 py-5">
          <div className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Resumen del día
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {kv.map(({ k, v }) => (
              <div
                key={k}
                className="rounded-xl border border-gray-100 px-3 py-2.5"
              >
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400">
                  {k}
                </div>
                <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-gray-900">
                  {v}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-2.5 mt-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Checadas
          </div>
          {!entrada && !salida ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center text-[12.5px] font-medium text-gray-400">
              Sin checadas registradas este día
            </div>
          ) : (
            <div className="relative pl-6 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-0.5 before:rounded before:bg-gradient-to-b before:from-[#2563eb] before:to-[#7c3aed]">
              {entrada && (
                <div className="relative py-1.5">
                  <span className="absolute -left-[23px] top-2.5 grid h-4 w-4 place-items-center rounded-full border-2 border-[#2563eb] bg-white">
                    <LogIn className="h-2 w-2 text-[#2563eb]" />
                  </span>
                  <div className="text-[13.5px] font-bold tabular-nums text-gray-900">
                    {entrada}
                  </div>
                  <div className="text-[11px] font-medium text-gray-500">
                    Entrada
                  </div>
                </div>
              )}
              {registro.hrs_comida ? (
                <div className="relative py-1.5">
                  <span className="absolute -left-[23px] top-2.5 grid h-4 w-4 place-items-center rounded-full border-2 border-gray-300 bg-white">
                    <UtensilsCrossed className="h-2 w-2 text-gray-400" />
                  </span>
                  <div className="text-[13.5px] font-bold tabular-nums text-gray-900">
                    {registro.hrs_comida} h
                  </div>
                  <div className="text-[11px] font-medium text-gray-500">
                    Comida
                  </div>
                </div>
              ) : null}
              {salida && (
                <div className="relative py-1.5">
                  <span className="absolute -left-[23px] top-2.5 grid h-4 w-4 place-items-center rounded-full border-2 border-[#7c3aed] bg-white">
                    <LogOut className="h-2 w-2 text-[#7c3aed]" />
                  </span>
                  <div className="text-[13.5px] font-bold tabular-nums text-gray-900">
                    {salida}
                  </div>
                  <div className="text-[11px] font-medium text-gray-500">
                    Salida
                  </div>
                </div>
              )}
            </div>
          )}

          {registro.notas ? (
            <>
              <div className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Observaciones
              </div>
              <div className="text-[12.5px] font-medium leading-relaxed text-gray-600">
                {registro.notas}
              </div>
            </>
          ) : null}
        </div>

        {onCorregir || onVerHistorial ? (
          <div className="flex gap-2.5 border-t border-gray-100 px-6 py-4">
            {onVerHistorial ? (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onVerHistorial(registro);
                }}
                className="flex-1 rounded-xl border-gray-200 font-semibold text-gray-700"
              >
                <History className="mr-2 h-4 w-4" />
                Ver historial
              </Button>
            ) : null}
            {onCorregir ? (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onCorregir(registro);
                }}
                className="flex-1 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.32)] hover:opacity-95"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Corregir horario
              </Button>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
