"use client";
import { Package, ClipboardCheck, LogOut, UsersRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MenuLink, cardClass } from "@/components/empleado/shared";
export default function EmployeeSpace() {
  const { dataUser, logout } = useAuth();
  return <div className="space-y-5"><h1 className="text-3xl font-bold tracking-tight">Mi espacio</h1><section className={cardClass}><p className="font-semibold">{dataUser?.nombre}</p><p className="mt-1 break-words text-sm text-slate-500">{dataUser?.correo || dataUser?.email}</p></section>
    <div className="space-y-3"><MenuLink href="/empleado/panel/mis-recursos" icon={Package} title="Mis activos y uniformes" description="Consulta tus entregas y resguardos" />
      <MenuLink href="/empleado/panel/evaluaciones" icon={ClipboardCheck} title="Mis evaluaciones" description="Evaluaciones, resultados y seguimiento" />
      <MenuLink href="/empleado/panel/solicitudes-equipo" icon={UsersRound} title="Solicitudes de mi equipo" description="Si tienes colaboradores asignados" />
    </div><button onClick={logout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border bg-white font-medium text-red-700"><LogOut className="size-4" />Cerrar sesión</button>
  </div>;
}
