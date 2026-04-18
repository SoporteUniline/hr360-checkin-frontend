"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CommandPalette } from "@/components/CommandPalette";

export function ClientProviders({ children }) {
  return (
    <AuthProvider>
      {children}
      <CommandPalette />
    </AuthProvider>
  );
}
