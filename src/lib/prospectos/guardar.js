import { AVISO_PRIVACIDAD } from "@/lib/legal/documentos";
import { cuerpoProspecto } from "./reglas.mjs";

// Guarda al prospecto sin detener nada: se llama DESPUÉS de abrir WhatsApp, no se espera y sobrevive a que la página
// navegue (keepalive). Si el backend no responde (o falta la migración) queda en consola; la persona sigue igual.
export function guardarProspecto(datos) {
  const backend = process.env.NEXT_PUBLIC_RUTA_BACKEND;
  if (!backend) return;
  try {
    fetch(`${backend}/checador/prospectos/publico`, {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpoProspecto({ ...datos, avisoVersion: AVISO_PRIVACIDAD.version })),
    })
      .then((r) => { if (!r.ok) console.error("No se guardó el prospecto:", r.status); })
      .catch((error) => console.error("No se guardó el prospecto:", error));
  } catch (error) {
    console.error("No se guardó el prospecto:", error);
  }
}
