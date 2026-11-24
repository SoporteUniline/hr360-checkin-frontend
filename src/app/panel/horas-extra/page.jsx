"use client";

// «Control de horas extra» ya vive en Asistencias: las horas extra se autorizan en el reloj de cada fila.
// La ruta se conserva (enlaces y reportes viejos) y lleva a Asistencias con un aviso corto; conserva ?empleado=.
// La pantalla anterior sigue en ./ControlHorasExtra.jsx sin enlace.
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Redirigir() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const destino = new URLSearchParams({ aviso: "horas-extra" });
    if (params.get("empleado")) destino.set("empleado", params.get("empleado"));
    const semana = params.get("semana");
    if (/^\d{4}-\d{2}-\d{2}$/.test(semana ?? "")) {
      const fin = new Date(`${semana}T12:00:00Z`);
      fin.setUTCDate(fin.getUTCDate() + 6);
      destino.set("desde", semana);
      destino.set("hasta", fin.toISOString().slice(0, 10));
    }
    router.replace(`/panel/registro-asistencia?${destino}`);
  }, [router, params]);
  return <p role="status" className="p-6 text-sm text-slate-600">«Control de horas extra» ahora vive en Asistencias. Te llevamos ahí…</p>;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Redirigir />
    </Suspense>
  );
}
