"use client";

// Lo que necesita la página del acta antes de dibujar el formulario (28/11/2026): ?volver= (a dónde regresar), la sesión
// y, al editar, el acta tal cual la da el listado (GET /administrativeMinutes?id_acta=…, el mismo filtro que usa el
// enlace «📄 Acta en borrador» de Asistencias; el backend lo limita a las empresas de la sesión).
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";
import { rutaDeRegreso } from "@/lib/formulario/rutaRegreso.mjs";
import { RUTA_ACTAS } from "@/lib/actas/formularioActa.mjs";
import FormularioActa from "./FormularioActa";

export default function PaginaActa({ id = null }) {
  const q = useSearchParams();
  const volverA = rutaDeRegreso(q.get("volver"), RUTA_ACTAS);
  const { dataUser } = useAuth() ?? {};
  const { data, error, isLoading } = useSWR(
    id ? `/checador/administrativeMinutes?page=1&limit=500&id_acta=${encodeURIComponent(id)}` : null,
    fetcherWithToken,
    { revalidateOnFocus: false },
  );
  const acta = id ? (data?.data ?? []).find((a) => String(a.id_acta) === String(id)) ?? null : null;

  if (id && isLoading) {
    return <div className="flex items-center justify-center gap-2 py-24 text-cuerpo text-texto-secundario" role="status"><Loader2 className="size-6 animate-spin" aria-hidden="true" /> Cargando acta…</div>;
  }
  if (id && !acta) {
    const estado = error?.response?.status;
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-3 py-16 text-cuerpo text-texto" role="alert">
        <h1 className="m-0 text-titulo-seccion font-bold text-navy">{estado === 403 ? "No tienes acceso a esta acta" : error ? "No se pudo abrir el acta" : "No encontramos esta acta"}</h1>
        <p className="m-0 text-texto-secundario">{error?.response?.data?.error || (error ? "Intenta de nuevo en un momento." : "Puede que se haya eliminado.")}</p>
        <Link href={volverA} className="inline-flex min-h-12 items-center font-semibold text-brand">‹ Volver</Link>
      </div>
    );
  }
  return <FormularioActa key={id ?? "nueva"} mode={id ? "edit" : "create"} actaToEdit={acta} dataUser={dataUser} volverA={volverA} />;
}
