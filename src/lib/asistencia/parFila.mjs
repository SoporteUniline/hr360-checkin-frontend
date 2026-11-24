// El par «Qué pasó» + «Motivo» que se está editando en una fila de Asistencias, compartido por sus dos celdas (Estado y
// Motivo son columnas separadas pero editan lo mismo y se guardan juntos con OK). Un mapa por id de asistencia con
// suscriptores, para useSyncExternalStore.
const pares = new Map();
const oyentes = new Set();
const avisar = () => { for (const f of oyentes) f(); };

export const suscribir = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
export const leerPar = (id) => pares.get(String(id)) ?? null;
export function ponerPar(id, par) {
  if (par == null) pares.delete(String(id)); else pares.set(String(id), par);
  avisar();
}
