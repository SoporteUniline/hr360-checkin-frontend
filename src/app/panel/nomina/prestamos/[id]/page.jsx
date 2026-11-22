"use client";

// Detalle de un préstamo (22/11/2026: clic en el renglón de Préstamos → su página).
import { useParams } from "next/navigation";
import DetallePrestamo from "@/components/nomina/DetallePrestamo";

export default function PaginaPrestamo() {
  const { id } = useParams();
  return <DetallePrestamo id={id} pagina />;
}
