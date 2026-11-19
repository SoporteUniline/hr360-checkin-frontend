"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CommandPalette } from "@/components/CommandPalette";
import DiagnosticoReloj from "@/components/DiagnosticoReloj";
import FaceApiPreloader from "@/components/FaceApiPreloader";
import RetireOfflineWorker from "@/components/RetireOfflineWorker";
import { useNativeBackButton } from "@/hooks/Capacitor/useNativeBackButton";

export function ClientProviders({ children }) {
  useNativeBackButton();

  return (
    <AuthProvider>
      <RetireOfflineWorker />
      <DiagnosticoReloj />
      <FaceApiPreloader />
      {children}
      <CommandPalette />
    </AuthProvider>
  );
}
