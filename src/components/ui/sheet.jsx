"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

// sinSalida: sin animación al cerrar (solo los paneles `menu`, ver SheetContent).
const SheetOverlay = ({ className, sinSalida = false, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      sinSalida
        ? "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=open]:fade-in-0"
        : "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
);
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:duration-500 data-[state=open]:animate-in",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
      // Animación de salida: todos los paneles salvo los `menu`.
      salida: { true: "data-[state=closed]:duration-300 data-[state=closed]:animate-out", false: "" },
    },
    compoundVariants: [
      { salida: true, side: "top", className: "data-[state=closed]:slide-out-to-top" },
      { salida: true, side: "bottom", className: "data-[state=closed]:slide-out-to-bottom" },
      { salida: true, side: "left", className: "data-[state=closed]:slide-out-to-left" },
      { salida: true, side: "right", className: "data-[state=closed]:slide-out-to-right" },
    ],
    defaultVariants: {
      side: "right",
      salida: true,
    },
  }
);

// (27/11/2026, regla del dueño, docs/vistas-de-detalle.md) Un panel lateral con contenido (formularios, ayuda, chat,
// detalle) es una ventana: NO se cierra con un clic o toque afuera, solo con Esc, sus botones o la X. Los paneles que
// son un MENÚ (navegación, «Más acciones») pasan `menu` y sí se cierran al tocar afuera, como cualquier menú.
// (27/11/2026) Los `menu` además se cierran SIN animación de salida: mientras Radix anima el cierre deja el <body> con
// pointer-events:none (y el velo encima), y en celular eso se comía los toques 0.7–1.5 s después de elegir un módulo.
const SheetContent = (
  { side = "right", className, children, menu = false, onPointerDownOutside, onInteractOutside, ...props },
  ref
) => (
  <SheetPortal>
    <SheetOverlay sinSalida={menu} />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side, salida: !menu }), className)}
      onPointerDownOutside={(e) => { onPointerDownOutside?.(e); if (!menu) e.preventDefault(); }}
      onInteractOutside={(e) => { onInteractOutside?.(e); if (!menu) e.preventDefault(); }}
      {...props}
    >
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Cerrar</span>
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = ({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-bold text-navy", className)}
    {...props}
  />
);
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = ({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
);
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
