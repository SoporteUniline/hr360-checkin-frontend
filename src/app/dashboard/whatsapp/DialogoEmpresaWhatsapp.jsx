"use client";

// Edición de WhatsApp de una empresa (solo administradores de ADAMIA). El API valida de nuevo y manda sus mensajes.
// 27/11/2026: paquete de entrevistas (precio del paquete, entrevistas incluidas al mes y precio por entrevista extra).
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MODOS, mensajeErrorApi, validarConfigEmpresa } from "@/lib/whatsapp/reglas.mjs";
import { guardarEmpresaAdmin } from "@/components/whatsapp/api";

const vacio = (v) => (v === null || v === undefined ? "" : String(v));

function Campo({ id, etiqueta, ayuda, error, children }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-800">{etiqueta}</label>
      {children}
      {error ? <p id={`${id}-error`} className="text-[12.5px] font-medium text-red-700">{error}</p> : ayuda ? <p className="text-[12px] text-gray-500">{ayuda}</p> : null}
    </div>
  );
}

const claseInput = "h-11 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 aria-[invalid=true]:border-red-500 md:h-10 md:text-sm";

export default function DialogoEmpresaWhatsapp({ empresa, onCerrar, onGuardado }) {
  const [form, setForm] = useState({});
  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!empresa) return;
    setForm({
      modo: empresa.modo || "apagado",
      zernio_account_id: vacio(empresa.zernio_account_id),
      numero_whatsapp: vacio(empresa.numero_whatsapp),
      precio_conversacion: vacio(empresa.precio_conversacion),
      precio_mensual: vacio(empresa.precio_mensual),
      entrevistas_incluidas: vacio(empresa.entrevistas_incluidas),
    });
    setErrores({});
    setErrorApi("");
  }, [empresa]);

  const cambiar = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    setErrores((x) => ({ ...x, [campo]: undefined }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const { errores: encontrados, cuerpo } = validarConfigEmpresa(form);
    setErrores(encontrados);
    setErrorApi("");
    if (Object.keys(encontrados).length) return;
    setGuardando(true);
    try {
      await guardarEmpresaAdmin(empresa.id_empresa, cuerpo);
      await onGuardado(empresa);
    } catch (err) {
      setErrorApi(mensajeErrorApi(err, "No se pudo guardar. Intenta de nuevo."));
    } finally {
      setGuardando(false);
    }
  };

  const propio = form.modo === "propio";
  const props = (campo) => ({
    id: `wa-${campo}`,
    value: form[campo] ?? "",
    onChange: cambiar(campo),
    "aria-invalid": errores[campo] ? true : undefined,
    "aria-describedby": errores[campo] ? `wa-${campo}-error` : undefined,
    className: claseInput,
  });

  return (
    <Dialog open={!!empresa} onOpenChange={(abierto) => !abierto && !guardando && onCerrar()}>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={guardar} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>WhatsApp de {empresa?.nombre_empresa}</DialogTitle>
            <DialogDescription>Define cómo recibe esta empresa los chats de candidatos y cuánto se le cobra.</DialogDescription>
          </DialogHeader>
          <Campo id="wa-modo" etiqueta="Modo" error={errores.modo} ayuda={form.modo === "compartido" ? "Usa el número de ADAMIA; el ID y número propios son opcionales." : form.modo === "apagado" ? "La empresa no ve la bandeja ni puede generar enlaces." : "La empresa usa su propio número conectado en Zernio."}>
            <select {...props("modo")}>
              {MODOS.map((m) => <option key={m.valor} value={m.valor}>{m.texto}</option>)}
            </select>
          </Campo>
          <Campo id="wa-zernio_account_id" etiqueta={`ID de cuenta de Zernio${propio ? "" : " (opcional)"}`} error={errores.zernio_account_id}>
            <input {...props("zernio_account_id")} autoComplete="off" spellCheck={false} />
          </Campo>
          <Campo id="wa-numero_whatsapp" etiqueta={`Número de WhatsApp${propio ? "" : " (opcional)"}`} error={errores.numero_whatsapp} ayuda="Con lada de país, por ejemplo +52 55 1234 5678.">
            <input {...props("numero_whatsapp")} inputMode="tel" autoComplete="off" />
          </Campo>
          <fieldset className="grid gap-4 rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-sm font-semibold text-gray-800">Paquete de entrevistas</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="wa-precio_mensual" etiqueta="Precio del paquete (mensual, MXN)" error={errores.precio_mensual}>
                <input {...props("precio_mensual")} inputMode="decimal" placeholder="0.00" />
              </Campo>
              <Campo id="wa-entrevistas_incluidas" etiqueta="Entrevistas incluidas al mes" error={errores.entrevistas_incluidas} ayuda="Vacío = sin paquete.">
                <input {...props("entrevistas_incluidas")} inputMode="numeric" placeholder="Ej. 200" />
              </Campo>
            </div>
            <Campo id="wa-precio_conversacion" etiqueta="Precio por entrevista extra (MXN)" error={errores.precio_conversacion} ayuda="Se cobra por cada entrevista arriba de las incluidas. El agente nunca se detiene por el paquete.">
              <input {...props("precio_conversacion")} inputMode="decimal" placeholder="0.00" />
            </Campo>
          </fieldset>
          {errorApi ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorApi}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando} className="h-11 md:h-9">Cancelar</Button>
            <Button type="submit" loading={guardando} className="h-11 md:h-9">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
