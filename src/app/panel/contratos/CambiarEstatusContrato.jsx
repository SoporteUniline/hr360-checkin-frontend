"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { contratosApi } from "@/lib/contratosApi";
import { useSnackbar } from "notistack";
import { EstadoBadge } from "@/lib/estados";

const ESTATUS = ["Activo", "Suspendido", "Terminado", "Cancelado"];

// Estatus que representan un cierre del contrato: conviene registrar motivo.
const REQUIERE_MOTIVO = new Set(["Terminado", "Cancelado"]);

/**
 * Diálogo para cambiar el estatus de un contrato.
 * Usa el endpoint existente contratosApi.actualizarEstatus(id, estatus, motivo).
 */
export default function CambiarEstatusContrato({
  open,
  setOpen,
  contrato,
  onSaved,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [estatus, setEstatus] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  // Al abrir, precarga el estatus actual del contrato.
  useEffect(() => {
    if (open && contrato) {
      const actual = (contrato.estatus || "").toLowerCase();
      const match = ESTATUS.find((e) => e.toLowerCase() === actual);
      setEstatus(match || "");
      setMotivo(contrato.motivo_terminacion || "");
    }
  }, [open, contrato]);

  const id = contrato?.id || contrato?.id_contrato;
  const sinCambio =
    (estatus || "").toLowerCase() === (contrato?.estatus || "").toLowerCase();
  const faltaMotivo = REQUIERE_MOTIVO.has(estatus) && !motivo.trim();

  const guardar = async () => {
    if (!id || !estatus || sinCambio || faltaMotivo) return;
    setSaving(true);
    try {
      await contratosApi.actualizarEstatus(
        id,
        estatus,
        REQUIERE_MOTIVO.has(estatus) ? motivo.trim() : undefined,
      );
      enqueueSnackbar("Estatus del contrato actualizado", {
        variant: "success",
      });
      setOpen(false);
      onSaved?.();
    } catch (e) {
      enqueueSnackbar(
        e?.response?.data?.error || "No se pudo actualizar el estatus",
        { variant: "error" },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar estatus del contrato</DialogTitle>
          <DialogDescription>
            {contrato?.folio ? `Folio ${contrato.folio}. ` : ""}
            Estatus actual:{" "}
            <EstadoBadge estado={contrato?.estatus} className="ml-1 align-middle" />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nuevo estatus</Label>
            <Select value={estatus} onValueChange={setEstatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un estatus" />
              </SelectTrigger>
              <SelectContent>
                {ESTATUS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {REQUIERE_MOTIVO.has(estatus) && (
            <div className="space-y-2">
              <Label>
                Motivo <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe el motivo del cambio de estatus…"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={guardar}
            disabled={saving || !estatus || sinCambio || faltaMotivo}
            className="bg-gradient-to-br from-brand to-[#4f46e5] font-semibold text-white hover:opacity-95"
          >
            {saving ? "Guardando…" : "Guardar cambio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
