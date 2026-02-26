"use client";
import Image from "next/image";
import React, { useEffect } from "react";
import { blogs } from "./dataMappings";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function BlogNoticiasPage() {
  const onSubmit = () => {};
  const router = useRouter();

  useEffect(() => {
    router.push("/");
  }, []);

  return null;

  return (
    <main className="w-full bg-gray-100 py-5 px-10 md:px-20 lg:px-30 ">
      <section className="h-[40vh] w-full relative">
        <Image
          alt="BackgroundBlog"
          src="/assets/bg_alta-empresas.png"
          fill
          className="object-cover rounded-lg"
        />
        <div className="absolute inset-0 flex items-center justify-center flex-col bg-slate-700/50 rounded-lg">
          <h1 className="text-white text-4xl font-extrabold">
            Blog & Recursos de Adamia
          </h1>
          <p className="text-white text-md mt-2">
            Últimas novedades, tutoriales en vídeo y material descargable para
            optimizar tu gestión de talento.
          </p>
        </div>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-5 mt-10">
        <div className="border flex md:hidden">
          <div className="w-full bg-gray-50 rounded-md shadow-lg p-5">
            <form onSubmit={onSubmit} className="flex gap-1">
              <Input placeholder="Buscar" />
              <Button
                type="submit"
                className="bg-slate-700"
                endIcon={
                  <Icon icon="material-symbols:search" width="24" height="24" />
                }
              />
            </form>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          {blogs.map((res, index) => (
            <article
              key={index}
              className="flex flex-col md:flex-row bg-gray-50 rounded-md shadow-lg hover:shadow-xl transition transform hover:-translate-y-1.5 duration-300"
            >
              <div className="relative w-full md:w-[200px] h-[150px] md:h-auto shrink-0">
                <Image
                  alt="imagenBlog"
                  src="/assets/bg_alta-empresas.png"
                  fill
                  className="rounded-l-md object-cover"
                />
              </div>
              <div className="p-5">
                <p className="font-extralight text-sm text-gray-500">{`${res.date} - ${res.author}`}</p>
                <p className=" text-xl font-bold text-slate-700">{res.title}</p>
                <p className="mt-3 text-gray-600  text-sm">{res.description}</p>
                <Button variant="ghost" className="group my-5">
                  Leer más{" "}
                  <span className="transition transform duration-300 group-hover:translate-x-1.5">
                    <Icon
                      icon="solar:arrow-right-broken"
                      width="24"
                      height="24"
                    />
                  </span>
                </Button>
              </div>
            </article>
          ))}
        </div>
        <section className="hidden md:flex flex-col gap-5">
          <div className="w-full bg-gray-50 rounded-md shadow-lg p-5">
            <form onSubmit={onSubmit} className="flex gap-1">
              <Input placeholder="Buscar" />
              <Button
                type="submit"
                className="bg-slate-700"
                endIcon={
                  <Icon icon="material-symbols:search" width="24" height="24" />
                }
              />
            </form>
          </div>
          <div className="w-full bg-gray-50 rounded-md shadow-lg p-5">
            <form onSubmit={onSubmit} className="flex flex-col gap-1">
              <h3 className="text-slate-700 font-bold px-3">Categorías</h3>
              <div className="border-b-1 border-gray-200 mx-3" />
              <Button type="button" variant="link" className="justify-start">
                Desarrollo
              </Button>
              <Button type="button" variant="link" className="justify-start">
                Marketing
              </Button>
              <Button type="button" variant="link" className="justify-start">
                Reclutamiento
              </Button>
              <Button type="button" variant="link" className="justify-start">
                Tecnología
              </Button>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
