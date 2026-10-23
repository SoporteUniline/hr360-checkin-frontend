"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CommandPalette } from "@/components/CommandPalette";
import { useNativeBackButton } from "@/hooks/Capacitor/useNativeBackButton";

export function ClientProviders({ children }) {
  useNativeBackButton();

  return (
    <AuthProvider>
      {children}
      <CommandPalette />
    </AuthProvider>
  );
}
