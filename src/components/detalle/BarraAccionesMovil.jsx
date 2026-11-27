"use client";

import { useState } from "react";
import { BotonAccion } from "./BarraAcciones";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * Barra fija abajo en celular (docs/vistas-de-detalle.md): la acción principal (56 px), una secundaria («Ver el
 * documento») y «Más acciones», que abre una hoja con el resto (cada una ≥ 48 px y con texto). Solo bajo lg.
 * Deja un espacio al final de la página (EspacioBarraMovil) para que no tape el contenido.
 */
export default function BarraAccionesMovil({ primaria, secundaria = null, mas = [], titulo = "Más acciones" }) {
  const [abierta, setAbierta] = useState(false);
  const resto = mas.filter(Boolean);
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-[#E5E7EB] bg-white px-3.5 pb-5 pt-3 lg:hidden" data-barra-movil>
        {primaria ? <BotonAccion accion={{ ...primaria, tipo: "primaria" }} className="min-h-14 w-full text-[18px]" /> : null}
        {secundaria || resto.length ? (
          <div className="grid grid-cols-2 gap-2">
            {secundaria ? <BotonAccion accion={{ ...secundaria, tipo: "normal" }} className={resto.length ? "" : "col-span-2"} /> : null}
            {resto.length ? (
              <BotonAccion accion={{ clave: "mas", texto: titulo, tipo: "normal", onClick: () => setAbierta(true) }} className={secundaria ? "" : "col-span-2"} />
            ) : null}
          </div>
        ) : null}
      </div>
      <Sheet open={abierta} onOpenChange={setAbierta}>
        <SheetContent side="bottom" menu className="rounded-t-3xl px-4 pb-6">
          <SheetHeader className="px-0">
            <SheetTitle className="text-[20px] font-bold">{titulo}</SheetTitle>
            <SheetDescription className="text-[17px] text-[#4B5563]">Elige qué quieres hacer con este registro.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            {resto.map((a) => (
              <BotonAccion key={a.clave} accion={{ ...a, tipo: a.tipo === "primaria" ? "contorno" : a.tipo === "texto" ? "normal" : a.tipo, onClick: () => { setAbierta(false); a.onClick?.(); } }} className="w-full justify-start" />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Espacio al final de la página para que la barra fija no tape el último contenido (solo en celular). */
export const EspacioBarraMovil = () => <div aria-hidden="true" className="h-40 lg:hidden" />;
