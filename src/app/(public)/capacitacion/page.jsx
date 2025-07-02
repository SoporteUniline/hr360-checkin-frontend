"use client";
import Image from "next/image";
import React, { useEffect } from "react";
import { cards1 } from "./dataMappings";
import { cards2 } from "./dataMappings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function CapacitacionPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/");
  }, []);

  return null;

  return (
    <main className="w-full bg-gray-100">
      <section className="h-[50vh] w-full relative">
        <Image
          alt="BackgroundHR"
          src="/assets/bg-capacitacion.png"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center flex-col bg-slate-700/50">
          <h1 className="text-white text-4xl font-bold">
            Domina HR360 con Nuestros Tutoriales
          </h1>
          <p className="text-white text-md mt-2">
            Aprende paso a paso todas las funcionalidades clave y lleva tu
            gestión al siguiente nivel.
          </p>
        </div>
      </section>
      <section className="p-5 py-20 md:px-10 lg:px-30 xl:px-40">
        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-5 min-h-40">
          {cards1.map((res, index) => (
            <article
              key={index}
              className="p-7 bg-gray-50 rounded-md shadow-lg"
            >
              <span className="flex justify-center text-4xl mb-3">
                {res.icon}
              </span>
              <p className="text-center text-xl font-bold text-slate-700">
                {res.title}
              </p>
              <p className="mt-3 text-gray-600 text-center text-sm">
                {res.description}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="p-5 py-20 md:px-10 lg:px-30 xl:px-40">
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 min-h-40">
          {cards2.map((res, index) => (
            <article key={index} className="bg-gray-50 rounded-md shadow-lg">
              <div className="w-full max-w-3xl aspect-video">
                <iframe
                  className="w-full h-full"
                  width="560"
                  height="315"
                  src="https://www.youtube.com/embed/TkN2i-_4N4g?si=tI9Qxw18xCIACBDg"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-3">
                <p className="text-xl font-bold text-slate-700">{res.title}</p>
                <p className="mt-3 text-gray-600 text-sm">{res.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="p-5 py-20 md:px-10 lg:px-30 xl:px-40 bg-slate-500">
        <h2 className="text-center text-white text-2xl font-extrabold">
          🎥 Conoce HR360 en acción
        </h2>
        <p className="text-white text-center text-md mt-2">
          Recibe alertas, novedades y contenido exclusivo directamente en tu
          correo.
        </p>
        <div className="flex justify-center mt-5">
          <Input
            className="bg-white text-gray-500 w-100 rounded-r-none rounded-l-3xl"
            placeholder="Tu correo electrónico"
          />
          <Button className="rounded-l-none rounded-r-3xl bg-slate-700">
            Suscribirme
          </Button>
        </div>
      </section>
    </main>
  );
}
