"use client";
import Image from "next/image";
import React from "react";
import { cards1 } from "./dataMappings";
import CountUp from "react-countup";
import { clientes } from "./dataMappings";
import JobPositions from "./JobPositions";

export default function BolsaTrabajoPage() {
  return (
    <main className="w-full bg-gray-100">
      <section className="h-[50vh] w-full relative">
        <Image
          alt="BackgroundHR"
          src="/assets/bg_bolsa_trabajo.png"
          fill
          className="object-cover"
        />
      </section>
      <JobPositions />
      <section className="p-5 py-20 md:px-10 lg:px-30 xl:px-40">
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 min-h-40">
          {cards1.map((res, index) => (
            <article
              key={index}
              className="p-7 bg-gray-50 rounded-md shadow-lg hover:shadow-xl transition transform hover:-translate-y-1.5 duration-300"
            >
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
      <section className="p-5 py-20 md:px-10 lg:px-30 xl:px-40 bg-slate-100">
        <h2 className="text-center text-2xl font-extrabold text-slate-700">
          🎥 Conoce HR360 en acción
        </h2>
        <div className="flex justify-center items-center m-10 pb-10">
          <div className="w-full max-w-3xl aspect-video">
            <iframe
              className="w-full h-full"
              // src="https://www.youtube.com/embed/mSYWXvQQ2-w?si=otMOeZbcidLFLqJB"
              src="https://www.youtube-nocookie.com/embed/mSYWXvQQ2-w?si=otMOeZbcidLFLqJB"
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
        </div>
        <div className="my-10 pt-10">
          <h2 className="text-center text-2xl font-extrabold text-slate-700">
            HR360 en Números
          </h2>
          <div className="mt-6 flex justify-center items-center gap-7">
            <div className="text-center text-slate-700">
              <p className="font-extrabold text-3xl">
                <CountUp end={300} duration={1.5} decimal="," />
              </p>
              <p className="text-sm ">Empresas activas</p>
            </div>
            <div className="text-center text-slate-700">
              <p className="font-extrabold text-3xl">
                <CountUp end={1000} duration={2} decimal="," />
              </p>
              <p className="text-sm ">Vacantes publicadas</p>
            </div>
            <div className="text-center text-slate-700">
              <p className="font-extrabold text-3xl">
                <CountUp end={5000} duration={2.5} decimal="," />
              </p>
              <p className="text-sm ">Postulaciones</p>
            </div>
          </div>
        </div>
      </section>
      <section className="p-5 py-20 md:px-10 lg:px-30 xl:px-40 bg-white">
        <h2 className="text-center text-2xl font-extrabold text-slate-700">
          Lo que dicen nuestros clientes
        </h2>
        <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-5 min-h-40">
          {clientes.map((res, index) => (
            <article
              key={index}
              className="p-7 bg-gray-50 rounded-md shadow-sm text-slate-700"
            >
              <p className="mt-3 text-center text-sm">{res.comment}</p>
              <p className=" mt-2 text-center text-sm font-bold">
                - {res.author}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
