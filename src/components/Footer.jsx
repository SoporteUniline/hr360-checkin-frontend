import Link from "next/link";
import Image from "next/image";
import React from "react";

export default function Footer() {
  return (
    <div className="flex justify-center items-center flex-col bg-linear-to-r from-(--adamia-blue) to-(--adamia-purple) text-white py-10">
      <div>
        <div className="flex justify-center">
          <Image
            alt="ADAMIA"
            src="/assets/adamia.png"
            width={180}
            height={60}
            className="h-12 w-auto"
          />
        </div>
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
          <p className="font-bold">Sobre ADAMIA</p>
          <p className="text-sm mt-1 text-white/90">
            ADAMIA es la plataforma lider en gestion de capital humano, disenada
            para optimizar procesos y mejorar la experiencia de tus
            colaboradores.
          </p>
        </div>
        <div>
          <p className="font-bold">Enlaces</p>
          <div className="flex flex-col mt-1 text-sm gap-2">
            <Link
              href="/quienes-somos"
              className="hover:underline text-white/90 hover:text-white"
            >
              Quiénes Somos
            </Link>
            <Link
              href="/terminos-condiciones"
              className="hover:underline text-white/90 hover:text-white"
            >
              Términos y Condiciones
            </Link>
            <Link
              href="/aviso-privacidad"
              className="hover:underline text-white/90 hover:text-white"
            >
              Aviso de Privacidad
            </Link>
          </div>
        </div>
        <div>
          <p className="font-bold">contacto</p>
          <div className="mt-1 text-sm leading-loose text-white/90">
            <p>Email: sistema@adamia.mx</p>
            <p>Tel: +52 317 128 8029</p>
            <p>Autlán de Navarro, Jal. México</p>
          </div>
        </div>
      </div>

      <p className="text-xs mt-4 text-white/90">
        © 2025 ADAMIA. Todos los derechos reservados.
      </p>
    </div>
  );
}
