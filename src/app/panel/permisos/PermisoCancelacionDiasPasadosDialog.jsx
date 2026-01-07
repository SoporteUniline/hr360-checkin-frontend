"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDateDMY } from "@/lib/formatDate";

/**
 * Modal: Reclasificación de días PASADOS al cancelar un permiso.
 *
 * Problema de negocio resuelto:
 * - Si se cancela un permiso después de que ya pasaron algunos días, RRHH/Administrador
 *   debe decidir qué "tipo de registro" (tipos_permiso) se aplicará en asistencias
 *   para esos días pasados.
 *
 * Relación:
 * - Invocado desde `src/app/panel/permisos/PermisoDialog.jsx` al seleccionar estado "Cancelado".
 * - El payload resultante se envía a `permisosApi.actualizarEstado(..., { dias_pasados: [...] })`.
 * - Backend aplica esos cambios en `solicitudPermisoController.actualizarEstado` y `solicitudPermisoModel`.
 */
export default function PermisoCancelacionDiasPasadosDialog({
  open,
  setOpen,
  // Array de fechas ISO 'YYYY-MM-DD' que ya pasaron dentro del rango del permiso
  fechasPasadas = [],
  // Catálogo de tipos (tipos_permiso). Se espera: [{ id, nombre, clave, ... }]
  tiposRegistro = [],
  // Set de festivos de la empresa (YYYY-MM-DD). Relación: calculado en `src/app/panel/permisos/page.jsx`.
  festivosSet = new Set(),
  onConfirm, // (diasPasadosPayload) => void
}) {
  const [error, setError] = useState("");
  const [tipoTodos, setTipoTodos] = useState("");
  const [porDia, setPorDia] = useState(() => ({})); // { [fecha]: "id_tipo_permiso" }

  const fechasOrdenadas = useMemo(() => {
    const arr = Array.isArray(fechasPasadas) ? [...fechasPasadas] : [];
    arr.sort((a, b) => String(a).localeCompare(String(b)));
    return arr;
  }, [fechasPasadas]);

  const opciones = useMemo(() => {
    const arr = Array.isArray(tiposRegistro) ? tiposRegistro : [];
    // Orden estable por nombre para UX (no tocar el backend).
    return [...arr].sort((a, b) =>
      String(a?.nombre || "").localeCompare(String(b?.nombre || ""), "es")
    );
  }, [tiposRegistro]);

  /**
   * Negocio:
   * - Domingos y días festivos NO deben poder modificarse para evitar inconsistencias.
   * - Domingo -> "Día de Descanso"
   * - Festivo -> "Día Festivo Oficial"
   * - Prioridad: Domingo gana sobre Festivo (consistencia con backend).
   */
  const normalizar = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const idDescanso = useMemo(() => {
    const candidatos = ["dia de descanso", "dia descanso", "descanso"];
    const found = opciones.find((t) => {
      const clave = normalizar(t?.clave);
      const nombre = normalizar(t?.nombre);
      return candidatos.some((c) => clave === c || nombre === c);
    });
    return found?.id ? String(found.id) : "";
  }, [opciones]);

  const idFestivo = useMemo(() => {
    const candidatos = ["dia festivo oficial", "dia festivo", "festivo"];
    const found = opciones.find((t) => {
      const clave = normalizar(t?.clave);
      const nombre = normalizar(t?.nombre);
      return candidatos.some((c) => clave === c || nombre === c);
    });
    return found?.id ? String(found.id) : "";
  }, [opciones]);

  const lockedMap = useMemo(() => {
    const map = new Map(); // fecha -> { id, motivo }
    fechasOrdenadas.forEach((fechaISO) => {
      const iso = String(fechaISO);
      const d = dayjs(iso);
      const esDomingo = d.isValid() ? d.day() === 0 : false;
      const esFestivo = festivosSet?.has(iso) || false;

      if (esDomingo && idDescanso) {
        map.set(iso, { id: idDescanso, motivo: "Domingo" });
        return;
      }
      if (esFestivo && idFestivo) {
        map.set(iso, { id: idFestivo, motivo: "Día festivo" });
      }
    });
    return map;
  }, [fechasOrdenadas, festivosSet, idDescanso, idFestivo]);

  // Resetear al abrir/cerrar o al cambiar fechas.
  useEffect(() => {
    if (!open) return;
    setError("");
    setTipoTodos("");
    const init = {};
    (fechasPasadas || []).forEach((f) => {
      const fecha = String(f);
      // Si es domingo/festivo: preseleccionar y bloquear.
      const locked = lockedMap.get(fecha);
      init[fecha] = locked?.id || "";
    });
    setPorDia(init);
  }, [open, fechasPasadas, lockedMap]);

  function aplicarATodos(idTipo) {
    setTipoTodos(idTipo);
    setPorDia((prev) => {
      const next = { ...prev };
      fechasOrdenadas.forEach((f) => {
        const fecha = String(f);
        // Respetar bloqueos (domingo/festivo) para evitar inconsistencias.
        const locked = lockedMap.get(fecha);
        next[fecha] = locked?.id || idTipo;
      });
      return next;
    });
  }

  function confirmar() {
    setError("");
    // Validar que todos los días tengan selección.
    const faltantes = fechasOrdenadas.filter((f) => !porDia?.[String(f)]);
    if (faltantes.length > 0) {
      setError("Selecciona un tipo de registro para todos los días pasados.");
      return;
    }

    const payload = fechasOrdenadas.map((fecha) => ({
      fecha: String(fecha),
      id_tipo_permiso: Number(porDia[String(fecha)]),
    }));
    onConfirm?.(payload);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cancelar permiso: definir días pasados</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTitle>Acción requerida</AlertTitle>
            <AlertDescription>
              Este permiso tiene días que <b>ya pasaron</b>. Selecciona qué{" "}
              <b>tipo de registro</b> se aplicará en asistencias para esos días.
            </AlertDescription>
          </Alert>

          {/* Selector masivo */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Aplicar a todos los días pasados
            </div>
            <Select value={tipoTodos} onValueChange={aplicarATodos}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo..." />
              </SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                {opciones.map((t) => (
                  <SelectItem key={`all-${t.id}`} value={String(t.id)}>
                    {t.nombre}
                    {t.clave ? ` (${t.clave})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Día por día */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Selección día por día
            </div>
            <div className="rounded-md border divide-y">
              {fechasOrdenadas.map((f) => {
                const fechaISO = String(f);
                const label = formatDateDMY(fechaISO);
                const locked = lockedMap.get(fechaISO);
                const isLocked = Boolean(locked?.id);
                const dow = (() => {
                  try {
                    return dayjs(fechaISO).locale("es").format("dddd");
                  } catch {
                    return "";
                  }
                })();

                return (
                  <div
                    key={`dia-${fechaISO}`}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 items-center"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {dow}
                        {isLocked ? ` · ${locked.motivo} (bloqueado)` : ""}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <Select
                        value={porDia?.[fechaISO] || ""}
                        onValueChange={(val) =>
                          setPorDia((prev) => ({ ...prev, [fechaISO]: val }))
                        }
                        disabled={isLocked}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tipo..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 overflow-y-auto">
                          {opciones.map((t) => (
                            <SelectItem
                              key={`${fechaISO}-${t.id}`}
                              value={String(t.id)}
                            >
                              {t.nombre}
                              {t.clave ? ` (${t.clave})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Falta información</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Volver
          </Button>
          <Button onClick={confirmar}>Confirmar cancelación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


