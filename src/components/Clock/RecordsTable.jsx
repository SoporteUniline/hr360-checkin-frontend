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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#2563EB]" />
          Últimos registros
        </h3>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableCell className="px-6 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                Código
              </TableCell>
              <TableCell className="px-6 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                Empleado
              </TableCell>
              <TableCell className="px-6 py-2 text-center text-xs font-semibold uppercase text-gray-700">
                Entrada
              </TableCell>
              <TableCell className="px-6 py-2 text-center text-xs font-semibold uppercase text-gray-700">
                Salida
              </TableCell>
              <TableCell className="px-6 py-2 text-center text-xs font-semibold uppercase text-gray-700">
                Estado
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100">
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
                  className="hover:bg-gray-50 transition-colors"
                >
                  <TableCell className="px-6">
                    <span className="text-sm font-semibold text-gray-700">
                      {mov.nip}
                    </span>
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="font-medium text-gray-900">
                      {mov.nombre}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                      {formatearHora(mov.entrada_corregida || mov.entrada)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 text-center">
                    {mov.salida_corregida || mov.salida ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
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
                  className="text-center text-gray-500 py-4"
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
