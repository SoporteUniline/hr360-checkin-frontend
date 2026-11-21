/* eslint-disable @next/next/no-img-element -- ícono de la marca (png pequeño) */
import Link from "next/link";

// Encabezado del sitio público (inicio y blog). Los estilos viven en landing-home.css (bajo .lh).
export default function SitioEncabezado() {
  return (
    <header className="top">
      <div className="wrap">
        <Link className="brand" href="/" aria-label="ADAMIA, inicio">
          <img src="/landing/adamia-a.png" alt="" width={30} height={28} />
          <span>ADAMIA</span>
        </Link>
        <nav className="nav" aria-label="Secciones">
          <Link href="/#producto">Producto</Link>
          <Link href="/#empresa">Para tu empresa</Link>
          <Link href="/#ley">Ley 2027</Link>
          <Link href="/blog">Blog</Link>
        </nav>
        <div className="top-actions">
          <Link className="login" href="/login">Iniciar sesión</Link>
          <Link className="btn btn-primary" href="/contacto">Solicitar demo</Link>
        </div>
      </div>
    </header>
  );
}
