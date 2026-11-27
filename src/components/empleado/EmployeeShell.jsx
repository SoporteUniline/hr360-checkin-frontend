"use client";
import Link from "next/link";
import { SWRConfig } from "swr";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, Clock3, FileText, UserRound, ListChecks, Newspaper } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import GuardaModulo from "@/components/modulos/GuardaModulo";
import { useModulosActivos } from "@/components/modulos/useModulos";
import { rutaPermitida } from "@/lib/modulos/menu.mjs";
import { urlLogin } from "@/lib/destinoLogin.mjs";
import { ContadorEncuestas, useMisEncuestas } from "@/components/clima/AvisoEncuestas";
import CampanaAvisos from "@/components/avisos/CampanaAvisos";
import AvisoEmergente from "@/components/comunicados/AvisoEmergente";
import BotonAyuda from "@/components/ayuda/BotonAyuda";

const root = "/empleado/panel";
const items = [
  ["Inicio", `${root}/inicio`, Home],
  ["Muro", `${root}/muro`, Newspaper], // (27/11/2026) Centro de comunicados (módulo «comunicados»)
  ["Asistencia", `${root}/asistencias`, Clock3],
  ["Tareas", `${root}/tareas`, ListChecks], // (23/11/2026) Tareas y checklists del empleado
  ["Solicitudes", `${root}/solicitudes`, FileText],
  ["Mi espacio", `${root}/mi-espacio`, UserRound],
];
export default function EmployeeShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dataUser, isAuthChecked, isLoggedIn } = useAuth();
  // Módulos por empresa: la barra solo trae lo que su empresa tiene activo (Tareas, Solicitudes).
  const { activos, opciones } = useModulosActivos();
  const visibles = items.filter(([, href]) => rutaPermitida(href, activos, opciones));
  // Sin sesión: al login recordando a dónde iba (p. ej. una encuesta), para volver ahí al entrar.
  useEffect(() => {
    if (isAuthChecked && !isLoggedIn) router.replace(urlLogin(`${window.location.pathname}${window.location.search}`));
  }, [isAuthChecked, isLoggedIn, router]);
  if (!isAuthChecked || !isLoggedIn) return <p role="status" className="p-8 text-center">Cargando tu espacio…</p>;
  if (dataUser?.tipo_usuario !== "Empleado") return <div className="p-8">Este espacio es para colaboradores. <Link className="text-blue-600 underline" href="/dashboard">Volver a mi panel</Link></div>;
  return (
    <SWRConfig key={`${dataUser.id_usuario}:${dataUser.id_empleado}:${dataUser.id_empresa}`} value={{ provider: () => new Map() }}>
    <BarraEmpleado pathname={pathname} visibles={visibles} dataUser={dataUser}>{children}</BarraEmpleado>
    </SWRConfig>
  );
}

// Dentro del SWRConfig de la sesión: el número de encuestas por contestar va en «Mi espacio» (ahí está «Encuestas»).
function BarraEmpleado({ pathname, visibles, dataUser, children }) {
  const { pendientes } = useMisEncuestas();
  return (
    <div className="min-h-dvh bg-white text-[#080d36]">
      <header className="bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-20 max-w-3xl items-center justify-between px-5">
          <Link href={`${root}/inicio`} aria-label="ADAMIA, inicio"><img src="/assets/logo.png" alt="ADAMIA" className="h-8 w-auto" /></Link>
          {/* Campana de avisos: solo si es jefe (cumpleaños y aniversarios de su equipo). */}
          {/* (27/11/2026) «?»: la guía de esta pantalla del Centro de ayuda. */}
          <div className="flex items-center gap-2">
            <BotonAyuda variante="empleado" />
            <CampanaAvisos variante="empleado" />
            <Link href={`${root}/mi-espacio`} aria-label="Mi perfil" className="grid size-11 place-items-center rounded-full bg-blue-50 font-semibold text-blue-700">{(dataUser?.nombre || "Mi").slice(0, 2).toUpperCase()}</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-3xl px-5 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6"><GuardaModulo>{children}</GuardaModulo></main>
      {/* Centro de comunicados: aviso emergente pendiente (solo se cierra con sus botones). */}
      <AvisoEmergente modo="empleado" />
      <nav aria-label="Navegación del colaborador" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-3xl" style={{ gridTemplateColumns: `repeat(${visibles.length}, minmax(0, 1fr))` }}>
          {visibles.map(([label, href, Icon], i) => {
            const coincide = (path) => pathname === path || (path === `${root}/muro` && pathname?.startsWith(`${root}/muro/`));
            const active = coincide(href) || (i === visibles.length - 1 && !visibles.slice(0, -1).some(([, path]) => coincide(path)));
            const contador = href === `${root}/mi-espacio` ? pendientes : 0;
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} aria-label={contador ? `${label}, ${contador} ${contador === 1 ? "encuesta" : "encuestas"} por contestar` : undefined} className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-blue-700" : "text-slate-500"}`}><span className="relative"><Icon className={`size-5 ${active ? (Icon === ListChecks ? "stroke-blue-700" : "fill-blue-600 stroke-white") : ""}`} />{contador ? <ContadorEncuestas n={contador} className="absolute -right-3 -top-2 ring-2 ring-white" /> : null}</span><span>{label}</span></Link>;
          })}
        </div>
      </nav>
    </div>
  );
}
