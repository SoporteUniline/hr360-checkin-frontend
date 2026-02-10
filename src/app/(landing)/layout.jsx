"use client";

// Layout dedicado para la landing (homepage "/").
// Relación:
// - Evita reutilizar el layout de `(public)` (Navbar/Footer) para respetar el diseño de `Landing.txt`.
// - Mantiene el `RootLayout` principal (`src/app/layout.jsx`) para fuentes, AuthProvider y scripts globales.
export default function LandingLayout({ children }) {
  return <>{children}</>;
}

