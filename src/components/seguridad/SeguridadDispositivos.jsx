"use client";
// «Seguridad: dispositivos y Face ID» (25/11/2026): las passkeys de la cuenta (renombrar, quitar, activar aquí) y las
// sesiones abiertas (cerrar una o todas). La misma pantalla para RH/dueño (/panel/seguridad, /dashboard/seguridad) y
// para el empleado (/empleado/panel/seguridad). Ver docs/passkeys-sesiones.md.
import { useCallback, useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { LogOut, MonitorSmartphone, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import {
  activarPasskey, cerrarSesionPorId, cerrarTodasLasSesiones, listarPasskeys, listarSesiones, quitarPasskey, renombrarPasskey,
} from "@/lib/passkeys/api";
import { fechaCorta, marcarActivada, marcarQuitada, mensajeFalla, nombreMetodo, RUTA_LOGIN_SESION_CERRADA } from "@/lib/passkeys/modelo.mjs";
import usePlataforma, { passkeysBloqueadasEnApp } from "./usePlataforma";
import { IconoMetodo } from "./OfertaPasskey";

const tarjeta = "rounded-2xl border border-slate-200 bg-white p-4 sm:p-5";
const almacenLocal = () => {
  try { return window.localStorage; } catch { return null; }
};

function Confirmar({ abierto, titulo, texto, accion, peligro = true, onConfirmar, onCerrar }) {
  return (
    <AlertDialog open={abierto} onOpenChange={(v) => { if (!v) onCerrar(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{texto}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
          <AlertDialogAction className={`min-h-11 ${peligro ? "bg-red-600 text-white hover:bg-red-700" : ""}`} onClick={onConfirmar}>{accion}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function FilaPasskey({ p, plataforma, onRenombrar, onQuitar }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(p.nombre);
  const [guardando, setGuardando] = useState(false);
  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const ok = await onRenombrar(p, nombre);
    setGuardando(false);
    if (ok) setEditando(false);
  };
  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand max-sm:hidden"><IconoMetodo plataforma={plataforma} /></span>
      {editando ? (
        <form onSubmit={guardar} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`nombre-passkey-${p.id}`}>Nombre del dispositivo</label>
          <input id={`nombre-passkey-${p.id}`} value={nombre} maxLength={80} autoFocus onChange={(e) => setNombre(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-base sm:text-sm" />
          <div className="flex gap-2">
            <Button type="submit" loading={guardando} className="min-h-11 flex-1 rounded-xl bg-brand text-white sm:flex-none">Guardar</Button>
            <Button type="button" variant="ghost" onClick={() => { setNombre(p.nombre); setEditando(false); }} className="min-h-11 flex-1 rounded-xl sm:flex-none">Cancelar</Button>
          </div>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold text-[#080d36]">{p.nombre}</p>
            <p className="text-[13px] text-slate-500">Agregado: {fechaCorta(p.creado_en)} · Último uso: {fechaCorta(p.ultimo_uso_en)}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setEditando(true)} className="min-h-11 flex-1 rounded-xl sm:flex-none" aria-label={`Renombrar ${p.nombre}`}>
              <Pencil className="size-4" aria-hidden="true" />Renombrar
            </Button>
            <Button type="button" variant="outline" onClick={() => onQuitar(p)} className="min-h-11 flex-1 rounded-xl border-red-200 text-red-700 hover:bg-red-50 sm:flex-none" aria-label={`Quitar ${p.nombre}`}>
              <Trash2 className="size-4" aria-hidden="true" />Quitar
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

export default function SeguridadDispositivos({ encabezado = null }) {
  const { dataUser, logout } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const plataforma = usePlataforma();
  const metodo = nombreMetodo(plataforma);
  const [passkeys, setPasskeys] = useState(null);
  const [sesiones, setSesiones] = useState(null);
  const [aviso, setAviso] = useState(null); // passkeys no disponibles o sin identidad
  const [errorCarga, setErrorCarga] = useState(false);
  const [activando, setActivando] = useState(false);
  const [errorActivar, setErrorActivar] = useState(null);
  const [enAppSinPasskeys, setEnAppSinPasskeys] = useState(false);
  useEffect(() => setEnAppSinPasskeys(passkeysBloqueadasEnApp()), []);
  const [confirmar, setConfirmar] = useState(null);

  const cargar = useCallback(async () => {
    setErrorCarga(false);
    const [p, s] = await Promise.allSettled([listarPasskeys(), listarSesiones()]);
    if (p.status === "fulfilled") {
      setPasskeys(p.value.passkeys || []);
      setAviso(p.value.sin_identidad ? "Para administrar Face ID o huella vuelve a iniciar sesión con tu contraseña." : null);
    } else {
      setPasskeys([]);
      const codigo = p.reason?.response?.data?.code;
      if (codigo === "PASSKEYS_NO_DISPONIBLE") setAviso(p.reason.response.data.error);
      else setErrorCarga(true);
    }
    if (s.status === "fulfilled") setSesiones(s.value.sesiones || []);
    else { setSesiones([]); setErrorCarga(true); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  // El servidor ya cerró esta sesión: se sale (borra el token y lo guardado del reloj) y se va al login con aviso.
  const salirPorCierre = () => logout(RUTA_LOGIN_SESION_CERRADA);

  const activar = async () => {
    setActivando(true);
    setErrorActivar(null);
    try {
      await activarPasskey();
      marcarActivada(almacenLocal(), dataUser);
      enqueueSnackbar(`Listo: ya puedes entrar con ${metodo} en este dispositivo.`, { variant: "success" });
      await cargar();
    } catch (e) {
      setErrorActivar(mensajeFalla(e, { plataforma, accion: "activar" }));
    } finally {
      setActivando(false);
    }
  };

  const renombrar = async (p, nombre) => {
    try {
      await renombrarPasskey(p.id, nombre);
      await cargar();
      return true;
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudo cambiar el nombre.", { variant: "error" });
      return false;
    }
  };

  const quitar = async (p) => {
    try {
      const r = await quitarPasskey(p.id);
      if ((passkeys || []).length <= 1) marcarQuitada(almacenLocal(), dataUser);
      if (r.cerro_esta_sesion) return salirPorCierre();
      enqueueSnackbar(`Quitaste «${p.nombre}»${r.sesiones_cerradas ? " y se cerraron sus sesiones" : ""}.`, { variant: "success" });
      await cargar();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudo quitar.", { variant: "error" });
    }
  };

  const cerrarUna = async (s) => {
    if (s.actual) return logout();
    try {
      await cerrarSesionPorId(s.id);
      enqueueSnackbar(`Se cerró la sesión en ${s.dispositivo || "ese dispositivo"}.`, { variant: "success" });
      await cargar();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudo cerrar la sesión.", { variant: "error" });
    }
  };

  const cerrarTodas = async () => {
    try {
      await cerrarTodasLasSesiones();
      salirPorCierre();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudieron cerrar las sesiones.", { variant: "error" });
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {encabezado}
      {errorCarga ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          No pudimos consultar toda la información. <button type="button" onClick={() => cargar()} className="min-h-11 font-semibold text-blue-700">Reintentar</button>
        </div>
      ) : null}

      <section className={tarjeta} aria-labelledby="titulo-passkeys">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <h2 id="titulo-passkeys" className="text-base font-bold text-[#080d36]">Face ID, huella y passkeys</h2>
            <p className="mt-1 text-sm text-slate-600">Entra sin contraseña desde los dispositivos que actives. Tu cara o tu huella nunca salen de tu teléfono: ADAMIA solo guarda una llave pública.</p>
          </div>
          {!aviso && !enAppSinPasskeys ? (
            <Button type="button" onClick={activar} loading={activando} startIcon={<IconoMetodo plataforma={plataforma} />} className="min-h-11 shrink-0 rounded-xl bg-brand px-4 text-white">
              Activar en este dispositivo
            </Button>
          ) : null}
        </div>
        {enAppSinPasskeys && !aviso ? (
          <p role="status" data-passkeys-app className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
            En la app de ADAMIA llega en la próxima versión. Mientras, actívalo desde el navegador de tu celular o de tu computadora en adamia.com.mx.
          </p>
        ) : null}
        {errorActivar ? <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{errorActivar}</p> : null}
        {aviso ? <p role="status" className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">{aviso}</p> : null}
        <div className="mt-4">
          {passkeys === null ? (
            <p role="status" className="text-sm text-slate-500">Consultando…</p>
          ) : passkeys.length === 0 ? (
            !aviso ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Aún no activas {metodo === "passkey" ? "Face ID, huella ni passkeys" : metodo} en ningún dispositivo.</p> : null
          ) : (
            <ul className="divide-y divide-slate-100">
              {passkeys.map((p) => (
                <FilaPasskey key={p.id} p={p} plataforma={plataforma} onRenombrar={renombrar}
                  onQuitar={(x) => setConfirmar({ tipo: "passkey", x })} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={tarjeta} aria-labelledby="titulo-sesiones">
        <h2 id="titulo-sesiones" className="text-base font-bold text-[#080d36]">Sesiones abiertas</h2>
        <p className="mt-1 text-sm text-slate-600">Dispositivos donde tu cuenta está abierta. Si no reconoces alguno, ciérralo y cambia tu contraseña.</p>
        <div className="mt-4">
          {sesiones === null ? (
            <p role="status" className="text-sm text-slate-500">Consultando…</p>
          ) : sesiones.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No hay otras sesiones registradas. Las sesiones se registran desde que entras de nuevo.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sesiones.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 max-sm:hidden"><MonitorSmartphone className="size-5" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-[#080d36]">
                      <span className="break-words">{s.dispositivo || "Dispositivo"}</span>
                      {s.actual ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">Este dispositivo</span> : null}
                    </p>
                    <p className="text-[13px] text-slate-500">
                      {s.via === "passkey" ? `Entró con ${metodo === "passkey" ? "passkey" : metodo}` : "Entró con contraseña"} · Último uso: {fechaCorta(s.ultimo_uso_en)}
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => (s.actual ? cerrarUna(s) : setConfirmar({ tipo: "sesion", x: s }))} className="min-h-11 rounded-xl">
                    <LogOut className="size-4" aria-hidden="true" />{s.actual ? "Cerrar sesión" : "Cerrar"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="button" variant="outline" onClick={() => setConfirmar({ tipo: "todas" })} className="mt-4 min-h-11 w-full rounded-xl border-red-200 text-red-700 hover:bg-red-50 sm:w-auto">
          <ShieldCheck className="size-4" aria-hidden="true" />Cerrar sesión en todos mis dispositivos
        </Button>
      </section>

      <Confirmar
        abierto={confirmar?.tipo === "passkey"}
        titulo={`¿Quitar «${confirmar?.x?.nombre ?? ""}»?`}
        texto="Ya no podrás entrar con ese dispositivo sin contraseña y se cerrarán las sesiones que se abrieron con él."
        accion="Quitar"
        onCerrar={() => setConfirmar(null)}
        onConfirmar={() => { const x = confirmar.x; setConfirmar(null); void quitar(x); }}
      />
      <Confirmar
        abierto={confirmar?.tipo === "sesion"}
        titulo={`¿Cerrar la sesión en ${confirmar?.x?.dispositivo ?? "ese dispositivo"}?`}
        texto="Ese dispositivo tendrá que volver a entrar."
        accion="Cerrar sesión"
        onCerrar={() => setConfirmar(null)}
        onConfirmar={() => { const x = confirmar.x; setConfirmar(null); void cerrarUna(x); }}
      />
      <Confirmar
        abierto={confirmar?.tipo === "todas"}
        titulo="¿Cerrar sesión en todos tus dispositivos?"
        texto="Se cerrarán todas tus sesiones, incluida esta. Tendrás que volver a entrar en cada dispositivo."
        accion="Cerrar todas"
        onCerrar={() => setConfirmar(null)}
        onConfirmar={() => { setConfirmar(null); void cerrarTodas(); }}
      />
    </div>
  );
}
