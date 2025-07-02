"use client";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TablePagination({ page, limit, total, onPageChange }) {
  const totalPages = Math.ceil(total / limit);

  const handlePrevious = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  return (
    <div className="flex items-center px-4 py-2">
      <div className="text-sm text-muted-foreground flex-1">
        Página <span className="font-medium">{page}</span> de{" "}
        <span className="font-medium">{totalPages}</span> — {total} registros
      </div>
      <Pagination className="w-50">
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
  );
}
