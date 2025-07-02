"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import LoadingCards from "@/components/LoadingCards";
import ErrorPage from "@/components/ErrorPage";
import { useRouter } from "next/navigation";

export default function CardsJobs({ data, error, isLoading }) {
  const router = useRouter();

  if (isLoading) {
    return (
      <section className="p-5 pt-20 md:px-10 lg:px-30 xl:px-40">
        <LoadingCards rows={10} />
      </section>
    );
  }

  if (error) {
    const message = error?.response?.data?.message;
    return (
      <section className="p-5 pt-20 md:px-10 lg:px-30 xl:px-40">
        <ErrorPage
          title="Error al cargar vacantes"
          message={
            message || "Ocurrió un error inesperado al obtener las vacantes."
          }
        />
      </section>
    );
  }

  function stripHtmlAndDecode(html) {
    if (typeof window === "undefined") return html;

    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  }

  // Renderiza las vacantes normalmente
  return (
    <section>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 min-h-40">
        {data?.data.map((res, index) => (
          <article
            key={index}
            className="flex flex-col p-7 bg-gray-50 rounded-md shadow-lg hover:shadow-xl transition transform hover:-translate-y-1.5 duration-300"
          >
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-extrabold text-slate-700">{res.titulo}</p>
                  <p className="font-semibold text-sm text-slate-600">
                    {res.nombre_empresa}
                  </p>
                </div>
                <Image
                  alt={`vacante-${index + 1}`}
                  src={res.url_imagen || "/assets/no-image.png"}
                  height={48}
                  width={48}
                />
              </div>
              <p className="mt-3 text-gray-600 text-xs line-clamp-4">
                {stripHtmlAndDecode(res.descripcion)}
              </p>

              <p className="mt-3 text-slate-900 text-xs">{`Horario: ${
                res.horario || "No establecido"
              }`}</p>
              <p className="mt-3 text-slate-900 text-xs">{`Salario: ${
                res.salario || "No establecido"
              }`}</p>
            </div>
            <Button
              onClick={() => router.push(`/vacante/${res.slug}`)}
              className="mt-5 text-white"
            >
              Ver más
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
