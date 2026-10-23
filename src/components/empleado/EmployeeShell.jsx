"use client";
import Link from "next/link";
import { SWRConfig } from "swr";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, Clock3, FileText, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const root = "/empleado/panel";
const items = [
  ["Inicio", `${root}/inicio`, Home],
  ["Asistencia", `${root}/asistencias`, Clock3],
  ["Solicitudes", `${root}/solicitudes`, FileText],
  ["Mi espacio", `${root}/mi-espacio`, UserRound],
];
export default function EmployeeShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dataUser, isAuthChecked, isLoggedIn } = useAuth();
  useEffect(() => {
    if (isAuthChecked && !isLoggedIn) router.replace("/login");
  }, [isAuthChecked, isLoggedIn, router]);
  if (!isAuthChecked || !isLoggedIn) return <p role="status" className="p-8 text-center">Cargando tu espacio…</p>;
  if (dataUser?.tipo_usuario !== "Empleado") return <div className="p-8">Este espacio es para colaboradores. <Link className="text-blue-600 underline" href="/dashboard">Volver a mi panel</Link></div>;
  return (
    <SWRConfig key={`${dataUser.id_usuario}:${dataUser.id_empleado}:${dataUser.id_empresa}`} value={{ provider: () => new Map() }}>
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-100 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href={`${root}/inicio`} aria-label="ADAMIA, inicio"><img src="/assets/logo.png" alt="ADAMIA" className="h-8 w-auto" /></Link>
          <Link href={`${root}/mi-espacio`} aria-label="Mi perfil" className="grid size-11 place-items-center rounded-full bg-blue-50 font-semibold text-blue-700">{(dataUser?.nombre || "Mi").slice(0, 2).toUpperCase()}</Link>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-3xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6">{children}</main>
      <nav aria-label="Navegación del colaborador" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {items.map(([label, href, Icon], i) => {
            const active = pathname === href || (i === 3 && !items.slice(0, 3).some(([, path]) => pathname === path));
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-blue-700" : "text-slate-500"}`}><Icon className="size-5" /><span>{label}</span></Link>;
          })}
        </div>
      </nav>
    </div>
    </SWRConfig>
  );
}
