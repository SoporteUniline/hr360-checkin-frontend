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

        {/* Script de Google Maps */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
        />

        {/* Meta Pixel Code */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');

            fbq('init', '2003925690497108');
            fbq('track', 'PageView');
          `}
        </Script>
        {/* End Meta Pixel Code */}
      </head>

      <body
        className={`${inter.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <ClientProviders>{children}</ClientProviders>

        {/* Meta Pixel NoScript */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=2003925690497108&ev=PageView&noscript=1"
          />
        </noscript>
      </body>
    </html>
  );
}
