// Estado, Motivo y Reloj al final de la tabla. Ya NO quedan fijas a la derecha (decisión del dueño, 25/11/2026):
// se desplazan con el resto de las columnas. Solo conservan su ancho. La columna de la persona sigue fija a la izquierda.
export const FIJA_RELOJ = "w-16 min-w-[4rem]";
export const fijaMotivo = () => "w-[230px] min-w-[230px] max-w-[230px]";
export const derechaMotivo = () => undefined;
export const fijaEstado = () => "w-[190px] min-w-[190px] max-w-[190px]";
export const derechaEstado = () => undefined;
