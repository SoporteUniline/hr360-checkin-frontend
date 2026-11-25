"use client";
// «¿Activar Face ID para entrar más rápido?» (25/11/2026). Aparece una vez, justo después de entrar con contraseña, si
// el navegador tiene WebAuthn y en este dispositivo no se activó ni se pidió «No volver a preguntar». Ver
// docs/passkeys-sesiones.md. Activar / Ahora no (vuelve a preguntar en una semana) / No volver a preguntar aquí.
import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { Fingerprint, ScanFace, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { activarPasskey } from "@/lib/passkeys/api";
import {
  CLAVE_NO_PREGUNTAR, CLAVE_OFRECER, debeOfrecer, marcarActivada, mensajeFalla, nombreMetodo, posponer, tituloOferta,
} from "@/lib/passkeys/modelo.mjs";
import usePlataforma, { soportaPasskeys } from "./usePlataforma";

const almacen = (nombre) => {
  try {
    return window[nombre];
  } catch {
    return null;
  }
};

export function IconoMetodo({ plataforma, className = "size-5" }) {
  const Icono = plataforma === "ios" ? ScanFace : plataforma === "android" ? Fingerprint : KeyRound;
  return <Icono className={className} aria-hidden="true" />;
}

export default function OfertaPasskey() {
  const { dataUser, isLoggedIn } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const plataforma = usePlataforma();
  const [abierta, setAbierta] = useState(false);
  const [activando, setActivando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || !dataUser) return;
    const local = almacen("localStorage");
    const sesion = almacen("sessionStorage");
    if (debeOfrecer({ local, sesion, usuario: dataUser, soporta: soportaPasskeys() })) setAbierta(true);
    else sesion?.removeItem(CLAVE_OFRECER);
  }, [isLoggedIn, dataUser]);

  const cerrar = () => {
    almacen("sessionStorage")?.removeItem(CLAVE_OFRECER);
    setAbierta(false);
    setError(null);
  };
  const ahoraNo = () => {
    posponer(almacen("localStorage"), dataUser);
    cerrar();
  };
  const noVolver = () => {
    try { almacen("localStorage")?.setItem(CLAVE_NO_PREGUNTAR, "1"); } catch { /* sin almacenamiento: solo se cierra */ }
    cerrar();
  };
  const activar = async () => {
    setActivando(true);
    setError(null);
    try {
      await activarPasskey();
      marcarActivada(almacen("localStorage"), dataUser);
      enqueueSnackbar(`Listo: la próxima vez entra con ${nombreMetodo(plataforma)}.`, { variant: "success" });
      cerrar();
    } catch (e) {
      const mensaje = mensajeFalla(e, { plataforma, accion: "activar" });
      if (e?.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") marcarActivada(almacen("localStorage"), dataUser);
      setError(mensaje);
    } finally {
      setActivando(false);
    }
  };

  const metodo = nombreMetodo(plataforma);
  return (
    <Dialog open={abierta} onOpenChange={(v) => { if (!v) ahoraNo(); }}>
      {/* z-[1500]: encima del aviso «Inicio de sesión exitoso» (notistack, z 1400), que tapaba los botones en el teléfono. */}
      <DialogContent
        className="z-[1500] max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] gap-5 sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-brand">
          <IconoMetodo plataforma={plataforma} className="size-7" />
        </div>
        <div className="space-y-2">
          <DialogTitle className="text-lg font-semibold text-[#080d36]">{tituloOferta(plataforma)}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600">
            Entra sin escribir tu contraseña. Tu {plataforma === "escritorio" ? "dispositivo" : "teléfono"} confirma que eres tú con {metodo === "passkey" ? "su bloqueo de pantalla" : metodo}; tu cara o tu huella nunca salen de él: ADAMIA solo guarda una llave pública.
          </DialogDescription>
        </div>
        {error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p> : null}
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={activar} loading={activando} className="h-12 rounded-xl bg-brand text-base font-semibold text-white">
            Activar
          </Button>
          <Button type="button" variant="ghost" onClick={ahoraNo} disabled={activando} className="h-11 rounded-xl text-sm font-medium text-slate-700">
            Ahora no
          </Button>
          <Button type="button" variant="ghost" onClick={noVolver} disabled={activando} className="h-11 rounded-xl text-sm font-medium text-slate-500">
            No volver a preguntar en este dispositivo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
