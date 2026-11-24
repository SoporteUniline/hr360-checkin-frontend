// Punto discreto con el estado de conexión y de rostros de este aparato. El texto queda para soporte en
// title/aria-label y para lectores de pantalla; no se muestra para que el reloj se vea limpio.
const COLORES = { listo: "bg-green-500", preparando: "bg-slate-300", sinConexion: "bg-amber-500" };

export function estadoConexion({ offline, localFacesReady }) {
  if (offline) return localFacesReady
    ? { tono: "sinConexion", texto: "Sin conexión · Reconocimiento local listo · Pendiente de subir" }
    : { tono: "sinConexion", texto: "Sin conexión · Código / QR · Rostro sin preparar" };
  return localFacesReady
    ? { tono: "listo", texto: "Reconocimiento offline preparado en este dispositivo" }
    : { tono: "preparando", texto: "Los rostros de la empresa se descargan automáticamente con internet, sin iniciar sesión." };
}

export default function IndicadorConexion({ tono = "listo", texto = "", className = "" }) {
  return (
    <span className={`inline-flex size-6 shrink-0 items-center justify-center ${className}`} title={texto}>
      <span aria-hidden="true" className={`size-3 rounded-full ring-2 ring-white ${COLORES[tono] || COLORES.listo}`} />
      <span role="status" className="sr-only">{texto}</span>
    </span>
  );
}
