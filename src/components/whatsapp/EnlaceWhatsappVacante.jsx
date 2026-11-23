"use client";

// «Enlace de WhatsApp» de una vacante (R1): el candidato abre el chat con el mensaje que identifica la vacante.
import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { enlaceVacante } from "./api";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { formatearTelefono } from "@/lib/whatsapp/telefono.mjs";

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Navegadores sin permiso de portapapeles: copia con una selección temporal.
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export default function EnlaceWhatsappVacante({ idVacante, titulo, variante = "outline", className = "" }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState({ cargando: false, datos: null, error: "" });
  const [copiado, setCopiado] = useState(false);

  const abrir = async () => {
    setAbierto(true);
    setCopiado(false);
    setEstado({ cargando: true, datos: null, error: "" });
    try {
      const datos = await enlaceVacante(idVacante);
      setEstado({ cargando: false, datos, error: "" });
    } catch (e) {
      setEstado({ cargando: false, datos: null, error: mensajeErrorApi(e, "No se pudo obtener el enlace. Intenta de nuevo.") });
    }
  };

  const copiar = async () => {
    if (!estado.datos?.enlace) return;
    const ok = await copiarTexto(estado.datos.enlace);
    setCopiado(ok);
    if (ok) setTimeout(() => setCopiado(false), 2500);
  };

  if (!idVacante) return null;
  return (
    <>
      <Button type="button" variant={variante} size="sm" onClick={abrir} className={`min-h-9 ${className}`}>
        <MessageCircle className="size-4 text-emerald-600" /> Enlace de WhatsApp
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enlace de WhatsApp</DialogTitle>
            <DialogDescription>
              {titulo ? <>Para la vacante «{titulo}». </> : null}
              Compártelo: al abrirlo, el candidato inicia el chat y la conversación llega a tu bandeja.
            </DialogDescription>
          </DialogHeader>
          {estado.cargando ? (
            <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Preparando el enlace…</p>
          ) : estado.error ? (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{estado.error}</p>
          ) : estado.datos ? (
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-gray-700">Enlace</span>
                <input
                  readOnly
                  value={estado.datos.enlace}
                  onFocus={(e) => e.target.select()}
                  className="h-11 w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-800"
                  aria-label="Enlace de WhatsApp de la vacante"
                />
              </label>
              {estado.datos.numero ? (
                <p className="text-xs text-gray-500">Número que recibe los mensajes: {formatearTelefono(estado.datos.numero)}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" onClick={copiar} className="h-11">
                  {copiado ? <Check className="size-4" /> : <Copy className="size-4" />} {copiado ? "Copiado" : "Copiar enlace"}
                </Button>
                <Button asChild variant="outline" className="h-11">
                  <a href={estado.datos.enlace} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" /> Abrir
                  </a>
                </Button>
              </div>
              <p aria-live="polite" className="sr-only">{copiado ? "Enlace copiado" : ""}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
