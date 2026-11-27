import LandingHome from "@/components/landing/home/LandingHome";
import MosaicoModulos from "@/components/landing/home/MosaicoModulos";
import AdamiaChatWidget from "@/components/landing/AdamiaChatWidget";
import { modulosPortada } from "@/lib/sitio/modulos";

// El mosaico de módulos se arma aquí (servidor) y entra a la página como prop: su marcado no va en el JavaScript.
// El asistente comercial va fuera de .lh para que los estilos de la página y los del chat no se mezclen.
export default function LandingHomePage() {
  return (
    <>
      <LandingHome modulos={modulosPortada()} mosaico={<MosaicoModulos />} />
      <AdamiaChatWidget />
    </>
  );
}
