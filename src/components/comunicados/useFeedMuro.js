"use client";
// Datos del muro, iguales para Mi espacio y el panel (cambia solo la fuente: src/lib/comunicados fuenteMuro):
// páginas con cursor («Ver más»), fijadas arriba sin repetir y «Me gusta» optimista. fuente = null: todavía no se pide
// (p. ej. sin la empresa elegida).
import useSWRInfinite from "swr/infinite";
import { ordenarMuro } from "@/lib/comunicados/comunicados.mjs";
import useMeGusta from "./useMeGusta";
import { get } from "./comun";

// Cada vez que se monta (volver del detalle, cambiar de pestaña del panel) se pide de nuevo COMPLETO: sin esto se veía la
// copia guardada en memoria, sin el me gusta ni los comentarios nuevos y con la confirmación todavía pendiente
// (hotfix #267 del muro de Mi espacio; aplica igual al muro del panel).
const OPCIONES = { revalidateOnMount: true, revalidateAll: true, revalidateOnFocus: true, shouldRetryOnError: false };

export default function useFeedMuro(fuente) {
  const llave = (i, previa) => {
    if (!fuente) return null;
    if (i === 0) return fuente.muro();
    return previa?.siguiente ? fuente.muro(previa.siguiente) : null;
  };
  const swr = useSWRInfinite(llave, get, OPCIONES);
  const megusta = useMeGusta(fuente ? fuente.meGusta : () => null);
  const { data, size, setSize, isValidating } = swr;
  const todos = (data ?? []).flatMap((p) => p?.items ?? []).map(megusta.aplicar);
  return {
    ...swr,
    megusta,
    primera: data?.[0],
    todos,
    ...ordenarMuro(todos),
    hayMas: Boolean(data?.[data.length - 1]?.siguiente),
    cargandoMas: isValidating && size > (data?.length ?? 0),
    verMas: () => setSize(size + 1),
  };
}
