// app/layout.jsx
// Tipografía oficial ADAMIA: Plus Jakarta Sans (28/11/2026, antes Inter). Variable CSS neutra: --font-adamia (src/fonts).
import { plusJakartaSans } from "@/fonts";
import "./globals.css";
import { ClientProviders } from "@/app/ClientProviders";
import GlobalThirdPartyScripts from "@/components/GlobalThirdPartyScripts";
import { NATIVE_PREPAINT_SCRIPT } from "@/lib/native-app";


export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

export const metadata = {
  metadataBase: new URL("https://adamia.mx"),
  title: {
    default: "ADAMIA | Plataforma Empresarial de Recursos Humanos",
    template: "%s | ADAMIA",
  },
  description:
    "ADAMIA es una plataforma empresarial de Recursos Humanos para control de asistencia biométrico, gestión de personal, incidencias y reportes en tiempo real.",
  // (27/11/2026) Al instalarla (Android «Instalar app», iPhone «Agregar a inicio») se llama «Adamia» y lleva el logo.
  applicationName: "Adamia",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Adamia", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/assets/icons/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "ADAMIA | Plataforma Empresarial de Recursos Humanos",
    description:
      "Control de asistencia biométrico, gestión de personal y reportes en tiempo real.",
    url: "https://adamia.mx",
    siteName: "ADAMIA",
    locale: "es_MX",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: NATIVE_PREPAINT_SCRIPT }}
        />

        <meta
          name="facebook-domain-verification"
          content="3tj0omr2az8z10dvvw73oa198umf0u"
        />
      </head>

      <body
        className={`${plusJakartaSans.variable} antialiased`}
        style={{ fontFamily: "var(--font-adamia)" }}
      >
        <ClientProviders>{children}</ClientProviders>

        <GlobalThirdPartyScripts />
      </body>
    </html>
  );
}
