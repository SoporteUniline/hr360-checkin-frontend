"use client";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Versión con detección automática
export default function TablePagination({
  page,
  limit,
  total = 0,
  onPageChange,
  onLimitChange, // Opcional
}) {
  const totalPages = Math.ceil(total / limit) || 1;

  // Detectar automáticamente si debe mostrar el selector
  const showLimitSelector = Boolean(onLimitChange);

  const handlePrevious = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  const limitOptions = [10, 25, 50, 100, 200, 500];

  const handleLimitChange = (newLimit) => {
    if (onLimitChange) {
      onLimitChange(newLimit);
    }
    onPageChange(1);
  };

  return (
    // Pie de tabla responsivo:
    // - flex-col en móviles para apilar información, selector y navegación.
    // - sm:flex-row para mantener el layout horizontal en pantallas medianas+.
    // - gap para espaciar elementos cuando se apilan.
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="text-center text-xs text-slate-500 sm:flex-1 sm:text-left">
        Página <span className="font-semibold text-slate-700">{page}</span> de{" "}
        <span className="font-semibold text-slate-700">{totalPages}</span>
        <span className="mx-1.5 text-slate-300">·</span>
        <span>{total} registros</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
        {/* Mostrar selector solo si onLimitChange fue proporcionado */}
        {showLimitSelector && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Mostrar</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 rounded-lg border-slate-200 px-2.5 text-xs font-semibold text-slate-600 shadow-none"
                >
                  {limit === 1000000 ? "Todos" : limit}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {limitOptions.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => handleLimitChange(option)}
                    className={limit === option ? "bg-accent" : ""}
                  >
                    {option} por página
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={() => handleLimitChange(1000000)}
                  className={limit === 1000000 ? "bg-accent" : ""}
                >
                  Todos los registros
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* La navegación ocupa todo el ancho en móviles para centrarse correctamente */}
        <Pagination className="w-full sm:w-auto justify-center sm:justify-start">
          <PaginationContent>
            <PaginationItem>
              <Button
                size="sm"
                variant="ghost"
                className={`h-8 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-900 ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
                onClick={handlePrevious}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Anterior
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                size="sm"
                variant="ghost"
                className={`h-8 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-900 ${page === totalPages ? "pointer-events-none opacity-40" : ""}`}
                onClick={handleNext}
              >
                Siguiente
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
