"use client";

import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { permisosApi } from "@/lib/permisosApi";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import Cookies from "js-cookie";
import { useSnackbar } from "notistack";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Dialog para crear/editar una solicitud de permiso.
// - Se relaciona con: src/lib/permisosApi.js y src/app/panel/permisos/page.jsx
export default function PermisoDialog({ open, setOpen, editItem, idEmpresa, tiposPermiso, onSaved }) {
  const isEdit = Boolean(editItem);
  const { dataUser } = useAuth();
  const usuarioId = dataUser?.id_empleado || null; // reservado para auditoría futura

  // Estado del formulario (sin id_empleado aquí porque puede ser uno/muchos/todos)
  const [form, setForm] = useState({
    id_tipo_permiso: "",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
    estado: "Pendiente",
  });

  // Catálogo y selección de empleados
  const [empleados, setEmpleados] = useState([]); // [{ id, nombre }]
  const [empleadoId, setEmpleadoId] = useState(""); // para 'one'
  const [empleadoIds, setEmpleadoIds] = useState([]); // para 'many'
  const [empleadosBusqueda, setEmpleadosBusqueda] = useState("");

  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [errors, setErrors] = useState([]);

  // Cargar empleados al abrir
  useEffect(() => {
    if (!open || !idEmpresa) return;
    (async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get(`/checador/empleados?empresa=${idEmpresa}&page=1&limit=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const mapped = list.map((e) => ({
          id: String(e.id_empleado),
          nombre: [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" "),
        }));
        setEmpleados(mapped);
        // Prefill: en edición, fijar empleado; en creación, limpiar selección múltiple
        if (isEdit && editItem?.id_empleado) {
          setEmpleadoId(String(editItem.id_empleado));
        }
        setEmpleadoIds([]);
      } catch {
        setEmpleados([]);
      }
    })();
  }, [open, idEmpresa, isEdit, editItem]);

  // Rellenar datos del form al abrir/editar
  useEffect(() => {
    if (!open) return;
    setForm({
      id_tipo_permiso: String(editItem?.id_tipo_permiso || ""),
      fecha_inicio: editItem?.fecha_inicio ? dayjs(editItem.fecha_inicio).format("YYYY-MM-DD") : "",
      fecha_fin: editItem?.fecha_fin ? dayjs(editItem.fecha_fin).format("YYYY-MM-DD") : "",
      motivo: editItem?.motivo || "",
      estado: editItem?.estado || "Pendiente",
    });
    setErrors([]);
  }, [editItem, open]);

  // Deshabilitar edición si el permiso ya finalizó
  const isExpired = isEdit
    ? (() => {
        const today = dayjs().format("YYYY-MM-DD");
        const fin = editItem?.fecha_fin
          ? dayjs(editItem.fecha_fin).format("YYYY-MM-DD")
          : editItem?.fecha_inicio
          ? dayjs(editItem.fecha_inicio).format("YYYY-MM-DD")
          : null;
        return fin ? today > fin : false;
      })()
    : false;

  async function guardar() {
    if (isExpired) {
      enqueueSnackbar("Este permiso ya finalizó y no puede editarse.", { variant: "warning" });
      return;
    }
    // Validaciones de formulario con mensajes amigables
    const errs = [];
    if (!form.id_tipo_permiso) errs.push("Selecciona el tipo de permiso.");
    if (!form.fecha_inicio) errs.push("La fecha de inicio es obligatoria.");
    if (!form.fecha_fin) errs.push("La fecha fin es obligatoria.");

    const hoy = dayjs().format("YYYY-MM-DD");
    // Regla: solo en creación exigimos que inicio sea hoy o futuro.
    // En edición permitimos fechas pasadas para no forzar cambios y evitar
    // efectos secundarios en asistencias al cancelar parcialmente.
    if (!isEdit && form.fecha_inicio && form.fecha_inicio < hoy) {
      errs.push("La fecha de inicio no puede ser anterior a hoy.");
    }
    if (form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      errs.push("La fecha fin no puede ser anterior a la fecha inicio.");
    }

    // Resolver a qué empleados aplica
    let idsTarget = [];
    if (isEdit) {
      if (!empleadoId) errs.push("Selecciona un empleado.");
      idsTarget = empleadoId ? [empleadoId] : [];
    } else {
      idsTarget = empleadoIds;
      if (idsTarget.length === 0) errs.push("Selecciona al menos un empleado.");
    }

    if (errs.length > 0) {
      setErrors(errs);
      enqueueSnackbar("Revisa los campos marcados.", { variant: "warning" });
      return;
    }

    setLoading(true);
    try {
      if (isEdit && idsTarget.length === 1) {
        // Evitar actualizaciones innecesarias que podrían re-sincronizar rangos:
        const fieldsChanged =
          String(editItem.id_empleado) !== String(idsTarget[0]) ||
          String(editItem.id_tipo_permiso) !== String(form.id_tipo_permiso) ||
          (editItem.fecha_inicio
            ? dayjs(editItem.fecha_inicio).format("YYYY-MM-DD")
            : "") !== form.fecha_inicio ||
          (editItem.fecha_fin ? dayjs(editItem.fecha_fin).format("YYYY-MM-DD") : "") !==
            (form.fecha_fin || "") ||
          String(editItem.motivo || "") !== String(form.motivo || "");

        if (fieldsChanged) {
          await permisosApi.actualizar(editItem.id, {
            id_empleado: Number(idsTarget[0]),
            id_tipo_permiso: Number(form.id_tipo_permiso),
            fecha_inicio: form.fecha_inicio,
            fecha_fin: form.fecha_fin || null,
            motivo: form.motivo || null,
            id_empresa: idEmpresa,
          });
        }
        // Si el estado cambió respecto al original, actualizar estado
        if (form.estado && form.estado !== editItem?.estado) {
          await permisosApi.actualizarEstado(editItem.id, form.estado);
        }
        enqueueSnackbar("Permiso actualizado correctamente.", { variant: "success" });
      } else {
        const payloads = idsTarget.map((id) => ({
          id_empleado: Number(id),
          id_tipo_permiso: Number(form.id_tipo_permiso),
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin || null,
          motivo: form.motivo || null,
          id_empresa: idEmpresa,
        }));
        const created = await Promise.all(payloads.map((p) => permisosApi.crear(p)));
        // Aprobar automáticamente todos los creados
        const createdIds = created
          .map((r) => r?.id)
          .filter((x) => typeof x === "number" || typeof x === "string");
        if (createdIds.length > 0) {
          await Promise.all(
            createdIds.map((permId) => permisosApi.actualizarEstado(permId, "Aprobado"))
          );
          enqueueSnackbar("Permiso(s) creado(s) correctamente.", { variant: "success" });
        }
      }
      onSaved?.();
      setOpen(false);
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.error ||
        (e?.response?.status === 409
          ? "Existe un traslape con otro permiso activo o pendiente."
          : "Ocurrió un error al guardar.");
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  const filteredEmpleados = empleados.filter((e) =>
    e.nombre.toLowerCase().includes(empleadosBusqueda.trim().toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Ajuste responsivo:
         - max-w-[95vw]: asegura que en móviles el modal no desborde el viewport.
         - sm:max-w-xl: mantiene el ancho previsto en pantallas >= sm.
         - max-h-[85vh] overflow-y-auto: permite scroll interno si el contenido crece.
         Relación: este modal se invoca desde `src/app/panel/permisos/page.jsx`. */}
      <DialogContent className="max-w-[95vw] sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>➕ {isEdit ? "Editar Permiso" : "Nuevo Permiso"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo de permiso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Permiso</Label>
              <Select
                value={form.id_tipo_permiso}
                onValueChange={(v) => setForm((f) => ({ ...f, id_tipo_permiso: v }))}
                disabled={isExpired}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto" position="popper" align="start">
                  {Array.isArray(tiposPermiso) &&
                    tiposPermiso.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selección de empleado en edición (simple) */}
          {isEdit ? (
            <div className="space-y-2">
              <Label>Empleado</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={empleadoId}
                onChange={(e) => setEmpleadoId(e.target.value)}
              >
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Selección múltiple de empleados (creación) */}
          {!isEdit ? (
            <div className="space-y-2">
              <Label>Empleados (selección múltiple)</Label>
              <Input
                placeholder="Buscar por nombre…"
                value={empleadosBusqueda}
                onChange={(e) => setEmpleadosBusqueda(e.target.value)}
              />
              <div className="max-h-56 overflow-auto rounded-md border">
                <ul className="divide-y">
                  {filteredEmpleados.map((e) => {
                    const checked = empleadoIds.includes(e.id);
                    return (
                      <li key={`emp-${e.id}`} className="flex items-center gap-3 p-2">
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={checked}
                          onChange={() =>
                            setEmpleadoIds((prev) =>
                              prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id]
                            )
                          }
                        />
                        <div className="min-w-0">
                          <div className="truncate">{e.nombre}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>{empleadoIds.length} seleccionados</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEmpleadoIds(empleados.map((e) => e.id))}>
                    Seleccionar todos
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEmpleadoIds([])}>
                    Limpiar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={form.fecha_inicio}
                min={dayjs().format("YYYY-MM-DD")}
                onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                disabled={isExpired}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={form.fecha_fin}
                min={form.fecha_inicio || dayjs().format("YYYY-MM-DD")}
                onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                disabled={isExpired}
              />
            </div>
          </div>

          {/* Estado (solo en modo edición) */}
          {isEdit ? (
            <div className="space-y-2">
              <Label>Estado</Label>
              {/*
               * Si el permiso está Aprobado, solo permitir transición a Cancelado.
               * Relación: `solicitudPermisoController.actualizarEstado` maneja la sincronización de asistencias.
               */}
              {(() => {
                const estadoOriginal = editItem?.estado || form.estado;
                const isApproved = estadoOriginal === "Aprobado";
                return (
              <Select
                value={form.estado}
                onValueChange={(v) => setForm((f) => ({ ...f, estado: v }))}
                  disabled={isExpired}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isApproved ? (
                    <>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                      <SelectItem value="Aprobado">Aprobado</SelectItem>
                      <SelectItem value="Rechazado">Rechazado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
                );
              })()}
            </div>
          ) : null}

          {/* Errores de validación */}
          {errors.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>Corrige los siguientes puntos</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((er, i) => (
                    <li key={`err-${i}`}>{er}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Aviso de permiso vencido */}
          {isExpired ? (
            <Alert>
              <AlertTitle>Permiso finalizado</AlertTitle>
              <AlertDescription>
                Este permiso ya terminó. La edición está deshabilitada para evitar inconsistencias.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Motivo y notas */}
          <div className="space-y-2">
            <Label>Motivo / Observaciones</Label>
            <Textarea
              rows={4}
              placeholder="Describe el motivo del permiso..."
              value={form.motivo}
              onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
              disabled={isExpired}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={loading || isExpired}>
            💾 Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


