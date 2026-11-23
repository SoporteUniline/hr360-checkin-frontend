"use client";
// Puerta de rutas del panel y de la app del empleado (03/12/2026, «Módulos por empresa»). Si alguien entra con la dirección
// a un módulo apagado o sin derecho, ve «Este módulo no está activo para tu empresa» en lugar de la pantalla (que además
// recibiría 403 MODULO_INACTIVO del servidor). Las rutas de la base pasan siempre, sin esperar nada.
// En rutas de un módulo, mientras se verifica la sesión, se espera (no se muestra la pantalla para luego quitarla).
import { usePathname } from "next/navigation";
import useSWR from "swr";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { modulosDeRuta } from "@/lib/modulos/catalogo.mjs";
import { moduloFaltante } from "@/lib/modulos/menu.mjs";
import { useModulosActivos } from "./useModulos";
import ModuloInactivo from "./ModuloInactivo";

function Aviso({ modulo }) {
  const { dataUser } = useAuth();
  const empresa = dataUser?.tipo_usuario !== "Empleado" ? dataUser?.id_empresa ?? dataUser?.empresas?.[0] : null;
  // Solo RH: ¿le falta derecho (Contratar) o solo está apagado (Ir a Módulos)?
  const { data } = useSWR(empresa ? `/checador/modulos?empresa=${empresa}` : null, (u) => axios.get(u).then((r) => r.data), { revalidateOnFocus: false, shouldRetryOnError: false });
  const estado = data?.modulos?.find((m) => m.clave === modulo.clave);
  return <ModuloInactivo modulo={modulo} sinDerecho={estado ? !estado.derecho : false} />;
}

export default function GuardaModulo({ children }) {
  const pathname = usePathname();
  const { activos, listo, opciones } = useModulosActivos();
  if (!modulosDeRuta(pathname)) return children;
  if (!listo) return <p role="status" className="p-6 text-sm text-slate-500">Cargando…</p>;
  const falta = moduloFaltante(pathname, activos, opciones);
  return falta ? <Aviso modulo={falta} /> : children;
}
