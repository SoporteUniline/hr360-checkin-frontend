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
import { AlertTriangle, Pencil } from "lucide-react";

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-0">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <Pencil className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold">
                  Cambiar estado
                </DialogTitle>
                <DialogDescription className="text-sm text-indigo-100">
                  Actualiza el estado del cálculo de aguinaldo.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md">
            <p className="text-sm">
              Selecciona el nuevo estado para este cálculo de aguinaldo.
            </p>
          </div>
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

        <DialogFooter className="bg-gray-50 p-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-gray-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!nuevoEstado || nuevoEstado === estadoActual}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm disabled:opacity-50"
          >
            Confirmar Cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

