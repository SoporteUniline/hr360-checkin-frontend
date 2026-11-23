"use client";

// Guardia de salida con cambios sin guardar (23/11/2026). Cualquier pantalla con un formulario la activa con
// useGuardiaSalida({ hayCambios, guardar }); mientras haya cambios, antes de salir se pregunta
// «Tienes cambios sin guardar. ¿Qué quieres hacer?» → Guardar y salir · Salir sin guardar · Seguir editando.
// Cubre: botones propios de la pantalla (confirmarSalida), menú lateral y buscador (confirmarSalida), enlaces <a>/<Link>
// internos (clic en fase de captura), botón atrás del navegador (entrada extra en el historial + popstate) y recargar o
// cerrar la pestaña (beforeunload: ahí el navegador solo permite su diálogo, sin texto propio).
// Sin cambios no hace nada: ni entrada extra en el historial, ni beforeunload, ni clics detenidos.
// Lógica pura (comparar valores, qué enlaces se detienen) en lib/cambiosPendientes.mjs.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { debeDetenerEnlace, decidirTrasGuardar, rutaInterna } from "@/lib/cambiosPendientes.mjs";

const Contexto = createContext(null);
const MARCA = "__cambiosPendientes";

export function CambiosPendientesProvider({ children }) {
  const router = useRouter();
  const guardias = useRef(new Map()); // id → { hayCambios, guardar, descartada }
  const [conCambios, setConCambios] = useState(false);
  const [pregunta, setPregunta] = useState(null); // { accion }
  const [guardando, setGuardando] = useState(false);
  const saliendo = useRef(false);
  const centinela = useRef(false); // hay una entrada extra nuestra en el historial
  const esperaPop = useRef(null);
  const cola = useRef(Promise.resolve());

  const activa = useCallback(() => {
    if (saliendo.current) return null;
    for (const g of guardias.current.values()) if (g.hayCambios && !g.descartada) return g;
    return null;
  }, []);
  const recalcular = useCallback(() => setConCambios(Boolean(activa())), [activa]);

  // Entrada extra en el historial mientras hay cambios: el botón atrás la consume primero y así se puede preguntar.
  // Todas las altas y bajas pasan por una sola cola para no cruzar un back() pendiente con un pushState.
  const ajustarHistorial = useCallback(() => {
    cola.current = cola.current.then(() => new Promise((resolve) => {
      const quiere = Boolean(activa());
      if (quiere && !centinela.current) {
        window.history.pushState({ ...(window.history.state ?? {}), [MARCA]: true }, "", window.location.href);
        centinela.current = true;
        return resolve();
      }
      if (!quiere && centinela.current) {
        centinela.current = false;
        // Si ya se navegó a otra página, la entrada quedó atrás y no se toca (un back() desharía esa navegación).
        if (!window.history.state?.[MARCA]) return resolve();
        const limite = setTimeout(() => { esperaPop.current = null; resolve(); }, 500);
        esperaPop.current = () => { clearTimeout(limite); esperaPop.current = null; resolve(); };
        window.history.back();
        return undefined;
      }
      return resolve();
    }));
    return cola.current;
  }, [activa]);

  useEffect(() => { ajustarHistorial(); }, [conCambios, ajustarHistorial]);

  // Salir de verdad: sin preguntar otra vez y sin dejar la entrada extra en el historial.
  // - Si la acción navega (navega: true), recibe { reemplazar }: con la entrada extra arriba, navega reemplazándola
  //   (router.replace, history.go(-2)) en vez de hacer back() y luego push (dos recorridos seguidos se pisan en Next).
  // - Si no navega (cerrar la ficha), primero se quita la entrada extra con back() y luego se ejecuta.
  const salir = useCallback(async (accion, navega) => {
    let donde = window.location.href;
    // Se decide antes de soltar la guardia: así el efecto de ajustarHistorial ya no ve la entrada extra y no hace back().
    const reemplazar = Boolean(navega && centinela.current && window.history.state?.[MARCA]);
    if (navega) centinela.current = false;
    saliendo.current = true;
    setConCambios(false);
    try {
      if (!navega) await ajustarHistorial();
      donde = window.location.href;
      accion({ reemplazar });
    } finally {
      saliendo.current = false;
      // Si la acción no cerró la pantalla ni cambió de página (p. ej. ir a la misma ruta), la guardia vuelve a cuidar lo
      // que quede abierto.
      setTimeout(() => {
        if (window.location.href !== donde) return;
        for (const g of guardias.current.values()) g.descartada = false;
        recalcular();
      }, 1500);
    }
  }, [ajustarHistorial, recalcular]);

  // accion: lo que hace salir. { navega: true } si navega a otra página (recibe { reemplazar }).
  const confirmarSalida = useCallback((accion, { navega = false } = {}) => {
    if (!activa()) { accion({ reemplazar: false }); return; }
    setPregunta({ accion, navega });
  }, [activa]);

  const registrar = useCallback((id, datos) => {
    const previa = guardias.current.get(id);
    guardias.current.set(id, { descartada: false, ...previa, ...datos });
    recalcular();
  }, [recalcular]);
  const quitar = useCallback((id) => { guardias.current.delete(id); recalcular(); }, [recalcular]);

  // Recargar / cerrar la pestaña.
  useEffect(() => {
    if (!conCambios) return undefined;
    const antesDeSalir = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", antesDeSalir);
    return () => window.removeEventListener("beforeunload", antesDeSalir);
  }, [conCambios]);

  // Botón atrás del navegador (y el de Android, que llama a history.back()).
  useEffect(() => {
    const alRegresar = () => {
      if (esperaPop.current) { esperaPop.current(); return; }
      if (!centinela.current) return;
      centinela.current = false; // la consumió el usuario
      if (!activa()) return;
      window.history.pushState({ ...(window.history.state ?? {}), [MARCA]: true }, "", window.location.href);
      centinela.current = true;
      setPregunta({ accion: ({ reemplazar }) => window.history.go(reemplazar ? -2 : -1), navega: true });
    };
    window.addEventListener("popstate", alRegresar);
    return () => window.removeEventListener("popstate", alRegresar);
  }, [activa]);

  // Enlaces internos (<a>, <Link>): en captura, antes de que Next navegue.
  useEffect(() => {
    const alClic = (e) => {
      if (!activa() || e.defaultPrevented) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!a) return;
      const detener = debeDetenerEnlace({
        href: a.getAttribute("href"),
        origen: window.location.origin,
        actual: window.location.href,
        target: a.getAttribute("target") ?? "",
        descarga: a.hasAttribute("download"),
        boton: e.button,
        teclas: { meta: e.metaKey, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey },
      });
      if (!detener) return;
      e.preventDefault();
      e.stopPropagation();
      const ruta = rutaInterna(a.href, window.location.href);
      setPregunta({ accion: ({ reemplazar }) => (reemplazar ? router.replace(ruta) : router.push(ruta)), navega: true });
    };
    document.addEventListener("click", alClic, true);
    return () => document.removeEventListener("click", alClic, true);
  }, [activa, router]);

  const seguirEditando = () => { if (!guardando) setPregunta(null); };
  const salirSinGuardar = () => {
    const { accion, navega } = pregunta;
    for (const g of guardias.current.values()) g.descartada = true;
    setPregunta(null);
    salir(accion, navega);
  };
  const guardarYSalir = async () => {
    const guardia = activa();
    const { accion, navega } = pregunta;
    setGuardando(true);
    let guardado = false;
    try {
      guardado = guardia ? await guardia.guardar() : true;
    } catch {
      guardado = false;
    } finally {
      setGuardando(false);
    }
    setPregunta(null);
    // Si falló la validación o el servidor, la pantalla ya mostró el error: se queda ahí.
    if (decidirTrasGuardar(guardado) === "salir") salir(accion, navega);
  };

  const valor = useMemo(() => ({ registrar, quitar, confirmarSalida }), [registrar, quitar, confirmarSalida]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      <AlertDialog open={Boolean(pregunta)} onOpenChange={(abierto) => { if (!abierto) seguirEditando(); }}>
        <AlertDialogContent data-dialogo-cambios className="max-w-[calc(100%-2rem)] gap-5 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#080d36]">Tienes cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>¿Qué quieres hacer? Si sales sin guardar, los cambios se pierden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:justify-stretch">
            <button
              type="button"
              onClick={guardarYSalir}
              disabled={guardando}
              className="min-h-[44px] w-full rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {guardando ? "Guardando…" : "Guardar y salir"}
            </button>
            <button
              type="button"
              onClick={salirSinGuardar}
              disabled={guardando}
              className="min-h-[44px] w-full rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Salir sin guardar
            </button>
            <button
              type="button"
              onClick={seguirEditando}
              disabled={guardando}
              autoFocus
              className="min-h-[44px] w-full rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              Seguir editando
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Contexto.Provider>
  );
}

// Para quien sale por código (menú lateral, buscador, cerrar una ventana): pregunta antes si hay cambios.
// confirmarSalida(accion, { navega }) · Fuera del proveedor, ejecuta la acción sin preguntar.
const sinGuardia = (accion) => accion({ reemplazar: false });
export function useConfirmarSalida() {
  const ctx = useContext(Contexto);
  return ctx?.confirmarSalida ?? sinGuardia;
}

// Para la pantalla con el formulario. `guardar` debe regresar true solo si se guardó bien.
export function useGuardiaSalida({ hayCambios, guardar }) {
  const ctx = useContext(Contexto);
  const [id] = useState(() => Symbol("guardia"));
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;
  const registrar = ctx?.registrar;
  const quitar = ctx?.quitar;
  useEffect(() => {
    registrar?.(id, { hayCambios: Boolean(hayCambios), guardar: () => guardarRef.current() });
  }, [registrar, id, hayCambios]);
  useEffect(() => () => quitar?.(id), [quitar, id]);
  return useConfirmarSalida();
}
