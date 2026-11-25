"use client";

// Ventana de Avisos sobre Radix Dialog: centrada en escritorio o como hoja desde abajo en celular. Título y descripción
// accesibles, foco atrapado, Esc cierra y botón «Cerrar» de 44 px (en español, a diferencia del Dialog genérico).
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Ventana({ abierta, onOpenChange, titulo, descripcion, hoja = false, className = "", encabezado, children }) {
  return (
    <D.Root open={abierta} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-slate-900/45 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <D.Content
          className={cn(
            "fixed z-50 flex flex-col bg-white text-slate-900 shadow-2xl outline-none",
            hoja
              ? "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[22px] pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom"
              : "left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            className,
          )}
        >
          {hoja ? <span aria-hidden="true" className="mx-auto mt-2.5 h-[5px] w-10 shrink-0 rounded-full bg-slate-300" /> : null}
          <div className="flex shrink-0 items-start gap-3 px-4 pt-3 sm:px-6 sm:pt-5">
            {encabezado}
            <div className="min-w-0 flex-1">
              <D.Title className="text-[17px] font-extrabold leading-tight sm:text-[19px]">{titulo}</D.Title>
              {descripcion ? <D.Description className="mt-0.5 text-[13.5px] text-slate-600">{descripcion}</D.Description> : <D.Description className="sr-only">{titulo}</D.Description>}
            </div>
            <D.Close aria-label="Cerrar" className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <X aria-hidden="true" className="size-5" />
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
