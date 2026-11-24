// Reloj checador de la empresa para RH y dueño: /seleccionar-reloj elige la empresa, revisa su plan y abre /<slug>
// (rostro, NIP o QR). Sin conexión esa revisión no puede hacerse: con una sola empresa se abre directo el reloj
// descargado; si no, la ruta normal muestra los destinos disponibles sin red.
import { clockStore } from "@/lib/offline-clock";

export const RUTA_RELOJ_EMPRESA = "/seleccionar-reloj";

export const sinConexion = () => !navigator.onLine || window.__adamiaOffline === true;

export async function destinoRelojSinConexion(dataUser) {
  const ids = [...(dataUser?.empresas || []), ...(dataUser?.empresas_detalle || []).map((e) => e.id_empresa)].map(Number);
  const asignadas = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
  if (asignadas.length !== 1) return RUTA_RELOJ_EMPRESA;
  try {
    const perfil = await (await clockStore()).getValue(`clock:company:${asignadas[0]}`);
    if (perfil?.slug) return `/${encodeURIComponent(perfil.slug)}`;
  } catch {
    // sin reloj descargado: la ruta normal muestra los destinos disponibles
  }
  return RUTA_RELOJ_EMPRESA;
}
