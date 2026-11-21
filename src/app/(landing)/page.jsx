import LandingHome from "@/components/landing/home/LandingHome";
import AdamiaChatWidget from "@/components/landing/AdamiaChatWidget";

// El asistente comercial va fuera de .lh para que los estilos de la página y los del chat no se mezclen.
export default function LandingHomePage() {
  return (
    <>
      <LandingHome />
      <AdamiaChatWidget />
    </>
  );
}
