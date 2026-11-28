import localFont from "next/font/local";

// Letras de ADAMIA guardadas en el proyecto: antes se descargaban de Google Fonts al construir y,
// cuando Google no respondía, el despliegue fallaba («An error occurred in `next/font`»).
// Versiones variables, subconjunto latino, licencia SIL Open Font License 1.1 (ver README.md de esta carpeta).
//
// (28/11/2026) La letra oficial pasó de Inter a Plus Jakarta Sans (el dueño aprobó el mockup v3 «con Plus Jakarta Sans
// en todo ADAMIA»). Se guarda aquí igual que Inter (no con next/font/google) para no volver a depender de Google al
// construir. La variable CSS ahora es neutra, --font-adamia: si mañana cambia la letra, solo se cambia este archivo.
// Uso: en src/app/layout.jsx (`plusJakartaSans.variable` en el <body>) y en CSS `font-family: var(--font-adamia)`.
export const plusJakartaSans = localFont({
  src: "./plus-jakarta-sans-latin-var.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-adamia",
  display: "swap",
});

export const outfit = localFont({
  src: "./outfit-latin-var.woff2",
  weight: "500 800",
  style: "normal",
  variable: "--font-outfit",
  display: "swap",
});
