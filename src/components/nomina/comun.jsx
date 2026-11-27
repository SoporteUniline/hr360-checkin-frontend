"use client";

// Piezas compartidas de las pantallas de nómina (R1).
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const TONOS = {
  gris: "bg-gray-100 text-gray-700",
  azul: "bg-blue-50 text-blue-700",
  verde: "bg-emerald-50 text-emerald-700",
  ambar: "bg-amber-50 text-amber-800",
  rojo: "bg-red-50 text-red-700",
};

export function Chip({ tono = "gris", children }) {
  return <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONOS[tono]}`}>{children}</span>;
}

export function Kpi({ titulo, valor, nota, clase = "text-gray-900" }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{titulo}</p>
      <p className={`mt-1 text-lg font-extrabold tabular-nums ${clase}`}>{valor}</p>
      {nota ? <p className="text-[11.5px] text-gray-500">{nota}</p> : null}
    </div>
  );
}

// Empresa sobre la que se trabaja: la primera de la sesión, o la que elija el usuario si tiene varias.
// preferida: la empresa con la que se llega (p. ej. ?empresa= desde la lista), si el usuario la tiene.
export function useEmpresaNomina(preferida = null) {
  const { dataUser } = useAuth();
  const empresas = useMemo(() => (dataUser?.empresas_detalle ?? []).map((e) => ({ id: Number(e.id_empresa), nombre: e.nombre })), [dataUser]);
  const [idEmpresa, setIdEmpresa] = useState(null);
  useEffect(() => {
    if (!idEmpresa && empresas.length) setIdEmpresa(empresas.find((e) => e.id === Number(preferida))?.id ?? empresas[0].id);
  }, [empresas, idEmpresa, preferida]);
  return { empresas, idEmpresa, setIdEmpresa };
}

export function SelectorEmpresa({ empresas, idEmpresa, setIdEmpresa }) {
  if (empresas.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">Empresa</span>
      <select className="h-11 rounded-lg border border-gray-300 bg-white px-2 sm:h-9" value={idEmpresa ?? ""} onChange={(e) => setIdEmpresa(Number(e.target.value))}>
        {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
      </select>
    </label>
  );
}

// Mensaje del backend (incluye «Falta correr la migración…») o uno genérico.
export const mensajeError = (e, porDefecto = "No se pudo completar la acción.") => e?.response?.data?.error || porDefecto;

// Descarga un archivo protegido (PDF o Excel) con la sesión y lo abre o guarda.
export async function descargar(axios, url, nombre, abrir = false) {
  const r = await axios.get(url, { responseType: "blob" });
  const enlace = URL.createObjectURL(r.data);
  if (abrir) window.open(enlace, "_blank", "noopener,noreferrer");
  else {
    const a = document.createElement("a");
    a.href = enlace;
    a.download = nombre;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(enlace), 60000);
}
