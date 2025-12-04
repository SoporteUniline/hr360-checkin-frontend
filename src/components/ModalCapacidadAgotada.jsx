"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ModalCapacidadAgotada({ open, onClose, mensaje }) {
  const whatsappNumber = "5213171035768";
  const texto = encodeURIComponent(
    "Hola, necesito apoyo para mejorar mi plan en HR360. ¿Me podrían ayudar?"
  );

  const url = `https://wa.me/${whatsappNumber}?text=${texto}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b-2 pb-4">
          <DialogTitle>No es posible crear un empleado</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-700 mb-1">
          {mensaje} Te sugerimos ponerte en contacto con el administrador de
          HR360 para obtener un plan acorde a tus necesidades.
        </p>

        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button className="w-full bg-white text-emerald-700 border-emerald-700 border-2 hover:bg-gray-200">
            Contactar por WhatsApp
          </Button>
        </a>
      </DialogContent>
    </Dialog>
  );
}
