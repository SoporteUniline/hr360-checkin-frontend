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
  total,
  onPageChange,
  onLimitChange, // Opcional
}) {
  const totalPages = Math.ceil(total / limit);

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
    <div className="flex items-center justify-between px-4 py-2">
      <div className="text-sm text-muted-foreground flex-1">
        Página <span className="font-medium">{page}</span> de{" "}
        <span className="font-medium">{totalPages}</span> — {total} registros
      </div>

      <div className="flex items-center gap-4">
        {/* Mostrar selector solo si onLimitChange fue proporcionado */}
        {showLimitSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  {limit === 1000000 ? "Todos" : limit}
                  <ChevronDown className="w-4 h-4" />
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

        <Pagination className="w-auto">
          <PaginationContent>
            <PaginationItem>
              <Button
                size="sm"
                variant="ghost"
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
                onClick={handlePrevious}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                size="sm"
                variant="ghost"
                className={
                  page === totalPages ? "pointer-events-none opacity-50" : ""
                }
                onClick={handleNext}
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
