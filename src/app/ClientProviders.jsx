"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CommandPalette } from "@/components/CommandPalette";
import FaceApiPreloader from "@/components/FaceApiPreloader";
import { useNativeBackButton } from "@/hooks/Capacitor/useNativeBackButton";
import OfflineExperience from '@/components/OfflineExperience';

export function ClientProviders({ children }) {
  useNativeBackButton();

  return (
    <AuthProvider>
      <OfflineExperience />
      <FaceApiPreloader />
      {children}
      <CommandPalette />
    </AuthProvider>
  );
}
