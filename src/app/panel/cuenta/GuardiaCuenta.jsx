"use client";

// Guardia de salida de Mi cuenta (24/11/2026). La pantalla tiene varios formularios que se guardan por separado (foto,
// información básica, contraseña, logo y datos de la empresa). La guardia común (components/cambios/CambiosPendientes)
// guarda UNA guardia al elegir «Guardar y salir»; por eso aquí se juntan todas en una sola: si hay cambios en varias,
// «Guardar y salir» las guarda una por una y solo sale si todas se guardaron bien.
// Cada formulario reporta con useCambiosCuenta(clave, { hayCambios, guardar }). Fuera del proveedor no hace nada
// (ImagenEmpresa también se usa en el alta de empresas del dashboard).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useGuardiaSalida } from "@/components/cambios/CambiosPendientes";

const Contexto = createContext(null);

export function GuardiaCuentaProvider({ children }) {
  const guardadores = useRef(new Map()); // clave → guardar()
  const [pendientes, setPendientes] = useState(() => new Set());

  const reportar = useCallback((clave, hayCambios, guardar) => {
    if (guardar) guardadores.current.set(clave, guardar);
    setPendientes((prev) => {
      if (prev.has(clave) === hayCambios) return prev;
      const sig = new Set(prev);
      if (hayCambios) sig.add(clave); else sig.delete(clave);
      return sig;
    });
  }, []);

  const pendientesRef = useRef(pendientes);
  pendientesRef.current = pendientes;
  const guardarTodo = useCallback(async () => {
    for (const clave of [...pendientesRef.current]) {
      const guardar = guardadores.current.get(clave);
      if (!guardar) continue;
      if ((await guardar()) !== true) return false;
    }
    return true;
  }, []);

  useGuardiaSalida({ hayCambios: pendientes.size > 0, guardar: guardarTodo });
  const valor = useMemo(() => ({ reportar }), [reportar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

// `guardar` debe regresar true solo si se guardó bien.
export function useCambiosCuenta(clave, { hayCambios, guardar }) {
  const ctx = useContext(Contexto);
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;
  const reportar = ctx?.reportar;
  useEffect(() => {
    reportar?.(clave, Boolean(hayCambios), () => guardarRef.current());
  }, [reportar, clave, hayCambios]);
  useEffect(() => () => reportar?.(clave, false), [reportar, clave]);
}
