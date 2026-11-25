"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CommandPalette } from "@/components/CommandPalette";
import FaceApiPreloader from "@/components/FaceApiPreloader";
import DiagnosticoReloj from "@/components/DiagnosticoReloj";
import { useNativeBackButton } from "@/hooks/Capacitor/useNativeBackButton";
import RetireOfflineWorker from '@/components/RetireOfflineWorker';
import { CambiosPendientesProvider } from '@/components/cambios/CambiosPendientes';
import OfertaPasskey from '@/components/seguridad/OfertaPasskey';

export function ClientProviders({ children }) {
  useNativeBackButton();

  return (
    <AuthProvider>
      {/* Antes de la precarga facial para medirla desde el inicio. */}
      <DiagnosticoReloj />
      <RetireOfflineWorker />
      <FaceApiPreloader />
      {/* Guardia común de «cambios sin guardar»: cubre el panel, el menú lateral y el buscador. */}
      <CambiosPendientesProvider>
        {children}
        <CommandPalette />
        {/* «¿Activar Face ID para entrar más rápido?» justo después de entrar con contraseña. */}
        <OfertaPasskey />
      </CambiosPendientesProvider>
    </AuthProvider>
  );
}
