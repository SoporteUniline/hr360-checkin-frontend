"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CommandPalette } from "@/components/CommandPalette";
import FaceApiPreloader from "@/components/FaceApiPreloader";
import { useNativeBackButton } from "@/hooks/Capacitor/useNativeBackButton";
import OfflineExperience from '@/components/OfflineExperience';
import FaceReferenceSync from '@/components/Clock/FaceReferenceSync';

export function ClientProviders({ children }) {
  useNativeBackButton();

  return (
    <AuthProvider>
      <OfflineExperience />
      <FaceReferenceSync />
      <FaceApiPreloader />
      {children}
      <CommandPalette />
    </AuthProvider>
  );
}
