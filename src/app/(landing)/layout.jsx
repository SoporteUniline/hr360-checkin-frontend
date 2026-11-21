import { Outfit } from "next/font/google";

// Layout de la página de inicio ("/").
// - No usa el layout de `(public)` (Navbar/Footer): la página trae su propio encabezado y pie.
// - Agrega Outfit (títulos) a Inter, que ya carga `src/app/layout.jsx`.
const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-outfit", display: "swap" });

export default function LandingLayout({ children }) {
  return <div className={outfit.variable}>{children}</div>;
}
