"use client";

// Créditos de Adamia AI (25/11/2026): indicador «Saldo de Adamia AI: $X MXN» con enlace a recargar. Reemplaza al de
// «Uso de Adamia AI este mes: … USD» (el cliente nunca ve costo ni margen). Sin la migración de créditos no se muestra.
import Link from "next/link";
import { RUTA_CREDITOS, textoIndicador, tonoSaldo } from "@/lib/ia/creditos.mjs";

const TONO = {
  sin: "text-red-700",
  bajo: "text-amber-700",
  normal: "text-slate-500",
};

export default function IndicadorCreditos({ creditos, className = "" }) {
  const texto = textoIndicador(creditos);
  if (!texto) return null;
  const tono = tonoSaldo(creditos);
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] ${TONO[tono]} ${className}`} data-indicador-creditos={tono}>
      <span className="font-semibold">{texto}</span>
      {tono === "sin" ? <span>· Sin créditos</span> : tono === "bajo" ? <span>· Saldo bajo</span> : null}
      <Link href={RUTA_CREDITOS} className="inline-flex min-h-11 items-center font-semibold text-brand sm:min-h-8 underline-offset-2 hover:underline">
        {tono === "normal" ? "Ver créditos" : "Recargar"}
      </Link>
    </p>
  );
}
