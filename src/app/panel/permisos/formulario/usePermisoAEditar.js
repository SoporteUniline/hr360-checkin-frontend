"use client";

// Carga el permiso a editar en /panel/permisos/[id]/editar TAL CUAL lo daba la lista a la ventana (28/11/2026).
// 1) GET /solicitudes-permiso/:id para saber de quién es y de qué día.
// 2) La misma consulta de la lista, acotada a esa persona y ese día, y se toma el renglón con ese id. Así no cambia lo que
//    se manda al guardar: el GET por id pisa `goce_sueldo` del permiso con el del tipo (ver lib/permisos/paginaPermiso.mjs).
// Si la lista no lo trae (no debería), se usa lo del GET por id.
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { fetcherWithToken } from "@/lib/fetcher";
import { permisosApi } from "@/lib/permisosApi";
import { filaPermiso, urlFilaPermiso } from "@/lib/permisos/paginaPermiso.mjs";

export default function usePermisoAEditar(id) {
  const [estado, setEstado] = useState({ cargando: Boolean(id), permiso: null, error: null });
  useEffect(() => {
    if (!id) return undefined;
    let vigente = true;
    setEstado({ cargando: true, permiso: null, error: null });
    (async () => {
      try {
        const base = await permisosApi.getById(id);
        if (!base) throw Object.assign(new Error("Permiso no encontrado"), { response: { status: 404 } });
        const url = urlFilaPermiso(base, base.fecha_inicio ? dayjs(base.fecha_inicio).format("YYYY-MM-DD") : null);
        const fila = url ? filaPermiso(await fetcherWithToken(url), id) : null;
        if (vigente) setEstado({ cargando: false, permiso: fila ?? base, error: null });
      } catch (error) {
        if (vigente) setEstado({ cargando: false, permiso: null, error });
      }
    })();
    return () => { vigente = false; };
  }, [id]);
  return estado;
}
