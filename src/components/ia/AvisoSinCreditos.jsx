"use client";

// Créditos de Adamia AI (24/12/2026) · aviso único cuando la IA responde 402 IA_SIN_CREDITOS en CUALQUIER pantalla del panel
// (Clima, plantillas de documentos, desempeño, sugerencias de WhatsApp…). lib/axios lanza el evento; aquí se muestra el
// mensaje del servidor y el botón «Recargar créditos». No se repite mientras está abierto y no sale en la propia pantalla de
// créditos. Adamia AI (agente de la Ley) ya lo muestra en su lugar y no lo dispara.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EVENTO_SIN_CREDITOS, MENSAJE_SIN_CREDITOS, RUTA_CREDITOS } from "@/lib/ia/creditos.mjs";

export default function AvisoSinCreditos() {
  const [mensaje, setMensaje] = useState(null);
  useEffect(() => {
    const alAvisar = (e) => setMensaje((actual) => actual ?? (e?.detail?.mensaje || MENSAJE_SIN_CREDITOS));
    window.addEventListener(EVENTO_SIN_CREDITOS, alAvisar);
    return () => window.removeEventListener(EVENTO_SIN_CREDITOS, alAvisar);
  }, []);
  if (!mensaje) return null;
  const cerrar = () => setMensaje(null);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) cerrar(); }}>
      <DialogContent className="sm:max-w-md" data-aviso-sin-creditos>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wallet className="size-5 text-red-600" aria-hidden /> Te quedaste sin créditos de Adamia AI</DialogTitle>
          <DialogDescription>{mensaje}</DialogDescription>
        </DialogHeader>
        <p className="text-[13px] text-slate-600">Elige un paquete de recarga. Tu saldo se actualiza en cuanto se confirma el pago; lo que ya hiciste no se pierde.</p>
        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" onClick={cerrar}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Ahora no
          </button>
          <Link href={RUTA_CREDITOS} onClick={cerrar}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white">
            <Wallet className="size-4" aria-hidden /> Recargar créditos
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
