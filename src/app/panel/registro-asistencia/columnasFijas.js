// Estado, Motivo y Reloj quedan fijos a la derecha de la tabla: son las acciones del día y no deben quedar fuera de la
// pantalla aunque haya muchas columnas. Cada una se pega a la derecha de las que estén visibles después de ella.
export const FIJA_RELOJ = "sticky right-0 w-16 min-w-[4rem]";
const ANCHO_RELOJ = 64;
const ANCHO_MOTIVO = 230;
export const fijaMotivo = () => "sticky w-[230px] min-w-[230px] max-w-[230px]";
export const derechaMotivo = (conReloj) => ({ right: conReloj ? ANCHO_RELOJ : 0 });
export const fijaEstado = () =>
  "sticky w-[190px] min-w-[190px] max-w-[190px] shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.14)]";
export const derechaEstado = (conReloj, conMotivo) => ({ right: (conReloj ? ANCHO_RELOJ : 0) + (conMotivo ? ANCHO_MOTIVO : 0) });
