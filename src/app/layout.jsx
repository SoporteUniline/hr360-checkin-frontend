// app/layout.jsx
// Tipografía oficial ADAMIA: Inter
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/app/ClientProviders";
import GlobalThirdPartyScripts from "@/components/GlobalThirdPartyScripts";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://adamia.mx"),
  title: {
    default: "ADAMIA | Plataforma Empresarial de Recursos Humanos",
    template: "%s | ADAMIA",
  },
  description:
    "ADAMIA es una plataforma empresarial de Recursos Humanos para control de asistencia biométrico, gestión de personal, incidencias y reportes en tiempo real.",
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
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" />

        <meta
          name="facebook-domain-verification"
          content="3tj0omr2az8z10dvvw73oa198umf0u"
        />
      </head>

      <body
        className={`${inter.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <ClientProviders>{children}</ClientProviders>

        <GlobalThirdPartyScripts />
      </body>
    </html>
  );
}
