// app/layout.jsx
// Tipografía oficial ADAMIA: Inter
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/app/ClientProviders";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Adamia",
  description:
    "En Adamia, transformamos la forma en que las empresas encuentran talento: sin vacantes falsas, sin procesos improvisados, sin riesgos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        {/* Script de Google Maps sin event handlers */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${inter.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
