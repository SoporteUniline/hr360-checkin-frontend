"use client";

// El menú lateral de ADAMIA se muestra como riel de iconos mientras la bandeja de WhatsApp está abierta (como WhatsApp
// Web, la bandeja usa todo el ancho). No cambia la preferencia del usuario: al salir, si lo plegó la bandeja y nadie lo
// volvió a abrir, se restaura como estaba. En teléfono el menú es una hoja y no se toca.
import { useLayoutEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";

export default function useMenuColapsado() {
  const { open, setOpen, isMobile } = useSidebar();
  const ultimo = useRef({ open, setOpen });
  ultimo.current = { open, setOpen };
  const plegadoPorBandeja = useRef(false);

  useLayoutEffect(() => {
    if (isMobile || !ultimo.current.open) return;
    plegadoPorBandeja.current = true;
    ultimo.current.setOpen(false);
  }, [isMobile]);

  useLayoutEffect(() => () => {
    // Al salir de la bandeja: si sigue plegado como lo dejó la bandeja, vuelve a como estaba.
    if (plegadoPorBandeja.current && !ultimo.current.open) ultimo.current.setOpen(true);
  }, []);
}
