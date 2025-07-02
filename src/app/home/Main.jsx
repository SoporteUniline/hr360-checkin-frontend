"use client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

const steps = [
  {
    title: "1. Crea una cuenta gratis",
    description:
      "Solo necesitas tu correo electrónico para comenzar. Regístrate sin costo y empieza a publicar vacantes.",
  },
  {
    title: "2. Crea tu publicación",
    description:
      "Agrega título, descripción, ubicación y requisitos. Personaliza tu anuncio para atraer al mejor talento.",
  },
  {
    title: "3. Publica y recibe postulaciones",
    description:
      "Activa tu vacante y empieza a recibir candidatos de inmediato gracias a nuestra red profesional.",
  },
];

export default function Main() {
  const router = useRouter();

  return (
    <main className="w-full bg-gray-100">
      <header className="h-[50vh] w-full relative">
        <Image
          alt="BackgroundHR"
          src="/assets/inicio-img.jpeg"
          fill
          className="object-cover"
          //priority
        />
        <div className="absolute inset-0 flex items-center justify-center flex-col bg-slate-700/80">
          <h1 className="text-white text-3xl font-bold">
            Convierte tu Organización en un Imán de Talento
          </h1>
          <p className="text-white text-md mt-2">
            Empresas, ayuntamientos y universidades utilizan HR360 para publicar
            sus vacantes, llegar al mejor talento y optimizar su proceso de
            selección.
          </p>
          <Button
            className="mt-7 bg-slate-700 font-semibold"
            onClick={() => router.push("/alta-empresas")}
          >
            Publicar un empleo
          </Button>
        </div>
      </header>

      <section className="p-5 py-20 md:px-10 lg:px-30 xl:px-40">
        <h2 className="text-center text-3xl font-extrabold text-slate-700">
          Cómo Funciona HR360
        </h2>
        <p className="pt-5 font-light text-md text-center">
          Publicar empleos y encontrar talento nunca fue tan fácil. Sigue estos
          simples pasos para comenzar.
        </p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 min-h-50">
          {steps.map(({ title, description }, i) => (
            <article
              key={i}
              className="p-7 border-1 border-gray-100 rounded-md shadow-lg hover:shadow-xl"
            >
              <p className="text-center text-xl font-bold text-slate-700">
                {title}
              </p>
              <p className="mt-3 text-gray-600 text-center text-sm">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="p-5 py-20 md:px-10 lg:px-30 xl:px-40">
        <h2 className="text-center text-3xl font-extrabold text-slate-700">
          Soluciones para tu Organización
        </h2>
        <p className="pt-5 font-light text-md text-center">
          Sea cual sea tu sector, en HR360 encontrarás la herramienta perfecta
          para atraer y gestionar talento.
        </p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 min-h-50">
          <article className="p-7 border-1 border-gray-100 rounded-md shadow-lg hover:shadow-xl transition transform hover:-translate-y-1.5 duration-300">
            <p className="text-center text-xl font-bold text-slate-700">
              🏢 Para Empresas
            </p>
            <p className="mt-3 text-gray-600 text-center text-sm">
              Publica cien vacantes simultáneas, segmenta candidatos por
              competencias y acelera tu proceso de contratación.
            </p>
          </article>
          <article className="p-7 border-1 border-gray-100 rounded-md shadow-lg hover:shadow-xl transition transform hover:-translate-y-1.5 duration-300">
            <p className="text-center text-xl font-bold text-slate-700">
              🏛️ Para Ayuntamientos
            </p>
            <p className="mt-3 text-gray-600 text-center text-sm">
              Convoca y filtra postulantes para servicios públicos, gestiona
              convocatorias ciudadanas y transparencia en tiempo real.
            </p>
          </article>
          <article className="p-7 border-1 border-gray-100 rounded-md shadow-lg hover:shadow-xl transition transform hover:-translate-y-1.5 duration-300">
            <p className="text-center text-xl font-bold text-slate-700">
              🎓 Para Universidades
            </p>
            <p className="mt-3 text-gray-600 text-center text-sm">
              Difunde prácticas profesionales y empleos de egresados, centraliza
              solicitudes y conecta con la bolsa de trabajo académica.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
