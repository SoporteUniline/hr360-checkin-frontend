"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function EliminarCampoDialog({ campo, empresa, onClose, onComplete }) {
  const { enqueueSnackbar } = useSnackbar();
  const [uso, setUso] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setUso(null);
    setError("");
    if (!campo) return;
    const controller = new AbortController();
    setLoading(true);
    axios.get(`/checador/campos-personalizados/${campo.id}/uso`, { params: { empresa }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setUso(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e.response?.data?.error || "No se pudo comprobar si este campo tiene información."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [campo, empresa, attempt]);

  async function confirm() {
    if (!uso || busy) return;
    setBusy(true);
    setError("");
    const desactivar = uso.empleados_con_valor > 0;
    try {
      const url = `/checador/campos-personalizados/${campo.id}`;
      if (desactivar) await axios.put(url, { activo: false }, { params: { empresa } });
      else await axios.delete(url, { params: { empresa } });
      enqueueSnackbar(desactivar ? "Campo desactivado. Su información se conserva." : "Campo eliminado correctamente", { variant: "success" });
      onClose();
      Promise.resolve(onComplete()).catch(() => enqueueSnackbar("El cambio se guardó. Actualiza la página para ver la lista reciente.", { variant: "warning" }));
    } catch (e) {
      if (e.response?.status === 409 && Number.isInteger(e.response.data.empleados_con_valor)) {
        setUso(previous => ({ ...previous, empleados_con_valor: e.response.data.empleados_con_valor }));
      }
      setError(e.response?.data?.error || "No se pudo completar la acción. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  const conDatos = uso?.empleados_con_valor > 0;
  return (
    <Dialog open={!!campo} onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{conDatos ? "Este campo tiene información" : "Eliminar campo personalizado"}</DialogTitle>
          <DialogDescription>
            {loading ? "Comprobando todos los empleados, incluidos los inactivos…" : uso ? conDatos
              ? `“${uso.nombre}” tiene información en ${uso.empleados_con_valor} ${uso.empleados_con_valor === 1 ? "empleado" : "empleados"}. Puedes desactivarlo para ocultarlo y conservar sus datos.`
              : `Ningún empleado tiene un valor guardado en “${uso.nombre}”. ¿Quieres eliminarlo? Esta acción no se puede deshacer.`
              : "Comprobaremos que ningún empleado tenga información guardada antes de permitir eliminarlo."}
          </DialogDescription>
        </DialogHeader>
        {loading && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Comprobando uso…</div>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {conDatos && !uso.activo && <p className="text-sm text-gray-600">Este campo ya está desactivado. Su información se conserva.</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{conDatos && !uso.activo ? "Cerrar" : "Cancelar"}</Button>
          {!loading && !uso && <Button type="button" onClick={() => setAttempt(value => value + 1)}>Reintentar</Button>}
          {!loading && uso && (!conDatos || uso.activo) && <Button type="button" variant={conDatos ? "default" : "destructive"} disabled={busy} onClick={confirm}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{conDatos ? "Desactivar campo" : "Eliminar campo"}
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
