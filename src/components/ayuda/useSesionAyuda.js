"use client";
// Centro de ayuda dentro del sistema · qué guías ve esta sesión: audiencia por rol (RH, dueño, empleado, jefe), módulos
// encendidos de su empresa y permisos del usuario con acceso. La regla vive en src/lib/ayuda/pantallas.mjs.
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useModulosActivos } from "@/components/modulos/useModulos";
import useMonitorEquipo from "@/hooks/useMonitorEquipo";
import { audienciasDeSesion, guiasVisibles, rutasVisibles } from "@/lib/ayuda/pantallas.mjs";

export function useSesionAyuda() {
  const { dataUser, permisosSesion } = useAuth();
  const { activos, opciones } = useModulosActivos();
  const { esJefe } = useMonitorEquipo();
  const audiencias = useMemo(() => audienciasDeSesion(dataUser, { esJefe }), [dataUser, esJefe]);
  const tipo = dataUser?.tipo_usuario;
  // Centro de ayuda dentro del sistema: el del panel, el de Mi espacio o (administrador de ADAMIA) el público.
  const rutaCentro = tipo === "Empleado" ? "/empleado/panel/ayuda" : tipo === "Admin" || !tipo ? "/ayuda" : "/panel/ayuda";
  const filtro = useMemo(() => ({ audiencias, activos, opciones, permisos: tipo === "Empleado" ? null : permisosSesion }), [audiencias, activos, opciones, permisosSesion, tipo]);
  return { dataUser, audiencias, filtro, rutaCentro };
}

/** Guías y rutas del índice filtradas para la sesión. todas: sin filtrar por audiencia (los módulos siempre filtran). */
export function filtrarIndice(indice, filtro, { todas = false } = {}) {
  if (!indice) return { guias: [], rutas: [], porSlug: new Map() };
  const guias = guiasVisibles(indice.guias ?? [], { ...filtro, todas });
  const porSlug = new Map((indice.guias ?? []).map((g) => [g.slug, g]));
  const rutas = rutasVisibles(indice.rutas ?? [], porSlug, { ...filtro, todas });
  return { guias, rutas, porSlug };
}
