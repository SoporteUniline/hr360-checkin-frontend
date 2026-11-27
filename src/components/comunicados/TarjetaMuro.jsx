"use client";
// Tarjeta del muro con sus comentarios en la misma tarjeta, igual en Mi espacio (Muro.jsx) y en el panel (MuroPanel.jsx),
// como Facebook: debajo de cada publicación los últimos comentarios y «Escribe un comentario…»; al tocarlo (o «Comentar»
// o «Ver los N comentarios») se abre el hilo completo ahí mismo (Comentarios.jsx, con la fuente /mi o /muro).
import { useCallback, useState } from "react";
import Publicacion from "./Publicacion";
import Comentarios from "./Comentarios";

/** Qué hilos están abiertos y cuántos comentarios se agregaron o borraron desde la última carga del muro. */
export function useHilos() {
  const [abiertos, setAbiertos] = useState({}); // id → { enfocar }
  const [deltas, setDeltas] = useState({});
  const alternar = useCallback((it, { abrir = false, enfocar = false } = {}) => setAbiertos((a) => {
    const n = { ...a };
    if (n[it.id] && !abrir) delete n[it.id];
    else n[it.id] = { enfocar };
    return n;
  }), []);
  const sumar = useCallback((id, n) => setDeltas((d) => ({ ...d, [id]: (d[id] ?? 0) + n })), []);
  return { abiertos, alternar, deltas, sumar };
}

/**
 * fuente: fuenteMuro(...). hilos: useHilos(). megusta: el de useFeedMuro. participa: puede dar «Me gusta» y comentar.
 * yo: nombre de quien mira (avatar junto a «Escribe un comentario…»). El resto va directo a Publicacion.
 */
export default function TarjetaMuro({ it: it0, fuente, hilos, megusta, participa = true, yo = null, tz, ...resto }) {
  const it = { ...it0, comentarios: Math.max(0, (Number(it0.comentarios) || 0) + (hilos.deltas[it0.id] ?? 0)) };
  const abierto = hilos.abiertos[it.id];
  return (
    <Publicacion it={it} tz={tz} participa={participa} yo={yo} alMeGusta={megusta.alternar} ocupado={megusta.ocupado(it.id)} {...resto}
      rutaDetalle={fuente.rutaDetalle} alComentar={hilos.alternar} comentariosAbiertos={Boolean(abierto)}
      comentarios={abierto ? (
        <Comentarios id={it.id} fuente={fuente} incrustado participa={participa} yo={yo} tz={tz} enfocar={abierto.enfocar}
          permite={it.permite_comentarios !== false} alCambiarTotal={(n) => hilos.sumar(it.id, n)} />
      ) : null} />
  );
}
