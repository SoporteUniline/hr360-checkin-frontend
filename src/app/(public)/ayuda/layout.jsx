import "@/components/landing/home/landing-home.css";
import "@/components/ayuda/ayuda.css";
import "@/components/ayuda/ayuda-impresion.css";

// Centro de ayuda público (/ayuda): mismo encabezado y pie del sitio (layout de (public)); estilos bajo .lh.ay.
// Páginas estáticas generadas en el build desde src/content/ayuda (docs/centro-de-ayuda.md).
export default function LayoutAyuda({ children }) {
  return <div className="lh ay">{children}</div>;
}
