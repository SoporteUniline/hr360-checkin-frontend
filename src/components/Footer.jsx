import Link from "next/link";
import React from "react";

export default function Footer() {
  return (
    <div className="flex justify-center items-center flex-col bg-slate-700 text-gray-100 py-10">
      <div>
        <h1 className="font-extrabold text-center text-xl">HR360</h1>
        <h2 className="font-extrabold text-center">
          Plataforma Inteligente de Reclutamiento{" "}
        </h2>
        <h2 className="text-center">
          Conecta tu empresa con el mejor talento de forma fácil, rápida y
          profesional.
        </h2>
      </div>
      <div className="grid grid-cols-1 w-full md:grid-cols-3 p-3 mt-3 md:px-10 lg:px-30 xl:px-60 space-x-5 space-y-3">
        <div>
          <p className="font-bold">Sobre HR360</p>
          <p className="text-sm mt-1">
            HR360 es la plataforma líder en gestión de capital humano, diseñada
            para optimizar procesos y mejorar la experiencia de tus
            colaboradores.
          </p>
        </div>
        <div>
          <p className="font-bold">Enlaces</p>
          <div className="flex flex-col mt-1 text-sm gap-2">
            <Link href="/quienes-somos">Quiénes Somos </Link>
            <Link href="/terminos-condiciones">Términos y Condiciones</Link>
            <Link href="/aviso-privacidad">Aviso de Privacidad</Link>
          </div>
        </div>
        <div>
          <p className="font-bold">contacto</p>
          <div className="mt-1 text-sm leading-loose">
            <p>Email: soporte@hr360.mx</p>
            <p>Tel: +52 55 1234 5678</p>
            <p>Autlán de Navarro, Jal. México</p>
          </div>
        </div>
      </div>

      <p className="text-xs mt-4">
        © 2025 HR360. Todos los derechos reservados.
      </p>
    </div>
  );
}
