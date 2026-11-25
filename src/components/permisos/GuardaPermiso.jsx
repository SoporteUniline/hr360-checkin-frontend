"use client";
// Puerta de rutas por permiso del usuario con acceso (16/12/2026). Ver src/lib/permisos/permisos.mjs.
// - Sin acceso al módulo (o sección solo del dueño): «No tienes acceso a este módulo» + «Pídeselo al dueño…».
// - Solo «Ver»: aviso arriba y se ocultan los botones que cambian datos (Guardar, Nuevo, Eliminar…) dentro de la
//   pantalla. El servidor responde 403 PERMISO_SOLO_VER aunque alguno quedara visible.
// El dueño, el Admin y el empleado pasan sin cambios.
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Eye, Home, ShieldOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { esBotonDeEdicion, MENSAJE_SOLO_DUENO, MENSAJE_SOLO_VER, nivelEnRuta } from "@/lib/permisos/permisos.mjs";

export function SinPermiso({ soloDueno = false }) {
  return (
    <section role="status" aria-live="polite" data-sin-permiso="" className="mx-auto my-6 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500"><ShieldOff className="size-5" aria-hidden="true" /></span>
      <h1 className="mt-3 text-lg font-bold text-slate-900">{soloDueno ? "Solo para el dueño de la cuenta" : "No tienes acceso a este módulo"}</h1>
      <p className="mt-1 text-sm text-slate-600">{soloDueno ? MENSAJE_SOLO_DUENO : "Pídeselo al dueño de la cuenta para que te dé permiso."}</p>
      <div className="mt-5 flex justify-center">
        <Link href="/panel/dashboard" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Home className="size-4" aria-hidden="true" />Ir al inicio
        </Link>
      </div>
    </section>
  );
}

const SELECTOR = "button, [role='button'], a[data-accion]";
const textoDe = (el) => el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent;

function SoloVer({ children }) {
  const raiz = useRef(null);
  useEffect(() => {
    const nodo = raiz.current;
    if (!nodo || typeof MutationObserver === "undefined") return undefined;
    let pendiente = 0;
    const revisar = () => {
      pendiente = 0;
      for (const el of nodo.querySelectorAll(SELECTOR)) {
        if (el.hasAttribute("data-oculto-por-permiso") || el.closest("[data-permiso='libre']")) continue;
        if (esBotonDeEdicion(textoDe(el))) {
          el.setAttribute("data-oculto-por-permiso", "");
          el.style.display = "none";
        }
      }
    };
    revisar();
    const observador = new MutationObserver(() => { if (!pendiente) pendiente = requestAnimationFrame(revisar); });
    observador.observe(nodo, { childList: true, subtree: true });
    return () => { observador.disconnect(); if (pendiente) cancelAnimationFrame(pendiente); };
  }, []);
  return (
    <>
      <p role="note" data-solo-ver="" className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
        <Eye className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{MENSAJE_SOLO_VER}
      </p>
      <div ref={raiz} className="contents">{children}</div>
    </>
  );
}

export default function GuardaPermiso({ children }) {
  const pathname = usePathname();
  const { dataUser, permisosSesion } = useAuth();
  // Mientras se verifica la sesión no se sabe si es un acceso: se muestra como antes (el servidor ya responde 403).
  if (!dataUser?.esAcceso || !permisosSesion) return children;
  const nivel = nivelEnRuta(pathname, permisosSesion);
  if (nivel === "dueno") return <SinPermiso soloDueno />;
  if (nivel === "sin_acceso") return <SinPermiso />;
  if (nivel === "ver") return <SoloVer key={pathname}>{children}</SoloVer>;
  return children;
}
