"use client";
// Entradas del menú de Evaluación de desempeño según los permisos del servidor (/capabilities):
// quien no ve una pestaña del módulo tampoco ve su entrada. Se consulta la empresa con la que abre el módulo
// (la misma que elige EvaluationProvider al entrar). Mientras carga o si falla, el menú usa solo el rol;
// las rutas siguen protegidas dentro del módulo (EvaluationModule) y en el servidor.
import useSWR from "swr";
import axios from "@/lib/axios";
import { createEvaluationApi } from "@/lib/evaluaciones/api.mjs";
import { vistasVisibles } from "@/lib/evaluaciones/vistas.mjs";

const opciones = { revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 300000 };

async function consultar([, empresa]) {
  const api = createEvaluationApi(axios, empresa);
  const capabilities = (await api.get("/capabilities")).data;
  // «Por responder» de RH solo aparece si tiene evaluaciones asignadas (igual que su pestaña).
  const suyas = capabilities?.scopes?.includes("assignments")
    ? await api.get("/my/assignments", { page: 1, pageSize: 1 }).catch(() => null)
    : null;
  return vistasVisibles(capabilities, suyas?.pagination?.total > 0).map((v) => v.path);
}

// Devuelve el conjunto de vistas permitidas (paths) o null si aún no se sabe.
export function useMenuEvaluaciones(dataUser, activo) {
  const empresa = dataUser?.id_empresa ?? dataUser?.empresas_detalle?.[0]?.id_empresa ?? dataUser?.empresas?.[0];
  const { data } = useSWR(activo && empresa ? ["menu-evaluaciones", empresa, dataUser?.id_usuario] : null, consultar, opciones);
  return data ? new Set(data) : null;
}
