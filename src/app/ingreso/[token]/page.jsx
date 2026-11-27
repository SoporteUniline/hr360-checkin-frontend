"use client";
import { use } from "react";
import Preingreso from "@/components/induccion/Preingreso";

// Liga del celular: datos, documentos, firma y rostro (src/components/induccion/Preingreso.jsx).
export default function PaginaIngreso({ params }) {
  const { token } = use(params);
  return <Preingreso token={token} />;
}
