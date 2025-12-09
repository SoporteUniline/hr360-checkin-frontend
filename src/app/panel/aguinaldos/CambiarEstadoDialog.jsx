"use client";

/**
 * Componente Dialog para cambiar el estado de un cálculo de aguinaldo
 * - Relación: usado en `src/app/panel/aguinaldos/page.jsx`
 * - Reemplaza el prompt() nativo por un diálogo estilizado con shadcn/ui
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CambiarEstadoDialog({ open, setOpen, estadoActual, onConfirm }) {
  const [nuevoEstado, setNuevoEstado] = useState(estadoActual || "Pendiente");

  const handleConfirm = () => {
    if (nuevoEstado && nuevoEstado !== estadoActual) {
      onConfirm(nuevoEstado);
      setOpen(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setNuevoEstado(estadoActual || "Pendiente");
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>✏️ Cambiar Estado del Cálculo</DialogTitle>
          <DialogDescription>
            Selecciona el nuevo estado para este cálculo de aguinaldo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Estado Actual</label>
            <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  estadoActual === "Pagado"
                    ? "bg-[#d1fae5] text-[#065f46]"
                    : estadoActual === "Cancelado"
                    ? "bg-[#fee2e2] text-[#991b1b]"
                    : "bg-[#fef3c7] text-[#92400e]"
                }`}
              >
                {estadoActual || "Pendiente"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Nuevo Estado</label>
            <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendiente">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    Pendiente
                  </div>
                </SelectItem>
                <SelectItem value="Pagado">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Pagado
                  </div>
                </SelectItem>
                <SelectItem value="Cancelado">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Cancelado
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!nuevoEstado || nuevoEstado === estadoActual}
            className="bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-[0_4px_12px_rgba(245,158,11,0.3)] transition-all hover:-translate-y-0.5"
          >
            Confirmar Cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

