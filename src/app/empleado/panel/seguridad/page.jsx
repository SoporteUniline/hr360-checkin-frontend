"use client";
// Mi espacio → Seguridad: dispositivos y Face ID. Ver docs/passkeys-sesiones.md.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SeguridadDispositivos from "@/components/seguridad/SeguridadDispositivos";

export default function SeguridadEmpleado() {
  return (
    <SeguridadDispositivos
      encabezado={
        <div className="space-y-2">
          <Link href="/empleado/panel/mi-espacio" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-700"><ArrowLeft className="size-4" aria-hidden="true" />Mi espacio</Link>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Seguridad y Face ID</h1>
          <p className="text-sm text-slate-500">Entra sin contraseña y revisa dónde está abierta tu cuenta.</p>
        </div>
      }
    />
  );
}
