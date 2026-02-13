"use client";
import Image from "next/image";
import React from "react";
import AltaEmpresasForm from "./AltaEmpresasForm";
import { cards1, cards2 } from "./dataMappings";

export default function AltaEmpresaPage() {
  return (
    <main className="w-full">
      <section className="h-[50vh] w-full relative">
        <Image
          alt="BackgroundHR"
          src="/assets/bg_alta-empresas.png"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center flex-col bg-gradient-to-br from-[var(--adamia-blue)]/70 to-[var(--adamia-purple)]/70">
          <h1 className="text-white text-3xl font-bold">Bienvenido a ADAMIA</h1>
          <p className="text-white/90 text-md mt-2">
            El sistema inteligente de reclutamiento para empresas modernas
          </p>
        </div>
      </section>

      <section className="p-5 py-20 md:px-10 lg:px-30 xl:px-40">
        <h2 className="text-center text-3xl font-extrabold text-[var(--adamia-text-primary)]">
          🔒 Reclutar con confianza ya no es un privilegio, es una necesidad
        </h2>
        <p className="pt-5 font-light text-md text-center text-[var(--adamia-text-secondary)]">
          En ADAMIA, transformamos la forma en que las empresas encuentran
          talento: sin vacantes falsas, sin procesos improvisados, sin riesgos.
        </p>
        <p className="pt-5 font-light text-md text-center text-[var(--adamia-text-secondary)]">
          Creamos un entorno donde{" "}
          <span className="font-bold text-[var(--adamia-text-primary)]">
            las empresas formales y los profesionales auténticos
          </span>{" "}
          se conectan con seguridad, transparencia y resultados reales.
        </p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 min-h-50">
          {cards1.map((res, index) => (
            <article
              key={index}
              className="rounded-md border border-[var(--adamia-blue)]/10 bg-gray-50 p-7 shadow-lg transition duration-300 hover:-translate-y-1.5 hover:border-[var(--adamia-blue)]/35 hover:shadow-xl"
            >
              <p className="text-center text-xl font-bold text-[var(--adamia-text-primary)]">
                {res.title}
              </p>
              <p className="mt-3 text-center text-sm text-[var(--adamia-text-secondary)]">
                {res.description}
              </p>
            </article>
          ))}
        </div>
      </section>
      <AltaEmpresasForm />
      <section className="p-5 py-20 md:px-10 lg:px-30 xl:px-40">
        <h2 className="text-center text-3xl font-extrabold text-[var(--adamia-text-primary)]">
          🚀 ¿Por qué ADAMIA es tu mejor opción?
        </h2>
        <p className="pt-5 font-light text-md text-center text-[var(--adamia-text-secondary)]">
          Digitaliza tu reclutamiento. Automatiza procesos. Encuentra talento
          sin complicaciones.
        </p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 min-h-50">
          {cards2.map((res, index) => (
            <article
              key={index}
              className="rounded-md border border-[var(--adamia-blue)]/10 bg-gray-50 p-7 shadow-lg transition duration-300 hover:-translate-y-1.5 hover:border-[var(--adamia-blue)]/35 hover:shadow-xl"
            >
              <p className="text-center text-xl font-bold text-[var(--adamia-text-primary)]">
                {res.title}
              </p>
              <p className="mt-3 text-center text-sm text-[var(--adamia-text-secondary)]">
                {res.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
