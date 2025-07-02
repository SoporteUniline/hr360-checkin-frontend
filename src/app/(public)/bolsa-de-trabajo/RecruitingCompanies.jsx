"use client";
import Image from "next/image";
import React from "react";
import { fetcher, swr_config } from "@/lib/fetcher";
import useSWR from "swr";
import LoadingCards from "@/components/LoadingCards";
import ErrorPage from "@/components/ErrorPage";

export default function RecruitingCompanies({ setFilterValues }) {
  const { data, error, isLoading } = useSWR(
    "/empresas/activas?limit=4&page=1",
    fetcher,
    swr_config
  );

  if (isLoading)
    return (
      <section className="p-5 pt-20 md:px-10 lg:px-30 xl:px-40">
        <LoadingCards rows={10} />
      </section>
    );
  if (error)
    return (
      <section className="p-5 pt-20 md:px-10 lg:px-30 xl:px-40">
        <ErrorPage message={error?.message} />
      </section>
    );

  return (
    <section className="p-5 pt-20 md:px-10 lg:px-30 xl:px-40">
      <h2 className="text-center text-lg font-extrabold text-slate-700">
        Empresas que están contratando:
      </h2>
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-10">
        {data?.data.map((res, index) => (
          <div
            key={index}
            onClick={() =>
              setFilterValues((st) => ({
                ...st,
                id_empresa: st.id_empresa ? "" : res.id_empresa,
                page: 1,
              }))
            }
            className="relative bg-white cursor-pointer border rounded-md shadow-lg hover:shadow-xl transition transform hover:-translate-y-1.5 duration-300 h-30"
          >
            <div className="flex justify-center items-center">
              <Image
                alt={res.nombre_empresa || "Empresa sin nombre"}
                src={res.url_imagen || "/assets/no-image.png"}
                //width={100}
                //height={100}
                fill
                className="object-contain rounded-md p-3"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
