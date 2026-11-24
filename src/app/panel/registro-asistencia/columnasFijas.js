// Estado · motivo y Reloj quedan fijos a la derecha de la tabla: son las dos acciones del día y no deben quedar fuera
// de la pantalla aunque haya muchas columnas. Si el Reloj está oculto, Estado se pega al borde.
export const FIJA_RELOJ = "sticky right-0 w-16 min-w-[4rem]";
export const fijaEstado = (conReloj) =>
  `sticky ${conReloj ? "right-16" : "right-0"} w-[240px] min-w-[240px] shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.14)]`;
