"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { isNativeClient } from "@/lib/native-app";
import { leerConsentimiento, EVENTO_COOKIES } from "@/lib/legal/cookies";
import { demoBasePath } from "@/lib/demo-base-path.mjs";

export default function GlobalThirdPartyScripts() {
  const pathname = usePathname();
  const [allowMetaPixel, setAllowMetaPixel] = useState(false);

  useEffect(() => {
    // En iOS/Android nativo se omite Meta Pixel para cumplir App Tracking Transparency (ATT).
    // En web, solo con el consentimiento de cookies de publicidad.
    if (demoBasePath || isNativeClient()) return undefined;
    const revisar = () => setAllowMetaPixel(leerConsentimiento() === "aceptadas");
    revisar();
    window.addEventListener(EVENTO_COOKIES, revisar);
    return () => window.removeEventListener(EVENTO_COOKIES, revisar);
  }, []);

  if (demoBasePath || pathname?.startsWith("/firmar/") || pathname?.startsWith("/reclutamiento-demo/")) {
    return null;
  }

  return (
    <>
      {/* Google Maps */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
      />

      {/* Meta Pixel (solo web) */}
      {allowMetaPixel && (
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
      )}
    </>
  );
}
