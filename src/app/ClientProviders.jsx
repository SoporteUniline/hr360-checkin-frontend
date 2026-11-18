"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CommandPalette } from "@/components/CommandPalette";
import FaceApiPreloader from "@/components/FaceApiPreloader";
import DiagnosticoReloj from "@/components/DiagnosticoReloj";
import RetireOfflineWorker from "@/components/RetireOfflineWorker";
import { useNativeBackButton } from "@/hooks/Capacitor/useNativeBackButton";

export function ClientProviders({ children }) {
  useNativeBackButton();

  return (
    <AuthProvider>
      <RetireOfflineWorker />
      {/* Antes de la precarga facial para medirla desde el inicio. */}
      <DiagnosticoReloj />
      <FaceApiPreloader />
      {children}
      <CommandPalette />
    </AuthProvider>
  );
}
