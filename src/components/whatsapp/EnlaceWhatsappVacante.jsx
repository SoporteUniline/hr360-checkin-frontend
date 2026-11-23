"use client";

// «Enlace de WhatsApp» de una vacante (R1): el candidato abre el chat con el mensaje que identifica la vacante.
import { useState } from "react";
import { Check, Copy, ExternalLink, FileText, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { enlaceVacante } from "./api";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { formatearTelefono } from "@/lib/whatsapp/telefono.mjs";
import { enlacePaginaVacante, origenPublico } from "@/lib/whatsapp/paquete.mjs";

export async function copiarTexto(texto) {
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

// Pide el enlace al API (una vez) y lo copia. Compartido por el botón con diálogo y por la fila en línea.
function useEnlaceVacante(idVacante) {
  const [estado, setEstado] = useState({ cargando: false, datos: null, error: "" });
  const [copiado, setCopiado] = useState(false);
  const cargar = async () => {
    setCopiado(false);
    setEstado({ cargando: true, datos: null, error: "" });
    try {
      const datos = await enlaceVacante(idVacante);
      setEstado({ cargando: false, datos, error: "" });
      return datos;
    } catch (e) {
      setEstado({ cargando: false, datos: null, error: mensajeErrorApi(e, "No se pudo obtener el enlace. Intenta de nuevo.") });
      return null;
    }
  };
  const copiar = async (datos = estado.datos) => {
    if (!datos?.enlace) return;
    const ok = await copiarTexto(datos.enlace);
    setCopiado(ok);
    if (ok) setTimeout(() => setCopiado(false), 2500);
  };
  return { estado, copiado, cargar, copiar };
}

// «Copiar enlace de la vacante» (27/11/2026): la página pública de la vacante con su formulario para postularse.
// No depende de WhatsApp ni de la bolsa de trabajo: sirve aunque la empresa no publique en la bolsa.
export function BotonCopiarPaginaVacante({ slug, titulo, onCopiado }) {
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState("");
  if (!slug) return null;
  const copiarPagina = async () => {
    setError("");
    // Se arma al hacer clic: en el servidor no hay window para el origen de respaldo.
    const enlace = enlacePaginaVacante(slug, origenPublico());
    const ok = enlace ? await copiarTexto(enlace) : false;
    setCopiado(ok);
    if (ok) {
      onCopiado?.(enlace);
      setTimeout(() => setCopiado(false), 2500);
    } else {
      setError("No se pudo copiar el enlace. Intenta de nuevo.");
    }
  };
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={copiarPagina} aria-label={`Copiar enlace de la vacante ${titulo}`} className="min-h-11 md:min-h-9"
        startIcon={copiado ? <Check className="size-4" /> : <FileText className="size-4 text-blue-600" />}>
        {copiado ? "Copiado" : "Copiar enlace de la vacante"}
      </Button>
      {error ? <span role="alert" className="basis-full text-[12.5px] text-amber-900">{error}</span> : null}
      <span aria-live="polite" className="sr-only">{copiado ? "Enlace de la vacante copiado" : ""}</span>
    </>
  );
}

// Fila en línea (lista de «Enlaces de vacantes»): «Copiar enlace de WhatsApp» lo pide y lo copia; luego aparece «Abrir».
// R2: `subtitulo` (conteo de preguntas) va bajo el título y `acciones` (botón «Entrevista») antes de los enlaces.
// 27/11/2026: `slug` agrega «Copiar enlace de la vacante» (página con formulario), que funciona con WhatsApp apagado.
export function EnlaceVacanteEnLinea({ idVacante, titulo, slug = null, subtitulo = null, acciones = null }) {
  const { estado, copiado, cargar, copiar } = useEnlaceVacante(idVacante);
  const [ultimo, setUltimo] = useState("");
  const copiarEnlace = async () => {
    const datos = estado.datos ?? (await cargar());
    if (datos) {
      await copiar(datos);
      setUltimo(datos.enlace);
    }
  };
  return (
    <div className="grid gap-2" data-vacante={idVacante}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">{titulo}</p>
        {subtitulo}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {acciones}
        <BotonCopiarPaginaVacante slug={slug} titulo={titulo} onCopiado={setUltimo} />
        <Button type="button" size="sm" onClick={copiarEnlace} loading={estado.cargando} aria-label={`Copiar enlace de WhatsApp de ${titulo}`} className="min-h-11 md:min-h-9"
          startIcon={copiado ? <Check className="size-4" /> : <MessageCircle className="size-4" />}>
          {copiado ? "Copiado" : "Copiar enlace de WhatsApp"}
        </Button>
        {estado.datos?.enlace ? (
          <Button asChild variant="outline" size="sm" className="min-h-11 md:min-h-9">
            <a href={estado.datos.enlace} target="_blank" rel="noopener noreferrer" aria-label={`Abrir enlace de WhatsApp de ${titulo}`}>
              <ExternalLink className="size-4" /> Abrir
            </a>
          </Button>
        ) : null}
      </div>
      {ultimo ? <p className="truncate text-[12px] text-gray-500" data-ultimo-enlace>{ultimo}</p> : null}
      {estado.error ? <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[13px] text-amber-900">{estado.error}</p> : null}
      <p aria-live="polite" className="sr-only">{copiado ? "Enlace copiado" : ""}</p>
    </div>
  );
}

export default function EnlaceWhatsappVacante({ idVacante, titulo, variante = "outline", className = "" }) {
  const [abierto, setAbierto] = useState(false);
  const { estado, copiado, cargar, copiar } = useEnlaceVacante(idVacante);

  const abrir = async () => {
    setAbierto(true);
    await cargar();
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
                <Button type="button" onClick={() => copiar()} className="h-11">
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
