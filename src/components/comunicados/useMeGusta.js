"use client";
// «Me gusta» optimista para publicaciones y comentarios: cambia al instante, se ajusta con lo que responde el servidor
// ({ me_gusta, reacciones }) y regresa como estaba si falla. Un clic a la vez por elemento.
import { useCallback, useState } from "react";
import axios from "@/lib/axios";
import { alternarMeGusta, errorDe } from "@/lib/comunicados/comunicados.mjs";

export default function useMeGusta(url) {
  const [cambios, setCambios] = useState({}); // id → { me_gusta, reacciones }
  const [ocupados, setOcupados] = useState({});
  const [error, setError] = useState(null);
  const aplicar = useCallback((it) => (it && cambios[it.id] ? { ...it, ...cambios[it.id] } : it), [cambios]);
  const alternar = useCallback(async (it) => {
    if (!it || ocupados[it.id]) return;
    const antes = cambios[it.id];
    const actual = antes ? { ...it, ...antes } : it;
    const nuevo = alternarMeGusta(actual);
    setError(null);
    setCambios((c) => ({ ...c, [it.id]: { me_gusta: nuevo.me_gusta, reacciones: nuevo.reacciones } }));
    setOcupados((o) => ({ ...o, [it.id]: true }));
    try {
      const r = await axios.post(url(it.id), {});
      if (r.data && typeof r.data.me_gusta === "boolean") setCambios((c) => ({ ...c, [it.id]: { me_gusta: r.data.me_gusta, reacciones: Number(r.data.reacciones) || 0 } }));
    } catch (e) {
      setCambios((c) => { const n = { ...c }; if (antes) n[it.id] = antes; else delete n[it.id]; return n; });
      setError(errorDe(e, "No se pudo registrar tu «Me gusta». Intenta de nuevo."));
    } finally {
      setOcupados((o) => { const n = { ...o }; delete n[it.id]; return n; });
    }
  }, [cambios, ocupados, url]);
  return { aplicar, alternar, ocupado: (id) => Boolean(ocupados[id]), error };
}
