"use client";

import { useCallback, useEffect, useState } from "react";
import { demoKey, openDemo, readDemo, updateDemo } from "@/lib/reclutamiento/demoStore";

export default function useReclutamientoDemo(scope, publicId) {
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(() => {
    if (!scope && !publicId) return;
    try {
      setWorkspace(publicId ? { id: publicId, data: readDemo(publicId) } : openDemo(scope));
      setError("");
    } catch (cause) {
      setError(
        cause.message ||
          "No se pudo abrir la demostración. Permite el almacenamiento del navegador y vuelve a intentar."
      );
    } finally {
      setLoaded(true);
    }
  }, [scope, publicId]);
  useEffect(() => {
    setLoaded(false);
    setWorkspace(null);
    reload();
  }, [reload]);
  useEffect(() => {
    const id = workspace?.id;
    if (!id) return;
    const onStorage = (event) => {
      if (!event.key || event.key === demoKey(id)) reload();
    };
    const onLocal = (event) => {
      if (event.detail === id) reload();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("reclutamiento-demo-change", onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("reclutamiento-demo-change", onLocal);
    };
  }, [workspace?.id, reload]);
  const update = useCallback(
    (updater) => {
      if (!workspace?.id) return false;
      try {
        const data = updateDemo(workspace.id, updater);
        setWorkspace({ id: workspace.id, data });
        setError("");
        return true;
      } catch (cause) {
        setError(
          `No se guardó el cambio. ${
            cause.message || "Revisa el espacio disponible en tu navegador."
          }`
        );
        return false;
      }
    },
    [workspace?.id]
  );
  return { id: workspace?.id, data: workspace?.data, error, loaded, reload, update };
}
