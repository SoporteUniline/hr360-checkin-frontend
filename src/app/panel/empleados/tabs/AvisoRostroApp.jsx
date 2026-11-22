"use client";

// Ficha → Reconocimiento (22/11/2026, decisión A): si la persona registró o actualizó su rostro desde la app, RH lo ve
// aquí (cuándo y qué versión del aviso de uso aceptó). Al abrirlo queda como visto. Sin la migración no muestra nada.
import useSWR from "swr";
import { ScanFace } from "lucide-react";
import axios from "@/lib/axios";

const get = (url) => axios.get(url).then((r) => r.data);
const cuando = (v) => new Date(`${String(v).replace(" ", "T")}Z`).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function AvisoRostroApp({ idEmpleado }) {
  const { data } = useSWR(idEmpleado ? `/checador/mi-espacio/rostro/empleado/${idEmpleado}` : null, get, { revalidateOnFocus: false, shouldRetryOnError: false });
  const desdeApp = (data?.cambios ?? []).filter((c) => c.origen === "empleado");
  if (!desdeApp.length) return null;
  const [ultimo] = desdeApp;
  const nuevo = !Number(ultimo.visto_por_rh);
  return (
    <div role="status" className={`w-full max-w-md rounded-xl border p-4 text-sm ${nuevo ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
      <p className="flex items-center gap-2 font-semibold"><ScanFace className="size-4" />{nuevo ? "Nuevo: " : ""}la persona actualizó su rostro desde la app</p>
      <p className="mt-1">El {cuando(ultimo.creado_en)}, aceptando el aviso de uso de su rostro{ultimo.consentimiento_version ? ` (versión ${ultimo.consentimiento_version})` : ""}. Ya lo usa para checar.</p>
      {desdeApp.length > 1 ? <p className="mt-1 text-xs opacity-80">Lo ha actualizado {desdeApp.length} veces desde la app.</p> : null}
    </div>
  );
}
