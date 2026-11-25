// Lumo fase B1 (25/11/2026): ubicación de sucursales y sucursal más cercana. Reglas puras de la pantalla (el servidor
// vuelve a validar todo). Mapbox se llama SOLO desde el servidor: aquí nunca hay token.

const vacio = (v) => v === null || v === undefined || String(v).trim() === "";
const numero = (v) => (vacio(v) ? null : Number(String(v).trim().replace(",", ".")));

// Texto de los campos → { valido, cuerpo: {lat, lng}, error }. Ambos vacíos = quitar la ubicación.
export function validarCoordenadas(lat, lng) {
  if (vacio(lat) && vacio(lng)) return { valido: true, cuerpo: { lat: null, lng: null }, error: "" };
  const a = numero(lat);
  const b = numero(lng);
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return { valido: false, error: "Escribe la latitud y la longitud (las dos)." };
  if (Math.abs(a) > 90) return { valido: false, error: "La latitud va de -90 a 90." };
  if (Math.abs(b) > 180) return { valido: false, error: "La longitud va de -180 a 180." };
  if (a === 0 && b === 0) return { valido: false, error: "0, 0 no es una ubicación real." };
  return { valido: true, cuerpo: { lat: Math.round(a * 1e6) / 1e6, lng: Math.round(b * 1e6) / 1e6 }, error: "" };
}

// Enlace para revisar el punto en un mapa (Google Maps; no necesita token).
export const enlaceMapa = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${Number(lat)},${Number(lng)}`;

export const textoOrigen = (origen) => (origen === "mapbox" ? "Ubicada con Mapbox" : origen === "manual" ? "Escrita a mano" : "Sin ubicar");

// Mensaje para un error del servidor al geocodificar.
export function mensajeGeocodificar(codigo) {
  switch (codigo) {
    case "MAPBOX_NO_CONFIGURADO": return "Falta configurar Mapbox en el servidor. Puedes escribir la latitud y longitud a mano.";
    case "SIN_RESULTADO": return "No encontré esa dirección. Revisa la colonia y el municipio, o escribe la latitud y longitud a mano.";
    case "DIRECCION_INVALIDA": return "Escribe la dirección completa (calle, número, colonia y municipio).";
    default: return "Mapbox no pudo ubicar la dirección. Intenta de nuevo o escribe la latitud y longitud a mano.";
  }
}

// Sucursales de la vacante: { todas, ids } → resumen corto para la lista de vacantes.
export function resumenSucursalesVacante({ todas, ids = [], sucursales = [] } = {}) {
  const total = sucursales.length;
  const elegidas = todas ? sucursales : sucursales.filter((s) => ids.includes(s.id_unidad));
  const sinUbicar = elegidas.filter((s) => !s.ubicada).length;
  const base = todas ? `Todas las sucursales (${total})` : elegidas.length === 1 ? `1 sucursal` : `${elegidas.length} sucursales`;
  return { texto: base, sinUbicar, aviso: sinUbicar ? `${sinUbicar} sin ubicar: el agente no las puede proponer.` : "" };
}

// Lista de ids a guardar: «todas» marcada → [] (todas). Si se marcan todas a mano también es [].
export function idsParaGuardar({ todas, marcadas = [], total = 0 }) {
  if (todas) return [];
  const unicos = [...new Set(marcadas.map(Number))].filter((n) => Number.isInteger(n) && n > 0);
  return unicos.length === total ? [] : unicos.sort((a, b) => a - b);
}
