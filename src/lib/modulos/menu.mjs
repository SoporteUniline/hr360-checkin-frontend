// Filtro del menú y de las rutas por módulos activos. Sin red ni React: probado en
// scripts/test-modulos.mjs. La verdad está en el servidor (403 MODULO_INACTIVO); esto solo oculta lo que no se puede usar.
import { BASE, modulo, modulosDeRuta } from "./catalogo.mjs";

// Interruptor global de emergencia: NEXT_PUBLIC_RECRUITMENT_ENABLED="false" oculta Reclutamiento para todos. Sin definir
// (o cualquier otro valor) manda el módulo de cada empresa.
export const reclutamientoHabilitado = (valor) => String(valor ?? "").trim() !== "false";

// respuesta: lo que manda el servidor en /users/verify/token o /checador/modulos/activos ({ todos, modulos: { id: [claves] } }).
// Devuelve el conjunto de claves activas, o null = sin filtro (servidor viejo, Admin o todavía sin datos).
// Con varias empresas se unen (cada pantalla trabaja con la empresa que elija y el servidor revisa esa).
export function clavesActivas(respuesta, { empresa = null } = {}) {
  if (!respuesta || respuesta.todos || !respuesta.modulos || typeof respuesta.modulos !== "object") return null;
  const listas = empresa != null ? [respuesta.modulos[String(empresa)]] : Object.values(respuesta.modulos);
  const validas = listas.filter(Array.isArray);
  if (!validas.length) return null;
  return new Set([...BASE, ...validas.flat()]);
}

// ¿Se puede entrar a esta ruta? (la base siempre).
export function rutaPermitida(url, activos, { reclutamiento = true } = {}) {
  const claves = modulosDeRuta(url);
  if (!claves) return true;
  if (!reclutamiento && claves.every((c) => c === "reclutamiento")) return false;
  if (!activos) return true;
  return claves.some((c) => activos.has(c));
}

// Módulo que falta para una ruta (para el aviso «no está activo»), o null.
export function moduloFaltante(url, activos, opciones) {
  if (rutaPermitida(url, activos, opciones)) return null;
  return modulo(modulosDeRuta(url)[0]);
}

// Un item del menú (con url o con submenú) se ve si alguna de sus rutas se puede usar.
export function itemPermitido(item, activos, opciones) {
  if (item?.children?.length) return item.children.some((c) => rutaPermitida(c.url, activos, opciones));
  return rutaPermitida(item?.url, activos, opciones);
}

// Grupos del menú lateral sin lo que no se puede usar; los grupos vacíos desaparecen.
export function filtrarGrupos(grupos, activos, opciones) {
  return (grupos ?? [])
    .map((g) => ({
      ...g,
      items: g.items
        .filter((it) => itemPermitido(it, activos, opciones))
        .map((it) => (it.children ? { ...it, children: it.children.filter((c) => rutaPermitida(c.url, activos, opciones)) } : it)),
    }))
    .filter((g) => g.items.length > 0);
}

// Pantalla Módulos: base (incluido siempre), los que tiene (con interruptor) y los que no (candado + Contratar).
export function seccionesModulos(modulos = []) {
  return {
    base: modulos.filter((m) => m.base),
    conDerecho: modulos.filter((m) => !m.base && m.derecho),
    sinDerecho: modulos.filter((m) => !m.base && !m.derecho),
  };
}

export const textoContratar = (nombreModulo, nombreEmpresa) =>
  `Hola, quiero contratar el módulo de ${nombreModulo} de ADAMIA${nombreEmpresa ? ` para ${nombreEmpresa}` : ""}.`;

export const ORIGEN = Object.freeze({ base: "Incluido siempre", plan: "Incluido en tu plan", extra: "Agregado a tu empresa", quitado: "No incluido" });
