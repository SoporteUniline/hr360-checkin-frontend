import LandingHome from "@/components/landing/home/LandingHome";
import MosaicoModulos from "@/components/landing/home/MosaicoModulos";
import DescargasAdamia from "@/components/landing/DescargasAdamia";
import AdamiaChatWidget from "@/components/landing/AdamiaChatWidget";
import { modulosPortada } from "@/lib/sitio/modulos";

// El mosaico de módulos y las descargas (brochure y tríptico) se arman aquí (servidor) y entran a la página como prop:
// su marcado no va en el JavaScript.
// El asistente comercial va fuera de .lh para que los estilos de la página y los del chat no se mezclen.
export default function LandingHomePage() {
  return (
    <>
      <LandingHome modulos={modulosPortada()} mosaico={<MosaicoModulos />} descargas={<DescargasAdamia />} />
      <AdamiaChatWidget />
    </>
  );
}
