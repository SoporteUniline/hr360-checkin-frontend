"use client";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

export default function Home() {
  const [horaActual, setHoraActual] = useState("");

  useEffect(() => {
    const actualizarHora = () => {
      const ahora = new Date();
      const hora = ahora.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setHoraActual(hora);
    };

    actualizarHora(); // para que no espere 1s la primera vez
    const intervalo = setInterval(actualizarHora, 1000);

    return () => clearInterval(intervalo); // limpiar al desmontar
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <Icon icon="mdi:clock-outline" className="text-[120px] text-slate-700" />
      <h1 className="text-5xl font-bold text-slate-800 mt-6">{horaActual}</h1>
      <p className="mt-2 text-lg text-slate-500">Hora actual</p>
    </main>
  );
}
