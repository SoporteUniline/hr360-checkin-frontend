import localFont from "next/font/local";

// Letras de ADAMIA guardadas en el proyecto: antes se descargaban de Google Fonts al construir y,
// cuando Google no respondía, el despliegue fallaba («An error occurred in `next/font`»).
// Versiones variables, subconjunto latino, licencia SIL Open Font License 1.1 (ver README.md de esta carpeta).
export const inter = localFont({
  src: "./inter-latin-var.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
});

export const outfit = localFont({
  src: "./outfit-latin-var.woff2",
  weight: "500 800",
  style: "normal",
  variable: "--font-outfit",
  display: "swap",
});
