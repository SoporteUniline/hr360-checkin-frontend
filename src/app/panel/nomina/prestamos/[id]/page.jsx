"use client";

// Detalle de un préstamo (se abre con clic en el renglón de Préstamos).
import { useParams } from "next/navigation";
import DetallePrestamo from "@/components/nomina/DetallePrestamo";

export default function PaginaPrestamo() {
  const { id } = useParams();
  return <DetallePrestamo id={id} pagina />;
}
