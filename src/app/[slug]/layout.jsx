"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function RootLayout({ children }) {
  return (
    <>
      {/* En celular solo el reloj: sin barra del sitio. */}
      <div className="hidden md:block"><Navbar /></div>
      <main className="md:mt-15">{children}</main>
      {/* En celular el reloj ocupa la pantalla: sin pie de página para que la cámara no se mueva. */}
      <div className="hidden md:block"><Footer /></div>
    </>
  );
}
