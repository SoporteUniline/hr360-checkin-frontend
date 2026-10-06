"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSnackbar } from "notistack";
import { useRouter, usePathname } from "next/navigation";
import {
  STORAGE_PREFIX,
  seedState,
  loadDemo,
  demoCommand,
} from "@/lib/evaluaciones/demoStore.mjs";
import { Button } from "@/components/ui/button";
const Context = createContext(null);
export const useEvaluations = () => useContext(Context);
export function EvaluationProvider({ children, employee = false }) {
  const { dataUser, isAuthChecked, isLoggedIn } = useAuth();
  const company =
    dataUser?.id_empresa ??
    dataUser?.empresas_detalle?.[0]?.id_empresa ??
    dataUser?.empresas?.[0];
  const user = dataUser?.id_usuario ?? dataUser?.id_empleado;
  if (!isAuthChecked)
    return (
      <div className="p-8" role="status">
        Cargando evaluaciones…
      </div>
    );
  if (!isLoggedIn || !user || !company)
    return (
      <div className="p-8">
        Necesitas una sesión y empresa activas para abrir la demostración.
      </div>
    );
  const storageKey = `${STORAGE_PREFIX}:${company}:${user}`;
  return (
    <ScopedProvider
      key={storageKey}
      storageKey={storageKey}
      employee={employee}
    >
      {children}
    </ScopedProvider>
  );
}
function ScopedProvider({ children, storageKey, employee }) {
  const [state, setState] = useState(null),
    [error, setError] = useState(""),
    [actorId, setActorId] = useState(employee ? "p-mariana" : "p-rh");
  const current = useRef(null),
    { enqueueSnackbar } = useSnackbar(),
    router = useRouter(),
    pathname = usePathname();
  const base = employee
    ? "/empleado/panel/evaluaciones"
    : "/panel/evaluaciones";
  useEffect(() => {
    try {
      const loaded = loadDemo(localStorage, storageKey);
      current.current = loaded;
      setState(loaded);
    } catch (e) {
      setError(e.message);
    }
  }, [storageKey]);
  useEffect(() => {
    const sync = (e) => {
      if (e.key === storageKey) {
        try {
          const loaded = loadDemo(localStorage, storageKey);
          current.current = loaded;
          setState(loaded);
        } catch (e) {
          setError(e.message);
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);
  const reset = () => {
    try {
      const fresh = seedState();
      localStorage.setItem(storageKey, JSON.stringify(fresh));
      current.current = fresh;
      setState(fresh);
      setError("");
      router.push(base);
    } catch {
      setError(
        "No se pudo guardar. Revisa el almacenamiento de este navegador.",
      );
    }
  };
  if (error)
    return (
      <div className="p-8 space-y-4">
        <p role="alert">{error}</p>
        <Button onClick={reset}>
          Restablecer únicamente esta demostración
        </Button>
      </div>
    );
  if (!state)
    return (
      <div className="p-8" role="status">
        Preparando datos de demostración…
      </div>
    );
  const actor = state.people.find((p) => p.id === actorId) || state.people[0];
  const run = (command, message) => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw && JSON.parse(raw).revision !== current.current.revision) {
        const latest = loadDemo(localStorage, storageKey);
        current.current = latest;
        setState(latest);
        throw new Error(
          "La demostración cambió en otra pestaña. Revisa los datos e intenta de nuevo.",
        );
      }
      const next = demoCommand(current.current, command, actor);
      localStorage.setItem(storageKey, JSON.stringify(next));
      current.current = next;
      setState(next);
      if (message) enqueueSnackbar(message, { variant: "success" });
      return next;
    } catch (e) {
      enqueueSnackbar(
        e.name === "QuotaExceededError"
          ? "El navegador no tiene espacio. No se guardaron los cambios."
          : e.message,
        { variant: "error" },
      );
      return null;
    }
  };
  const setActor = (id) => {
    if (
      !window.dispatchEvent(
        new Event("evaluation-before-navigate", { cancelable: true }),
      )
    )
      return;
    setActorId(id);
    router.push(
      `${base}/${state.people.find((p) => p.id === id)?.role === "employee" ? "mis-pendientes" : ""}`,
    );
  };
  return (
    <Context.Provider
      value={{
        state,
        actor,
        run,
        reset,
        setActor,
        base,
        href: (to = "") => `${base}${to ? "/" + to : ""}`,
        navigate: (to = "") => router.push(`${base}${to ? "/" + to : ""}`),
        section: pathname.slice(base.length + 1),
        notify: (message, variant = "info") =>
          enqueueSnackbar(message, { variant }),
      }}
    >
      {children}
    </Context.Provider>
  );
}
