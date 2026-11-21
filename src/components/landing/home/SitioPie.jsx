/* eslint-disable @next/next/no-img-element -- ícono de la marca (png pequeño) */
import Link from "next/link";
import { PIE } from "./enlacesSitio";
import "./landing-home.css";

// Pie de todo el sitio público: marca en blanco sobre azul marino y todas las páginas por tema.
export default function SitioPie() {
  return (
    <footer className="pie">
      <div className="wrap pie-grid">
        <div className="pie-marca">
          <Link className="brand" href="/" aria-label="ADAMIA, inicio">
            <img src="/landing/adamia-a.png" alt="" width={30} height={28} className="logo-blanco" />
            <span>ADAMIA</span>
          </Link>
          <p>Recursos Humanos para empresas en México: asistencia, permisos, contratos y más en una sola cuenta.</p>
          <Link className="btn btn-primary" href="/contacto">Solicitar demo</Link>
        </div>
        {PIE.map((g) => (
          <nav key={g.titulo} aria-label={g.titulo}>
            <h2>{g.titulo}</h2>
            <ul>
              {g.enlaces.map((e) => (
                <li key={e.href}><Link href={e.href}>{e.texto}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="wrap pie-final">
        <span>© {new Date().getFullYear()} ADAMIA. Todos los derechos reservados.</span>
        <span><Link href="/aviso-privacidad">Aviso de privacidad</Link> · <Link href="/terminos-condiciones">Términos y condiciones</Link></span>
      </div>
    </footer>
  );
}
