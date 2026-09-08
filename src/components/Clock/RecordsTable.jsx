import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { twMerge } from "tailwind-merge";

export default function RecordsTable({
  movimientos,
  isLoading,
  formatearHora,
}) {
  const movimientosParaTabla = movimientos?.slice(0, 10) || [];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Users className="h-5 w-5 text-blue-600" />
          Últimos registros
        </h3>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableCell className="px-6 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Código
              </TableCell>
              <TableCell className="px-6 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Empleado
              </TableCell>
              <TableCell className="px-6 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Entrada
              </TableCell>
              <TableCell className="px-6 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Salida
              </TableCell>
              <TableCell className="px-6 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Estado
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-slate-100">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {["w-20", "w-40", "w-16", "w-16", "w-20"].map((w, j) => (
                    <TableCell key={j}>
                      <div
                        className={`h-4 bg-gray-200 rounded animate-pulse ${w}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : movimientosParaTabla?.length > 0 ? (
              movimientosParaTabla.map((mov, i) => (
                <TableRow
                  key={i}
                  className="transition-colors hover:bg-slate-50/70"
                >
                  <TableCell className="px-6">
                    <span className="text-sm font-semibold text-slate-700">
                      {mov.nip}
                    </span>
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="font-medium text-slate-900">
                      {mov.nombre}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 text-center">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {formatearHora(mov.entrada_corregida || mov.entrada)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 text-center">
                    {mov.salida_corregida || mov.salida ? (
                      <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        {formatearHora(mov.salida_corregida || mov.salida)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 text-center">
                    <span
                      className={twMerge(
                        "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold",
                        mov.estado === "Abierto"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      )}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          mov.estado === "Abierto"
                            ? "bg-green-500 animate-pulse"
                            : "bg-slate-400"
                        }`}
                      ></div>
                      {mov.estado}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-5 text-center text-sm text-slate-500"
                >
                  No hay registros para el día de hoy aún
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
