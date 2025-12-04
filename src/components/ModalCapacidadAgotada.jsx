"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ModalCapacidadAgotada({ open, onClose, mensaje }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b-2 pb-4">
          <DialogTitle>No es posible crear un empleado</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-700">
          {mensaje} Te sugerimos ponerte en contacto con el administrador de
          HR360 para obtener un plan acorde a tus necesidades.
        </p>
      </DialogContent>
    </Dialog>
  );
}
