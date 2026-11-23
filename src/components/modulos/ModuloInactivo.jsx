"use client";
// Aviso «Este módulo no está activo para tu empresa» (03/12/2026). Lo usan la puerta de rutas (GuardaModulo) y Tareas.
// RH / dueño: botón a Ajustes → Módulos (y, si se pasa alActivar, «Activar» ahí mismo). Sin derecho: Contratar.
// Empleado: solo el aviso.
import Link from "next/link";
import { Lock, Settings2, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { enlaceWhatsApp } from "@/lib/popups/reglas.mjs";
import { textoContratar } from "@/lib/modulos/menu.mjs";

const boton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold";

export default function ModuloInactivo({ modulo, sinDerecho = false, alActivar = null, activando = false }) {
  const { dataUser } = useAuth();
  const esRH = dataUser && dataUser.tipo_usuario !== "Empleado";
  const nombre = modulo?.nombre ?? "Este módulo";
  return (
    <section role="status" aria-live="polite" data-modulo-inactivo={modulo?.clave ?? ""} className="mx-auto my-6 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500"><Lock className="size-5" aria-hidden="true" /></span>
      <h1 className="mt-3 text-lg font-bold text-slate-900">Este módulo no está activo para tu empresa</h1>
      <p className="mt-1 text-sm text-slate-600">
        <strong>{nombre}</strong>{modulo?.descripcion ? `: ${modulo.descripcion}` : "."}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {esRH
          ? sinDerecho ? "Tu plan no lo incluye. Puedes contratarlo y después prenderlo." : "Se puede prender en Módulos. Tus datos no se borraron: al prenderlo todo sigue ahí."
          : "Si lo necesitas, pídele a Recursos Humanos que lo active."}
      </p>
      {esRH ? (
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          {alActivar && !sinDerecho ? (
            <button type="button" className={`${boton} bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-60`} disabled={activando} onClick={alActivar}>
              {activando ? "Activando…" : `Activar ${nombre}`}
            </button>
          ) : null}
          {sinDerecho ? (
            <a className={`${boton} bg-emerald-600 text-white hover:bg-emerald-700`} href={enlaceWhatsApp(textoContratar(nombre))} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" aria-hidden="true" />Contratar
            </a>
          ) : null}
          <Link href="/panel/modulos" className={`${boton} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
            <Settings2 className="size-4" aria-hidden="true" />Ir a Módulos
          </Link>
        </div>
      ) : null}
    </section>
  );
}
