"use client";

import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { permisosApi } from "@/lib/permisosApi";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import Cookies from "js-cookie";
import { useSnackbar } from "notistack";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import styles from "./permisos-theme.module.css";
import PermisoCancelacionDiasPasadosDialog from "./PermisoCancelacionDiasPasadosDialog";
import { CalendarCheck2, Save } from "lucide-react";
import CamposPermisoHoras, { datosPermisoHoras, erroresPermisoHoras } from "./CamposPermisoHoras";
import { hhmm } from "@/lib/fechaHora.mjs";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import CamposMotivoGoce from "./CamposMotivoGoce";
import {
  camposSolicitud, esParcial, goceDe, motivoAOpcion, motivoFinal, normalizarTipo, puedeCambiar, tipoHorasDe, tiposParaPermiso,
} from "@/lib/asistencia/tiposGoce.mjs";

const esPorHoras = (item) => item?.modalidad === "horas";

// Dialog para crear/editar una solicitud de permiso.
// - Se relaciona con: src/lib/permisosApi.js y src/app/panel/permisos/page.jsx
export default function PermisoDialog({
  open,
  setOpen,
  editItem,
  idEmpresa,
  tiposPermiso,
  festivosSet = new Set(),
  onSaved,
}) {
  const isEdit = Boolean(editItem);
  const { dataUser } = useAuth();
  // Nota: `dataUser` se usa en otras pantallas para auditoría; aquí no es necesario por ahora.

  const [idEmpresaSeleccionada, setIdEmpresaSeleccionada] = useState("");

  // Estado del formulario (sin id_empleado aquí porque puede ser uno/muchos/todos)
  const [form, setForm] = useState({
    id_tipo_permiso: "",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
    estado: "Pendiente",
    // Permisos por horas
    modalidad: "dias",
    tipo_horas: "",
    tratamiento: "",
    hora_inicio: "",
    hora_fin: "",
    // Tipos de registro con goce: motivo del catálogo, goce del día y horas no trabajadas.
    motivoSel: { opcion: "", texto: "" },
    goce: "",
    horas: "reponen",
  });
  const tipoSel = (Array.isArray(tiposPermiso) ? tiposPermiso : []).find((t) => String(t.id) === String(form.id_tipo_permiso)) ?? null;
  // Un tipo que abarca parte del día (entrada, salida o en medio) siempre es por horas y ya dice cuál; con los demás se
  // elige «Días completos» o «Por horas» como siempre.
  const parcial = Boolean(tipoSel && esParcial(tipoSel));
  const porHoras = parcial || form.modalidad === "horas";
  const { data: dataMotivos } = useSWR(open ? "/checador/motivos-permiso" : null, fetcherWithToken, { revalidateOnFocus: false });
  const nuevos = () => camposSolicitud(tipoSel, { motivo: motivoFinal(form.motivoSel), goce: form.goce, horas: form.horas });
  const elegirTipo = (v) => {
    const t = (Array.isArray(tiposPermiso) ? tiposPermiso : []).find((x) => String(x.id) === v);
    const n = normalizarTipo(t);
    setForm((f) => ({ ...f, id_tipo_permiso: v, goce: n?.goce ?? "", horas: n?.horas ?? "reponen",
      ...(n?.parcial ? { modalidad: "horas", tipo_horas: tipoHorasDe(t) } : {}) }));
  };

  // Catálogo y selección de empleados
  const [empleados, setEmpleados] = useState([]); // [{ id, nombre }]
  const [empleadoId, setEmpleadoId] = useState(""); // para 'one'
  const [empleadoIds, setEmpleadoIds] = useState([]); // para 'many'
  const [empleadosBusqueda, setEmpleadosBusqueda] = useState("");

  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [errors, setErrors] = useState([]);

  /**
   * Cancelación con días pasados:
   * - Si al cancelar existen días < hoy dentro del rango, pedimos al admin definir
   *   el tipo de registro (tipos_permiso) para esos días.
   *
   * Relación:
   * - Modal: `PermisoCancelacionDiasPasadosDialog.jsx`
   * - API: `src/lib/permisosApi.js` (manda `dias_pasados`)
   * - Backend: `solicitudPermisoController.actualizarEstado` aplica en asistencias.
   */
  const [openCancelDiasPasados, setOpenCancelDiasPasados] = useState(false);
  const [fechasPasadasPendientes, setFechasPasadasPendientes] = useState([]); // ['YYYY-MM-DD']
  const [diasPasadosPayload, setDiasPasadosPayload] = useState(null); // [{fecha, id_tipo_permiso}]

  // Cargar empleados al abrir
  useEffect(() => {
    if (!open || !idEmpresaSeleccionada) {
      setEmpleados([]);
      return;
    }

    (async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get(
          `/checador/empleados/activos?empresa=${idEmpresaSeleccionada}&page=1&limit=1000`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const mapped = list.map((e) => ({
          id: String(e.id_empleado),
          nombre: [e.nombre, e.apellido_paterno, e.apellido_materno]
            .filter(Boolean)
            .join(" "),
          dias_trabajo: e.dias_trabajo || "",
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
  }, [open, idEmpresaSeleccionada, isEdit, editItem]);

  // Rellenar datos del form al abrir/editar
  useEffect(() => {
    if (!open) return;
    let inicial = "";
    if (isEdit) {
      inicial = String(editItem?.id_empresa || "");
    } else if (idEmpresa && idEmpresa !== "all") {
      inicial = String(idEmpresa);
    }
    // else if (dataUser?.empresas_detalle?.length > 0) {
    //   inicial = String(dataUser.empresas_detalle[0].id_empresa);
    // }
    if (inicial) {
      setIdEmpresaSeleccionada(inicial);
    }
    setForm({
      id_tipo_permiso: String(editItem?.id_tipo_permiso || ""),
      fecha_inicio: editItem?.fecha_inicio
        ? dayjs(editItem.fecha_inicio).format("YYYY-MM-DD")
        : "",
      fecha_fin: editItem?.fecha_fin
        ? dayjs(editItem.fecha_fin).format("YYYY-MM-DD")
        : "",
      motivo: editItem?.motivo || "",
      estado: editItem?.estado || "Pendiente",
      modalidad: esPorHoras(editItem) ? "horas" : "dias",
      tipo_horas: editItem?.tipo_horas || "",
      tratamiento: editItem?.tratamiento || "",
      hora_inicio: hhmm(editItem?.hora_inicio) ?? "",
      hora_fin: hhmm(editItem?.hora_fin) ?? "",
      motivoSel: motivoAOpcion(editItem?.motivo_permiso, dataMotivos),
      goce: goceDe(editItem?.goce ?? editItem?.goce_sueldo) ?? normalizarTipo(tiposPermiso?.find?.((t) => String(t.id) === String(editItem?.id_tipo_permiso)))?.goce ?? "",
      horas: editItem?.horas_no_trabajadas || "reponen",
    });
    setErrors([]);
    // Evitar fugas de estado entre ediciones (cancelación con días pasados).
    setDiasPasadosPayload(null);
    setFechasPasadasPendientes([]);
    setOpenCancelDiasPasados(false);
    // Solo al abrir o cambiar de registro: si el catálogo de motivos llega después no se reinicia lo que el usuario escribió
    // (CamposMotivoGoce reconoce un motivo del catálogo aunque haya llegado como «Otro…»).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem, open, idEmpresa, isEdit]);

  // Nota: antes se bloqueaba la edición cuando el periodo ya había finalizado.
  // Requerimiento nuevo: SIEMPRE permitir edición/cancelación, pero con validaciones.

  async function guardar() {
    // Validaciones de formulario con mensajes amigables
    const errs = [];
    if (!form.id_tipo_permiso) errs.push("Selecciona el tipo de permiso.");
    if (tipoSel && Number(tipoSel.descuenta_vacaciones) !== 1 && !motivoFinal(form.motivoSel)) errs.push("Elige el motivo del permiso.");
    if (porHoras) {
      errs.push(...erroresPermisoHoras(form, { conTipo: parcial }));
    } else {
      if (!form.fecha_inicio) errs.push("La fecha de inicio es obligatoria.");
      if (!form.fecha_fin) errs.push("La fecha fin es obligatoria.");

      // Validación: la fecha fin no puede ser anterior a la fecha inicio
      // Nota: Se permite seleccionar fechas anteriores a la fecha actual según requerimiento del cliente
      if (form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
        errs.push("La fecha fin no puede ser anterior a la fecha inicio.");
      }
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
          (editItem.fecha_fin
            ? dayjs(editItem.fecha_fin).format("YYYY-MM-DD")
            : "") !== (form.fecha_fin || "") ||
          String(editItem.motivo || "") !== String(form.motivo || "") ||
          String(editItem.motivo_permiso || "") !== motivoFinal(form.motivoSel) ||
          (puedeCambiar(tipoSel).goce && (goceDe(editItem.goce ?? editItem.goce_sueldo) ?? "") !== form.goce) ||
          (porHoras && String(editItem.horas_no_trabajadas || "") !== form.horas) ||
          (esPorHoras(editItem) ? "horas" : "dias") !== form.modalidad ||
          (porHoras && (
            String(editItem.tipo_horas || "") !== form.tipo_horas ||
            String(editItem.tratamiento || "") !== form.tratamiento ||
            (hhmm(editItem.hora_inicio) ?? "") !== form.hora_inicio ||
            (hhmm(editItem.hora_fin) ?? "") !== form.hora_fin
          ));

        if (fieldsChanged) {
          await permisosApi.actualizar(editItem.id, {
            id_empleado: Number(idsTarget[0]),
            id_tipo_permiso: Number(form.id_tipo_permiso),
            fecha_inicio: form.fecha_inicio,
            fecha_fin: form.fecha_fin || null,
            motivo: form.motivo || null,
            id_empresa: Number(idEmpresaSeleccionada),
            ...(porHoras ? datosPermisoHoras(form) : { modalidad: "dias" }),
            ...nuevos(),
          });
        }
        // Si el estado cambió respecto al original, actualizar estado
        if (form.estado && form.estado !== editItem?.estado) {
          // Si se cancela y hay días pasados, mandamos el payload `dias_pasados` (si existe).
          // Al aprobar, RH decide el goce (si el tipo lo deja cambiar): viaja con el cambio de estado.
          const extra =
            form.estado === "Cancelado" && Array.isArray(diasPasadosPayload)
              ? { dias_pasados: diasPasadosPayload }
              : form.estado === "Aprobado" && puedeCambiar(tipoSel).goce && form.goce
                ? { goce: form.goce }
                : null;
          await permisosApi.actualizarEstado(
            editItem.id,
            form.estado,
            null,
            extra,
          );
        }
        enqueueSnackbar("Permiso actualizado correctamente.", {
          variant: "success",
        });
      } else if (porHoras) {
        // Por horas: una solicitud por empleado (el alta masiva es solo de días completos).
        for (const id of idsTarget) {
          await permisosApi.crear({
            id_empleado: Number(id),
            id_tipo_permiso: Number(form.id_tipo_permiso),
            motivo: form.motivo || null,
            ...datosPermisoHoras(form),
            ...nuevos(),
          });
        }
        enqueueSnackbar(idsTarget.length === 1 ? "Permiso por horas creado." : `${idsTarget.length} permisos por horas creados.`, {
          variant: "success",
        });
      } else {
        await permisosApi.crearMasivo({
          ids_empleados: idsTarget.map(Number),
          id_tipo_permiso: Number(form.id_tipo_permiso),
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin || null,
          motivo: form.motivo || null,
          ...nuevos(),
        });

        enqueueSnackbar("Permiso(s) creado(s) correctamente.", {
          variant: "success",
        });
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
    e.nombre.toLowerCase().includes(empleadosBusqueda.trim().toLowerCase()),
  );

  // Permisos del catálogo y faltas justificadas (p. ej. «me pide faltar la próxima semana por un viaje familiar»).
  const arrayFiltered = tiposParaPermiso(tiposPermiso);

  // Tipos de registro para reclasificación (se usa el mismo catálogo `tiposPermiso`).
  // Importante: aquí NO filtramos por `es_permiso`, porque el admin necesita escoger
  // cualquier tipo de registro aplicable en asistencias (ej. Falta, Sin Checar, etc.).
  const tiposRegistro = Array.isArray(tiposPermiso) ? tiposPermiso : [];

  /**
   * Interceptor: al seleccionar "Cancelado" calculamos días pasados y abrimos modal si aplica.
   * - Días pasados: fechas estrictamente menores a hoy dentro del rango [inicio, fin].
   * - Días futuros (hoy en adelante) el backend los pone automáticamente como "Sin Checar"
   *   (respetando descanso/festivo según reglas existentes).
   */
  function handleEstadoChange(v) {
    // Si el admin vuelve a otro estado, limpiamos payload de cancelación.
    if (v !== "Cancelado") {
      setDiasPasadosPayload(null);
      setForm((f) => ({ ...f, estado: v }));
      return;
    }

    // Solo aplica en edición (cambiar estado de una solicitud existente).
    // Un permiso por horas no marca días en Asistencias: se cancela sin reclasificar.
    if (!isEdit || esPorHoras(editItem)) {
      setForm((f) => ({ ...f, estado: v }));
      return;
    }

    const hoy = dayjs().format("YYYY-MM-DD");
    const inicio = editItem?.fecha_inicio
      ? dayjs(editItem.fecha_inicio).format("YYYY-MM-DD")
      : null;
    const fin = editItem?.fecha_fin
      ? dayjs(editItem.fecha_fin).format("YYYY-MM-DD")
      : inicio;
    if (!inicio || !fin) {
      // Sin rango, simplemente dejamos cancelar.
      setForm((f) => ({ ...f, estado: v }));
      return;
    }

    // Construir lista de fechas pasadas.
    const pasadas = [];
    for (
      let d = dayjs(inicio);
      d.isBefore(dayjs(fin)) || d.isSame(dayjs(fin), "day");
      d = d.add(1, "day")
    ) {
      const iso = d.format("YYYY-MM-DD");
      if (iso < hoy) pasadas.push(iso);
    }

    if (pasadas.length === 0) {
      // No hay días pasados: cancelación normal.
      setDiasPasadosPayload(null);
      setForm((f) => ({ ...f, estado: v }));
      return;
    }

    // Hay días pasados: requerimos decisión del admin vía modal.
    setFechasPasadasPendientes(pasadas);
    setOpenCancelDiasPasados(true);
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setIdEmpresaSeleccionada("");
            setEmpleadosBusqueda("");
            setErrors([]);
          }
          setOpen(isOpen);
        }}
      >
        {/* Ajuste responsivo:
         - max-w-[95vw]: asegura que en móviles el modal no desborde el viewport.
         - sm:max-w-xl: mantiene el ancho previsto en pantallas >= sm.
         - max-h-[85vh] overflow-y-auto: permite scroll interno si el contenido crece.
         Relación: este modal se invoca desde `src/app/panel/permisos/page.jsx`. */}
        <DialogContent className="p-0 overflow-hidden max-w-[95vw] sm:max-w-xl">
          <DialogHeader className="p-5 bg-brand text-white">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                <CalendarCheck2 className="size-5 text-white" />
              </span>
              {isEdit ? "Editar permiso" : "Nuevo permiso"}
            </DialogTitle>
            <p className="text-sm text-white/80">
              {isEdit
                ? "Actualiza la solicitud y su estado."
                : "Crea una solicitud de permiso para uno o varios empleados."}
            </p>
          </DialogHeader>

          <div
            className={`${styles.permisosTheme} max-h-[70vh] overflow-y-auto p-5 space-y-4`}
          >
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                key={`select-empresa-${idEmpresaSeleccionada}`}
                value={idEmpresaSeleccionada}
                onValueChange={(v) => {
                  setIdEmpresaSeleccionada(v);
                  setEmpleadoIds([]);
                  setEmpleadoId(""); // Limpiar también el ID simple
                }}
                disabled={isEdit} // No permitimos cambiar de empresa en un permiso ya creado
              >
                <SelectTrigger
                  className={isEdit ? "bg-slate-100" : "border-orange-200"}
                >
                  <SelectValue placeholder="Selecciona empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {dataUser?.empresas_detalle?.length > 0 ? (
                    dataUser.empresas_detalle.map((emp) => (
                      <SelectItem
                        key={emp.id_empresa}
                        value={String(emp.id_empresa)}
                      >
                        {emp.nombre}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No hay empresas disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de permiso */}
              <div className="space-y-2">
                <Label>Tipo de Permiso</Label>

                <Select
                  value={form.id_tipo_permiso}
                  onValueChange={elegirTipo}
                >
                  <SelectTrigger aria-label="Tipo de permiso">
                    <SelectValue placeholder="Seleccionar tipo..." />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-64 overflow-y-auto"
                    position="popper"
                    align="start"
                  >
                    {Array.isArray(arrayFiltered) &&
                      arrayFiltered.map((t) => (
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
                <Label className="text-sm font-medium text-gray-700">
                  Empleado
                </Label>
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
                <Label className="text-sm font-medium text-gray-700">
                  Empleados (selección múltiple)
                </Label>
                <Input
                  placeholder="Buscar por nombre…"
                  value={empleadosBusqueda}
                  onChange={(e) => setEmpleadosBusqueda(e.target.value)}
                  className="bg-white"
                />
                {/* Limitar a 3 elementos visibles antes de hacer scroll */}
                <div className="max-h-36 overflow-auto rounded-md border">
                  <ul className="divide-y">
                    {filteredEmpleados.map((e) => {
                      const checked = empleadoIds.includes(e.id);
                      return (
                        <li
                          key={`emp-${e.id}`}
                          className="flex items-center gap-3 p-2"
                        >
                          <input
                            type="checkbox"
                            className="size-4"
                            checked={checked}
                            onChange={() =>
                              setEmpleadoIds((prev) =>
                                prev.includes(e.id)
                                  ? prev.filter((x) => x !== e.id)
                                  : [...prev, e.id],
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
              </div>
            ) : null}

            {tipoSel ? (
              <CamposMotivoGoce tipo={tipoSel} motivos={dataMotivos} motivo={form.motivoSel}
                onMotivo={(m) => setForm((f) => ({ ...f, motivoSel: m }))} goce={form.goce}
                onGoce={(g) => setForm((f) => ({ ...f, goce: g }))} />
            ) : null}

            {/* Días completos o por horas (si el tipo abarca parte del día, ya lo dice el tipo). */}
            {parcial ? null : (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Duración</Label>
              <div className="inline-flex w-full overflow-hidden rounded-lg border border-slate-200 sm:w-auto" role="radiogroup" aria-label="Duración del permiso">
                {[["dias", "Días completos"], ["horas", "Por horas"]].map(([valor, texto]) => (
                  <button key={valor} type="button" role="radio" aria-checked={form.modalidad === valor}
                    onClick={() => setForm((f) => ({ ...f, modalidad: valor }))}
                    className={`flex-1 px-4 py-2 text-sm font-semibold transition sm:flex-none ${form.modalidad === valor ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                    {texto}
                  </button>
                ))}
              </div>
            </div>
            )}

            {porHoras && (
              <CamposPermisoHoras form={form} setForm={setForm} tipoFijo={parcial}
                horas={parcial ? { valor: puedeCambiar(tipoSel).horas ? form.horas : normalizarTipo(tipoSel).horas,
                  bloqueado: !puedeCambiar(tipoSel).horas, onChange: (v) => setForm((f) => ({ ...f, horas: v })) } : null} />
            )}

            {/* Fechas */}
            {!porHoras && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Fecha inicio
                </Label>
                <Input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fecha_inicio: e.target.value }))
                  }
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Fecha fin
                </Label>
                <Input
                  type="date"
                  value={form.fecha_fin}
                  min={form.fecha_inicio || undefined}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fecha_fin: e.target.value }))
                  }
                  className="bg-white"
                />
              </div>
            </div>
            )}

            {/* Estado (solo en modo edición) */}
            {isEdit ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Estado
                </Label>
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
                      onValueChange={handleEstadoChange}
                    >
                      <SelectTrigger className="bg-white">
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
            {/* Antes se mostraba un aviso/bloqueo por permiso finalizado.
              Nuevo requerimiento: siempre permitir editar/cancelar, por eso se elimina. */}

            {/* Motivo y notas */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Observaciones
              </Label>
              <Textarea
                rows={4}
                placeholder="Describe el motivo del permiso..."
                value={form.motivo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, motivo: e.target.value }))
                }
                className="bg-white"
              />
            </div>

            <DialogFooter className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </Button>
              <Button
                onClick={guardar}
                disabled={loading}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
              >
                <Save className="h-4 w-4" />
                Guardar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal requerido si se intenta cancelar con días ya pasados */}
      <PermisoCancelacionDiasPasadosDialog
        open={openCancelDiasPasados}
        setOpen={(v) => {
          setOpenCancelDiasPasados(v);
          // Si el usuario cierra sin confirmar, NO cambiamos el estado a Cancelado.
          if (!v) {
            setFechasPasadasPendientes([]);
          }
        }}
        fechasPasadas={fechasPasadasPendientes}
        tiposRegistro={tiposRegistro}
        festivosSet={festivosSet}
        onConfirm={(payload) => {
          // Guardar payload para enviarlo en `actualizarEstado` y aplicar el estado.
          setDiasPasadosPayload(payload);
          setForm((f) => ({ ...f, estado: "Cancelado" }));
          enqueueSnackbar(
            "Días pasados configurados. Ahora guarda para cancelar.",
            {
              variant: "info",
            },
          );
        }}
      />
    </>
  );
}
