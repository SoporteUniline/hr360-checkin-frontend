"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Ventana chica (28/11/2026, mockup aprobado; docs/sistema-diseno.md) para formularios de HASTA 6 campos y una sola
 * idea: crear un puesto, un departamento, una categoría, un motivo. Más campos o varias secciones → página
 * (PaginaFormulario). Franja gris con el título y una X de 44 px; pie con Cancelar y Guardar (56 px).
 * NO se cierra al hacer clic afuera (lo hace src/components/ui/dialog.jsx para todas las ventanas): solo con Esc,
 * Cancelar, Guardar o la X, así lo escrito no se pierde.
 *
 * Props:
 *   abierta / alCambiar   estado de Radix (open / onOpenChange).
 *   titulo                texto de la franja (obligatorio).
 *   descripcion           texto gris arriba de los campos (opcional; también lo lee el lector de pantalla).
 *   alGuardar             (evento) => void. Se llama al dar Guardar o Enter (es un <form>; ya trae preventDefault).
 *   textoGuardar          por defecto «Guardar».
 *   guardando             muestra los puntos y deshabilita Guardar.
 *   deshabilitado         deshabilita Guardar (di en `descripcion` o en el campo por qué).
 *   children              los campos (CampoFormulario).
 *
 * Ejemplo:
 *   <VentanaChica abierta={abierta} alCambiar={setAbierta} titulo="Crear puesto" alGuardar={guardar} guardando={guardando}>
 *     <CampoFormulario id="puesto-nombre" etiqueta="Nombre del puesto" obligatorio error={error}>
 *       {(p) => <input {...p} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />}
 *     </CampoFormulario>
 *   </VentanaChica>
 */
export default function VentanaChica({
  abierta,
  alCambiar,
  titulo,
  descripcion = null,
  alGuardar,
  textoGuardar = "Guardar",
  guardando = false,
  deshabilitado = false,
  className = "",
  children,
}) {
  const enviar = (evento) => {
    evento.preventDefault();
    if (guardando || deshabilitado) return;
    alGuardar?.(evento);
  };
  return (
    <Dialog open={abierta} onOpenChange={alCambiar}>
      <DialogContent
        showCloseButton={false}
        className={cn("gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 text-cuerpo text-texto shadow-[0_20px_50px_rgba(0,0,0,0.25)] sm:max-w-[560px]", className)}
      >
        <div data-franja className="flex items-center justify-between gap-3 border-b border-borde bg-franja px-5 py-3.5 lg:px-6 lg:py-[18px]">
          <DialogTitle className="text-[22px] font-bold leading-tight text-navy">{titulo}</DialogTitle>
          <DialogClose asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Cerrar">
              <X aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <form onSubmit={enviar} noValidate>
          <div className="flex flex-col gap-[22px] px-5 py-5 lg:px-6 lg:py-6">
            {descripcion
              ? <DialogDescription className="m-0 text-cuerpo text-texto-secundario">{descripcion}</DialogDescription>
              : <DialogDescription className="sr-only">{titulo}</DialogDescription>}
            {children}
          </div>
          <div className="flex gap-3 border-t border-borde px-5 py-4 sm:justify-end lg:px-6">
            <DialogClose asChild>
              <Button type="button" variant="outline" data-accion="cancelar" className="flex-1 sm:flex-none">Cancelar</Button>
            </DialogClose>
            <Button type="submit" size="lg" loading={guardando} disabled={deshabilitado} data-accion="guardar" className="flex-1 sm:flex-none sm:px-8">
              {textoGuardar}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
