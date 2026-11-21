"use client";

// Pop-up de venta de la página pública: lee los activos de esta página, elige uno y lo muestra según su
// disparador (segundos, avance de la página o intención de salir). Nunca rompe la página: si el backend no
// responde, simplemente no aparece. Reglas en src/lib/popups/reglas.mjs.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import PopupTarjeta from "./PopupTarjeta";
import { paginaDe, elegirPopup, esperaSegundos, leerHistorial, guardarVisto } from "@/lib/popups/reglas.mjs";

const API = `${process.env.NEXT_PUBLIC_RUTA_BACKEND ?? ""}/checador/popups/publicos`;
const vistosEnVisita = [];

function evento(id, tipo) {
  fetch(`${API}/${id}/evento`, {
    method: "POST",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tipo }),
  }).catch(() => {});
}

const almacen = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export default function PopupVenta() {
  const ruta = usePathname();
  const [popup, setPopup] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const cerrarRef = useRef(null);
  const antesRef = useRef(null);

  useEffect(() => {
    const pagina = paginaDe(ruta);
    if (!pagina || !process.env.NEXT_PUBLIC_RUTA_BACKEND) return undefined;
    const control = new AbortController();
    const limpiar = [];
    let mostrado = false;

    const mostrar = (p) => {
      if (mostrado) return;
      mostrado = true;
      vistosEnVisita.push(p.id);
      guardarVisto(almacen(), p.id);
      antesRef.current = document.activeElement;
      setPopup(p);
      setAbierto(true);
      evento(p.id, "vista");
    };

    fetch(`${API}?pagina=${pagina}`, { signal: control.signal })
      .then((r) => (r.ok ? r.json() : { popups: [] }))
      .then(({ popups }) => {
        const p = elegirPopup(popups, { ancho: window.innerWidth, historial: leerHistorial(almacen()), vistosEnVisita });
        if (!p) return;
        const inicio = Date.now();
        const minimo = 3000;
        if (p.disparador === "scroll") {
          const revisar = () => {
            const alto = document.documentElement.scrollHeight - window.innerHeight;
            const avance = alto > 0 ? (window.scrollY / alto) * 100 : 100;
            if (avance >= Number(p.scroll_pct || 50) && Date.now() - inicio >= minimo) mostrar(p);
          };
          window.addEventListener("scroll", revisar, { passive: true });
          limpiar.push(() => window.removeEventListener("scroll", revisar));
        } else if (p.disparador === "salida" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          const salir = (e) => {
            if (!e.relatedTarget && e.clientY <= 0 && Date.now() - inicio >= minimo) mostrar(p);
          };
          document.addEventListener("mouseout", salir);
          limpiar.push(() => document.removeEventListener("mouseout", salir));
        } else {
          // «tiempo», o «salida» en celular (no hay cursor que salga): a los segundos indicados (20 por defecto).
          const segundos = p.disparador === "salida" ? 20 : esperaSegundos(p);
          const t = window.setTimeout(() => mostrar(p), segundos * 1000);
          limpiar.push(() => window.clearTimeout(t));
        }
      })
      .catch(() => {});

    return () => {
      control.abort();
      limpiar.forEach((f) => f());
    };
  }, [ruta]);

  useEffect(() => {
    if (!abierto) return undefined;
    cerrarRef.current?.focus();
    const tecla = (e) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cerrar solo usa estado estable del pop-up abierto
  }, [abierto]);

  if (!abierto || !popup) return null;

  function cerrar() {
    evento(popup.id, "cierre");
    setAbierto(false);
    antesRef.current?.focus?.();
  }

  return (
    <div className="pv-fondo" onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="pv-titulo" className="pv-dialogo">
        <PopupTarjeta
          popup={popup}
          cerrarRef={cerrarRef}
          alCerrar={cerrar}
          alClic={() => {
            evento(popup.id, "clic");
            setAbierto(false);
          }}
        />
      </div>
    </div>
  );
}
