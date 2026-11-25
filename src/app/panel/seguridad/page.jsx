"use client";
// Seguridad: dispositivos y Face ID (RH, dueño y usuarios con acceso). Ver docs/passkeys-sesiones.md.
import { ShieldCheck } from "lucide-react";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import SeguridadDispositivos from "@/components/seguridad/SeguridadDispositivos";

export default function PaginaSeguridad() {
  return (
    <div className="p-1">
      <SeguridadDispositivos
        encabezado={<EncabezadoPagina icono={ShieldCheck} titulo="Seguridad: dispositivos y Face ID" subtitulo="Entra sin contraseña y revisa dónde está abierta tu cuenta" />}
      />
    </div>
  );
}
