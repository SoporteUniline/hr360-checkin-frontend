"use client";

/* eslint-disable @next/next/no-img-element -- ícono de la marca (png pequeño) */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU } from "./enlacesSitio";
import "./landing-home.css";

// Encabezado de todo el sitio público (inicio, blog, funciones, cotizar, contratar…). Estilos bajo .lh.
// En celular el menú se abre con el botón ☰.
export default function SitioEncabezado() {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  useEffect(() => setAbierto(false), [ruta]);
  useEffect(() => {
    if (!abierto) return undefined;
    const tecla = (e) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto]);
  const actual = (href) => (href !== "/" && !href.startsWith("/#") && ruta?.startsWith(href) ? "page" : undefined);

  return (
    <header className="top">
      <div className="wrap">
        <Link className="brand" href="/" aria-label="ADAMIA, inicio">
          <img src="/landing/adamia-a.png" alt="" width={30} height={28} />
          <span>ADAMIA</span>
        </Link>
        <nav className="nav" aria-label="Secciones">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} aria-current={actual(m.href)}>{m.texto}</Link>
          ))}
        </nav>
        <div className="top-actions">
          <Link className="login" href="/login">Iniciar sesión</Link>
          <Link className="btn btn-line contratar" href="/contratar-plan">Contratar</Link>
          <Link className="btn btn-primary" href="/contacto">Solicitar demo</Link>
          <button type="button" className="menu-btn" aria-expanded={abierto} aria-controls="menu-movil" aria-label={abierto ? "Cerrar menú" : "Abrir menú"} onClick={() => setAbierto((v) => !v)}>
            <span aria-hidden="true">{abierto ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {abierto ? (
        <nav id="menu-movil" className="menu-movil" aria-label="Menú">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} aria-current={actual(m.href)} onClick={() => setAbierto(false)}>{m.texto}</Link>
          ))}
          <Link href="/contratar-plan" onClick={() => setAbierto(false)}>Contratar</Link>
          <Link href="/login" onClick={() => setAbierto(false)}>Iniciar sesión</Link>
        </nav>
      ) : null}
    </header>
  );
}
