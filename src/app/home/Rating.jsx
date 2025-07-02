import { Button } from "@/components/ui/button";
import Image from "next/image";
import React from "react";

export default function Rating() {
  return (
    <div className="w-full">
      <div className="p-5 py-10 md:px-10 lg:px-30 xl:px-40">
        <h3 className="text-center text-2xl font-extrabold text-slate-700">
          Nuestros Números
        </h3>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 min-h-40">
          <div className="p-7 border-1 border-gray-200 rounded-md hover:shadow-xl">
            <p className="text-center text-3xl">📋</p>
            <p className="text-center text-2xl font-extrabold text-slate-700">
              1,200+
            </p>
            <p className="mt-3 text-gray-600 text-center text-sm">
              Vacantes Publicadas
            </p>
          </div>
          <div className="p-7 border-1 border-gray-200 rounded-md hover:shadow-xl">
            <p className="text-center text-3xl">👥</p>
            <p className="text-center text-2xl font-extrabold text-slate-700">
              15,000+
            </p>
            <p className="mt-3 text-gray-600 text-center text-sm">
              Candidatos Registrados
            </p>
          </div>
          <div className="p-7 border-1 border-gray-200 rounded-md hover:shadow-xl">
            <p className="text-center text-3xl">⏱️</p>
            <p className="text-center text-2xl font-extrabold text-slate-700">
              45%
            </p>
            <p className="mt-3 text-gray-600 text-center text-sm">
              Reducción de Tiempo
            </p>
          </div>
          <div className="p-7 border-1 border-gray-200 rounded-md hover:shadow-xl">
            <p className="text-center text-3xl">⭐</p>
            <p className="text-center text-2xl font-extrabold text-slate-700">
              4.8/5
            </p>
            <p className="mt-3 text-gray-600 text-center text-sm">
              Satisfacción
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
