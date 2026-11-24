"use client";

// «Reloj checador» en la barra superior del panel, junto a Adamia AI: solo RH y dueño, y solo si la empresa tiene el
// módulo de asistencias (el reloj es parte de él). En celular queda solo el ícono, de 44 px.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock4 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModulosActivos } from "@/components/modulos/useModulos";
import { rutaPermitida } from "@/lib/modulos/menu.mjs";
import { cn } from "@/lib/utils";
import { destinoRelojSinConexion, RUTA_RELOJ_EMPRESA, sinConexion } from "./destinoReloj";

const ROLES_RH = ["Recruiter", "User"];

export default function BotonRelojChecador() {
  const { dataUser } = useAuth();
  const pathname = usePathname();
  const { activos, opciones } = useModulosActivos();
  if (!dataUser || !ROLES_RH.includes(dataUser.tipo_usuario) || !pathname?.startsWith("/panel")) return null;
  if (!rutaPermitida(RUTA_RELOJ_EMPRESA, activos, opciones) || (activos && !activos.has("asistencias"))) return null;

  // Sin red no hay navegación del cliente: se abre el reloj descargado con una carga completa.
  const alPicar = async (e) => {
    if (!sinConexion() || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    window.location.assign(await destinoRelojSinConexion(dataUser));
  };

  return (
    <Link href={RUTA_RELOJ_EMPRESA} prefetch={false} onClick={alPicar} aria-label="Reloj checador" title="Abrir el reloj checador de la empresa"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center gap-1.5 rounded-md border border-brand/30 bg-brand/5 text-xs font-semibold text-brand",
        "hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:size-auto sm:min-h-9 sm:px-3",
      )}>
      <Clock4 aria-hidden="true" className="size-5 sm:size-3.5" />
      <span className="hidden sm:inline">Reloj checador</span>
    </Link>
  );
}
