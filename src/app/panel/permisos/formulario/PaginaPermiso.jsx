"use client";

// Lo que necesita la página del permiso antes de dibujar el formulario (28/11/2026): los parámetros de la dirección
// (?empresa= la unidad elegida en la lista, ?volver= a dónde regresar), el catálogo de tipos, los festivos de la empresa
// (para la ventanita de días pasados, igual que la lista) y, al editar, el permiso tal cual lo da la lista.
import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import { fetcherWithToken } from "@/lib/fetcher";
import { rutaDeRegreso } from "@/lib/formulario/rutaRegreso.mjs";
import { RUTA_PERMISOS } from "@/lib/permisos/paginaPermiso.mjs";
import FormularioPermiso from "./FormularioPermiso";
import usePermisoAEditar from "./usePermisoAEditar";

export default function PaginaPermiso({ id = null }) {
  const q = useSearchParams();
  const idEmpresa = q.get("empresa") || "all";
  const volverA = rutaDeRegreso(q.get("volver"), RUTA_PERMISOS);
  const { data: tiposPermisoResp } = useTiposPermisoData();
  // Adaptar a la respuesta real del endpoint: { total, tiposPermiso: [...] }
  const tiposPermiso = Array.isArray(tiposPermisoResp) ? tiposPermisoResp : tiposPermisoResp?.tiposPermiso || [];
  // Festivos de la empresa (mismo endpoint y misma empresa que usaba la lista para la ventana).
  const { data: festivosResp } = useSWR(idEmpresa ? `/checador/holidays/${idEmpresa}?page=1&limit=5000&filter=` : null, fetcherWithToken);
  const festivosSet = useMemo(() => new Set((festivosResp?.festivos || []).filter((x) => x?.fecha).map((x) => String(x.fecha).slice(0, 10))), [festivosResp]);
  const { cargando, permiso, error } = usePermisoAEditar(id);

  if (id && cargando) {
    return <div className="flex items-center justify-center gap-2 py-24 text-cuerpo text-texto-secundario" role="status"><Loader2 className="size-6 animate-spin" aria-hidden="true" /> Cargando permiso…</div>;
  }
  if (id && (error || !permiso)) {
    const estado = error?.response?.status;
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-3 py-16 text-cuerpo text-texto" role="alert">
        <h1 className="m-0 text-titulo-seccion font-bold text-navy">{estado === 404 ? "No encontramos este permiso" : estado === 403 ? "No tienes acceso a este permiso" : "No se pudo abrir el permiso"}</h1>
        <p className="m-0 text-texto-secundario">{error?.response?.data?.error || "Intenta de nuevo en un momento."}</p>
        <Link href={volverA} className="inline-flex min-h-12 items-center font-semibold text-brand">‹ Volver</Link>
      </div>
    );
  }
  // La «key» rehace el formulario si cambia el permiso o la empresa sin salir de la página.
  return (
    <FormularioPermiso key={`${id ?? "nuevo"}-${idEmpresa}`} editItem={permiso} idEmpresa={idEmpresa} tiposPermiso={tiposPermiso}
      festivosSet={festivosSet} volverA={volverA} />
  );
}
