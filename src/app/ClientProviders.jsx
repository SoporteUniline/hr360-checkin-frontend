"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CommandPalette } from "@/components/CommandPalette";
import FaceApiPreloader from "@/components/FaceApiPreloader";
import DiagnosticoReloj from "@/components/DiagnosticoReloj";
import { useNativeBackButton } from "@/hooks/Capacitor/useNativeBackButton";
import OfflineExperience from '@/components/OfflineExperience';
import FaceReferenceSync from '@/components/Clock/FaceReferenceSync';

export function ClientProviders({ children }) {
  useNativeBackButton();

  return (
    <AuthProvider>
      {/* Antes de la precarga facial para medirla desde el inicio. */}
      <DiagnosticoReloj />
      <OfflineExperience />
      <FaceReferenceSync />
      <FaceApiPreloader />
      {children}
      <CommandPalette />
    </AuthProvider>
  );
}
