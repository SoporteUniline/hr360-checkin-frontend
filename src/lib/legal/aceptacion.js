import { AVISO_PRIVACIDAD, TERMINOS } from "./documentos";

// Documentos que se aceptan en cada formulario del sitio (con su versión vigente).
export const DOCS_AVISO = [{ id: AVISO_PRIVACIDAD.id, version: AVISO_PRIVACIDAD.version }];
export const DOCS_CUENTA = [...DOCS_AVISO, { id: TERMINOS.id, version: TERMINOS.version }];

// Deja constancia de la aceptación (fecha, IP y versión las guarda el backend). Nunca detiene el formulario:
// si el backend no responde, la persona sigue y el error queda en consola. Devuelve true si se registró.
export async function registrarAceptacion({ contexto, documentos, nombre, correo, telefono }) {
  const backend = process.env.NEXT_PUBLIC_RUTA_BACKEND;
  if (!backend) return false;
  try {
    const r = await fetch(`${backend}/checador/legal/aceptaciones`, {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contexto, documentos, nombre, correo, telefono }),
    });
    if (!r.ok) console.error("No se registró la aceptación legal:", r.status);
    return r.ok;
  } catch (error) {
    console.error("No se registró la aceptación legal:", error);
    return false;
  }
}
