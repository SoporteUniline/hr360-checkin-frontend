"use client";

// Panel lateral de detalle del registro de reloj checador (se abre al hacer
// clic en una fila). Solo lectura + acceso rápido a la corrección inline
// existente (mismo handler que el botón de la columna Acciones).

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
import { Pencil, LogIn, LogOut } from "lucide-react";
import { useEmpresaTimezone } from "@/context/AuthContext";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TIMEZONE = "America/Mexico_City";

function EstadoPill({ estado }) {
  const cls =
    estado === "Abierto"
      ? "text-green-700 bg-green-50 border-green-200"
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

export default function EntradasDetalleSheet({
  registro,
  open,
  onOpenChange,
  onCorregir,
  empresaActiva,
}) {
  const fallbackTimezone = useEmpresaTimezone(empresaActiva);

  if (!registro) return null;

  const userTimezone = registro.zona_horaria || fallbackTimezone;

  const fmtHora = (v) =>
    v ? dayjs.tz(v, DB_TIMEZONE).tz(userTimezone).format("HH:mm") : "—";
  const fmtFecha = (v) =>
    v ? dayjs.tz(v, DB_TIMEZONE).tz(userTimezone).format("DD/MM/YYYY") : "—";

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
    registro.unidad_negocio || registro.sucursal || registro.nombre_empresa;

  const tieneCorreccion = Boolean(
    registro.entrada_corregida || registro.salida_corregida,
  );

  // Horas del registro (con corrección si existe), igual que la tabla.
  let horas = "—";
  const entradaFinal = registro.entrada_corregida || registro.entrada;
  const salidaFinal = registro.salida_corregida || registro.salida;
  if (entradaFinal && salidaFinal) {
    const mins = dayjs
      .tz(salidaFinal, DB_TIMEZONE)
      .diff(dayjs.tz(entradaFinal, DB_TIMEZONE), "minute");
    if (mins > 0)
      horas = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
  }

  const kv = [
    { k: "Fecha", v: fmtFecha(registro.entrada) },
    { k: "Estado", v: <EstadoPill estado={registro.estado} /> },
    { k: "Hrs registro", v: horas },
    { k: "Puesto", v: registro.puesto || "—" },
    { k: "Unidad de negocio", v: unidad || "—" },
    { k: "Departamento", v: registro.departamento || "—" },
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
              {[registro.puesto, unidad, registro.departamento]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </SheetHeader>
        <div className="h-[2.5px] bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />

        <div className="flex-1 px-6 py-5">
          <div className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Checadas
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-gray-100 px-3 py-3">
              <div className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-gray-400">
                <LogIn className="h-3 w-3 text-[#2563eb]" />
                Hora entrada
              </div>
              <div className="mt-1 text-[22px] font-extrabold leading-tight tabular-nums tracking-tight text-gray-900">
                {fmtHora(registro.entrada)}
              </div>
              {registro.entrada_corregida ? (
                <div className="mt-0.5 text-[11px] font-semibold text-[#2563eb]">
                  Corregida: {fmtHora(registro.entrada_corregida)}
                </div>
              ) : null}
            </div>
            <div className="rounded-xl border border-gray-100 px-3 py-3">
              <div className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-gray-400">
                <LogOut className="h-3 w-3 text-[#7c3aed]" />
                Hora salida
              </div>
              <div className="mt-1 text-[22px] font-extrabold leading-tight tabular-nums tracking-tight text-gray-900">
                {fmtHora(registro.salida)}
              </div>
              {registro.salida_corregida ? (
                <div className="mt-0.5 text-[11px] font-semibold text-[#7c3aed]">
                  Corregida: {fmtHora(registro.salida_corregida)}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mb-2.5 mt-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Detalle del registro
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

          {tieneCorreccion ? (
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 text-[12px] font-medium leading-relaxed text-[#1d4ed8]">
              <span className="font-bold">Corregido</span> — este registro tiene
              horarios corregidos manualmente
              {registro.entrada_corregida
                ? `; entrada ${fmtHora(registro.entrada_corregida)}`
                : ""}
              {registro.salida_corregida
                ? `; salida ${fmtHora(registro.salida_corregida)}`
                : ""}
              .
            </div>
          ) : null}
        </div>

        {onCorregir ? (
          <div className="flex gap-2.5 border-t border-gray-100 px-6 py-4">
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
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
