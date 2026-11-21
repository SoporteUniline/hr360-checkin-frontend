/* eslint-disable @next/next/no-img-element -- ícono de la marca (png pequeño) */
import Link from "next/link";

// Pie del sitio público (inicio y blog).
export default function SitioPie() {
  return (
    <footer>
      <div className="wrap">
        <Link className="brand" href="/" aria-label="ADAMIA, inicio">
          <img src="/landing/adamia-a.png" alt="" width={24} height={22} style={{ height: 22 }} />
          <span style={{ fontSize: "1rem" }}>ADAMIA</span>
        </Link>
        <nav aria-label="Enlaces">
          <Link href="/blog">Blog</Link>
          <Link href="/contacto">Contacto</Link>
          <Link href="/aviso-privacidad">Aviso de privacidad</Link>
        </nav>
      </div>
    </footer>
  );
}
