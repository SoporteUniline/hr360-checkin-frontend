"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useSnackbar } from "notistack";
import { useForm } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import { FormLabelWithAsterisk } from "./FormLabelWithAsterisk";
import { Combobox } from "./Combobox";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "@/lib/axios";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  FileText,
  Save,
  ShieldAlert,
  User,
  FileSignature,
  PlusIcon,
  Search,
} from "lucide-react";
import NewTipoActaModal from "./NewTipoActaModal";
import { administrativeMinutesApi } from "@/lib/administrativeMinutesApi";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

const schema = z.object({
  empleado: z.string().min(1, "Selecciona un empleado"),
  tipoActa: z.string().min(1, "Selecciona un tipo de acta"),
  fechaIncidente: z.string().min(1, "La fecha es obligatoria"),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  sancion: z.string().min(1, "Selecciona una sanción"),
  elabora: z.string().min(1, "Selecciona quién elabora"),

  horaIncidente: z.string().optional(),
  lugar: z.string().optional(),
  testigos: z.string().optional(),
  cargoElabora: z.string().optional(),
  descargo: z.string().optional(),
  aceptaHechos: z.boolean(),
  esReincidencia: z.boolean(),
});

const NewActaModal = ({
  open,
  onClose,
  empleados,
  tiposActa,
  refetch,
  dataUser,
  mutateTiposActa,
  /**
   * Modo del modal:
   * - "create" (default): crea una nueva acta.
   * - "edit": edita una acta existente.
   *
   * Relación:
   * - Se usa desde `src/app/panel/actas-administrativas/page.jsx`
   *   para reutilizar el mismo formulario en Crear/Editar.
   */
  mode = "create",
  /**
   * Acta a editar (solo cuando `mode === "edit"`).
   * - Proviene del listado `useAdministrativeMinutes`.
   */
  actaToEdit = null,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openNewTipoActa, setOpenNewTipoActa] = useState(false);

  /**
   * Buscador de empleado estilo "Contratos":
   * - Input con sugerencias (dropdown)
   * - Navegación con teclado (↑/↓/Enter/Esc)
   *
   * Relación:
   * - Patrón tomado de `src/app/panel/contratos/page.jsx`
   * - Fuente de datos: `src/hooks/useEmpleadosData.js` -> endpoint `/checador/empleados`
   */
  const [empSearch, setEmpSearch] = useState("");
  const [isEmpSuggestionsOpen, setIsEmpSuggestionsOpen] = useState(false);
  const [hoveredEmpSuggestionIndex, setHoveredEmpSuggestionIndex] = useState(-1);
  const empleadosSugResp = useEmpleadosData(
    dataUser?.id_empresa,
    1,
    8,
    empSearch,
    "",
    "",
    ""
  );
  const sugerenciasEmpleados = useMemo(() => {
    const list = empleadosSugResp?.data?.data || [];
    return list.map((e) => ({
      id_empleado: e.id_empleado,
      nombre_completo: [e.nombre, e.apellido_paterno, e.apellido_materno]
        .filter(Boolean)
        .join(" "),
    }));
  }, [empleadosSugResp?.data]);

  const handleSelectEmpleadoSugerencia = (emp) => {
    if (!emp) return;
    setEmpSearch(emp.nombre_completo || "");
    setIsEmpSuggestionsOpen(false);
    form.setValue("empleado", String(emp.id_empleado), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  /**
   * Autollenado del campo "Elabora el acta" y "Cargo de quien elabora":
   * - Toma el empleado autenticado (`dataUser.id_empleado`)
   * - Si el usuario autenticado NO trae `id_empleado` (caso común cuando el token es de `usuarios`),
   *   resolvemos el empleado por correo (`dataUser.correo/email`) con el endpoint dedicado `/checador/empleados/por-correo`.
   * - Obtiene su puesto desde backend:
   *   empleados.id_puesto -> JOIN puestos (ver `Empleado.obtenerPorId` en backend).
   *
   * Relación:
   * - Similar a "actualizado_por" en Permisos (auditoría basada en sesión).
   * - Endpoint: `/checador/empleados/:id` (ver `empleadoRoutes.js`).
   */
  const idEmpleadoSesion = dataUser?.id_empleado || null;
  const correoSesion = (dataUser?.correo || dataUser?.email || "").trim();
  const yaNotificoErrorElaboraRef = useRef(false);

  /**
   * Fallback: si no existe `dataUser.id_empleado`, buscamos el empleado por correo.
   * - Backend: endpoint dedicado (más seguro y consistente):
   *   - Lee `empleados` por correo + empresa
   *   - Resuelve el puesto vía `empleados.id_puesto -> puestos.nombre_puesto`
   * - Endpoint: `GET /checador/empleados/por-correo?empresa=...&correo=...`
   *
   * Relación:
   * - Backend: `modules/attendance/routes/empleadoRoutes.js` (ruta `/por-correo`)
   * - Backend: `modules/attendance/controllers/empleadoController.js` -> `obtenerEmpleadoPorCorreoConPuesto`
   */
  const {
    data: empleadoPorCorreoResp,
    error: empleadoPorCorreoError,
    isLoading: empleadoPorCorreoLoading,
  } = useSWR(
    open && !idEmpleadoSesion && correoSesion && dataUser?.id_empresa
      ? `/checador/empleados/por-correo?empresa=${dataUser.id_empresa}&correo=${encodeURIComponent(
          correoSesion
        )}`
      : null,
    fetcherWithToken
  );
  const empleadoPorCorreo = useMemo(() => {
    // La ruta `/por-correo` devuelve un objeto (no array).
    return empleadoPorCorreoResp || null;
  }, [empleadoPorCorreoResp]);

  const { data: empleadoSesionData } = useSWR(
    open && idEmpleadoSesion ? `/checador/empleados/${idEmpleadoSesion}` : null,
    fetcherWithToken
  );

  /**
   * UX defensivo:
   * - Si no se puede resolver el empleado por correo, mostramos un aviso una sola vez por apertura del modal.
   *
   * Relación:
   * - Backend: `GET /api/checador/empleados/por-correo`
   * - Este warning ayuda a detectar cuando el correo del usuario logeado NO existe en `empleados`.
   */
  useEffect(() => {
    if (!open) {
      yaNotificoErrorElaboraRef.current = false;
      return;
    }
    if (mode !== "create") return;
    if (!empleadoPorCorreoError) return;
    if (yaNotificoErrorElaboraRef.current) return;

    yaNotificoErrorElaboraRef.current = true;
    enqueueSnackbar(
      `No se pudo autollenar “Elabora el acta”. No se encontró un empleado con el correo “${correoSesion}” en esta empresa.`,
      { variant: "warning" }
    );
  }, [open, mode, empleadoPorCorreoError, correoSesion, enqueueSnackbar]);

  const elaboraAutoEnProceso =
    open &&
    mode === "create" &&
    !idEmpleadoSesion &&
    Boolean(correoSesion) &&
    Boolean(dataUser?.id_empresa) &&
    Boolean(empleadoPorCorreoLoading);

  /**
   * Empleado "elabora" resuelto:
   * - Prioridad 1: `dataUser.id_empleado` -> GET `/checador/empleados/:id`
   * - Prioridad 2: `dataUser.correo/email` -> GET `/checador/empleados/por-correo`
   */
  const empleadoElaboraAuto = useMemo(() => {
    if (empleadoSesionData?.id_empleado) return empleadoSesionData;
    if (empleadoPorCorreo?.id_empleado) return empleadoPorCorreo;
    return null;
  }, [empleadoSesionData, empleadoPorCorreo]);

  const empleadoElaboraAutoNombre = useMemo(() => {
    const e = empleadoElaboraAuto;
    if (!e) return "";
    // `empleados` list usa nombre_completo; detalle usa nombre/apellidos. Soportamos ambos.
    return (
      e.nombre_completo ||
      [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" ")
    );
  }, [empleadoElaboraAuto]);

  const empleadoElaboraAutoPuesto = useMemo(() => {
    const e = empleadoElaboraAuto;
    // En ambos casos el backend entrega `puesto` ya resuelto (JOIN puestos).
    return e?.puesto ? String(e.puesto) : "";
  }, [empleadoElaboraAuto]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      empleado: "",
      tipoActa: "",
      fechaIncidente: "",
      horaIncidente: "",
      lugar: "",
      descripcion: "",
      testigos: "",
      sancion: "",
      elabora: "",
      cargoElabora: "",
      descargo: "",
      aceptaHechos: false,
      esReincidencia: false,
    },
  });

  /**
   * Precarga valores cuando el modal se usa en modo edición.
   * Importante: se hace cuando `open` cambia para no pisar cambios del usuario mientras escribe.
   */
  useEffect(() => {
    if (!open) return;
    if (mode !== "edit") return;
    if (!actaToEdit) return;

    // Mapeo de campos API -> campos de formulario.
    // Relación: backend guarda los campos en `actas_administrativas` (ver controller).
    form.reset({
      empleado: String(actaToEdit.id_empleado ?? ""),
      tipoActa: String(actaToEdit.id_tipo_acta ?? ""),
      fechaIncidente: actaToEdit.fecha_incidente
        ? String(actaToEdit.fecha_incidente).slice(0, 10) // ISO date
        : "",
      horaIncidente: actaToEdit.hora_incidente || "",
      lugar: actaToEdit.lugar_incidente || "",
      descripcion: actaToEdit.descripcion_hechos || "",
      testigos: actaToEdit.testigos || "",
      sancion: actaToEdit.tipo_sancion || "",
      elabora: String(actaToEdit.id_elabora ?? ""),
      cargoElabora: actaToEdit.nombre_cargo_elabora || "",
      descargo: actaToEdit.descargo_trabajador || "",
      aceptaHechos: Boolean(actaToEdit.acepta_hechos),
      esReincidencia: Boolean(actaToEdit.es_reincidencia),
    });

    // Mostrar el nombre en el input del buscador (UX tipo Contratos).
    const nombreCompletoActa = `${actaToEdit.nombre_empleado || ""} ${actaToEdit.apellido_paterno_empleado || ""} ${
      actaToEdit.apellido_materno_empleado || ""
    }`
      .replace(/\s+/g, " ")
      .trim();
    setEmpSearch(nombreCompletoActa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, actaToEdit]);

  /**
   * Inicialización al abrir en modo creación:
   * - Limpia el input del buscador
   * - Autocompleta "Elabora" y "Cargo" desde la sesión
   */
  useEffect(() => {
    if (!open) return;
    if (mode !== "create") return;

    // Reset de la UI del buscador (sin borrar otros campos si el usuario ya escribió)
    setEmpSearch("");
    setIsEmpSuggestionsOpen(false);
    setHoveredEmpSuggestionIndex(-1);

    // Autollenado desde sesión (id_empleado o por correo) (si aplica)
    if (empleadoElaboraAuto?.id_empleado) {
      form.setValue("elabora", String(empleadoElaboraAuto.id_empleado), {
        shouldValidate: true,
        shouldDirty: false,
      });
      if (empleadoElaboraAutoPuesto) {
        form.setValue("cargoElabora", String(empleadoElaboraAutoPuesto), {
          shouldValidate: false,
          shouldDirty: false,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, empleadoElaboraAuto?.id_empleado, empleadoElaboraAutoPuesto]);

  const onSubmit = async (values) => {
    try {
      setIsSubmitting(true);

      const body = {
        id_empresa: dataUser?.id_empresa,

        id_empleado: values.empleado,
        id_tipo_acta: values.tipoActa,

        fecha_incidente: values.fechaIncidente,
        hora_incidente: values.horaIncidente || null,
        lugar_incidente: values.lugar || null,

        descripcion_hechos: values.descripcion,
        testigos: values.testigos || null,

        tipo_sancion: values.sancion,
        dias_suspension: null,

        descargo_trabajador: values.descargo || null,
        acepta_hechos: values.aceptaHechos,
        id_elabora: values.elabora,
        nombre_cargo_elabora: values.cargoElabora || null,

        es_reincidencia: values.esReincidencia,
        id_acta_previa: null,
      };

      // Crear vs Editar:
      // - Create: POST `/checador/administrativeMinutes/create`
      // - Edit:   PUT  `/checador/administrativeMinutes/:id_acta`
      if (mode === "edit") {
        const idActa = actaToEdit?.id_acta;
        if (!idActa) throw new Error("No se encontró el ID del acta a editar.");
        await administrativeMinutesApi.actualizar(idActa, body);
        enqueueSnackbar("Acta actualizada correctamente", { variant: "success" });
      } else {
        await administrativeMinutesApi.crear(body);
        enqueueSnackbar("Acta creada correctamente", { variant: "success" });
      }

      form.reset();
      await refetch?.();
      onClose(false);
    } catch (error) {
      console.error("Error al crear el acta:", error);

      enqueueSnackbar(
        error?.response?.data?.message ||
          (mode === "edit" ? "Hubo un error al actualizar el acta" : "Hubo un error al crear el acta"),
        { variant: "error" }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose(false);
  };

  const formatearTexto = (str) => {
    if (!str) return "";
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className={twMerge(
            "sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 overflow-hidden"
          )}
        >
          {/* Header - Diseño ADAMIA (patrón Contratos) */}
          <DialogHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-t-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <DialogTitle className="text-white text-lg font-semibold">
                {mode === "edit" ? "✏️ Editar Acta Administrativa" : "➕ Nueva Acta Administrativa"}
            </DialogTitle>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="text-sm space-y-4 max-h-[70vh] overflow-y-auto px-6 py-6"
            >
              {/* ======================
                  Secciones por color (Diseño ADAMIA)
                  - Patrón tomado de `src/app/panel/contratos/ContratoDialog.jsx`
                  ====================== */}

              {/* Información básica */}
              <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border border-blue-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-[#2563EB] p-2 rounded-lg">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900">Información básica</div>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <FormField
                  control={form.control}
                  name="empleado"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabelWithAsterisk
                          required
                          className="text-gray-600"
                        >
                          Empleado
                        </FormLabelWithAsterisk>

                        <FormControl>
                          {/*
                            Buscador tipo Contratos:
                            - El valor real del form es `field.value` (id_empleado)
                            - El input visible es `empSearch` (nombre completo)
                          */}
                          <div className="relative">
                            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                              className="pl-9"
                              placeholder="Buscar empleado..."
                              value={empSearch}
                              onChange={(e) => {
                                setEmpSearch(e.target.value);
                                setIsEmpSuggestionsOpen(true);
                                setHoveredEmpSuggestionIndex(0);
                                // Si el usuario empieza a escribir manual, limpiamos el id para forzar selección válida.
                                field.onChange("");
                              }}
                              onFocus={() => {
                                setIsEmpSuggestionsOpen(!!empSearch);
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setIsEmpSuggestionsOpen(false);
                                }, 120);
                              }}
                              onKeyDown={(e) => {
                                if (!isEmpSuggestionsOpen || sugerenciasEmpleados.length === 0) return;
                                if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  setHoveredEmpSuggestionIndex((prev) =>
                                    prev + 1 >= sugerenciasEmpleados.length ? 0 : prev + 1
                                  );
                                } else if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  setHoveredEmpSuggestionIndex((prev) =>
                                    prev - 1 < 0 ? sugerenciasEmpleados.length - 1 : prev - 1
                                  );
                                } else if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSelectEmpleadoSugerencia(
                                    sugerenciasEmpleados[hoveredEmpSuggestionIndex] ||
                                      sugerenciasEmpleados[0]
                                  );
                                } else if (e.key === "Escape") {
                                  setIsEmpSuggestionsOpen(false);
                                }
                              }}
                            />

                            {isEmpSuggestionsOpen && sugerenciasEmpleados.length > 0 ? (
                              <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow">
                                <ul className="max-h-64 overflow-auto">
                                  {sugerenciasEmpleados.map((emp, idx) => (
                                    <li
                                      key={emp.id_empleado}
                                      onMouseDown={() => handleSelectEmpleadoSugerencia(emp)}
                                      onMouseEnter={() => setHoveredEmpSuggestionIndex(idx)}
                                      className={`px-3 py-2 cursor-pointer text-sm ${
                                        idx === hoveredEmpSuggestionIndex ? "bg-blue-50" : ""
                                      }`}
                                    >
                                      {emp.nombre_completo}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {/* Campo "real" que viaja al submit: ID del empleado */}
                            <input type="hidden" value={field.value || ""} readOnly />
                          </div>
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="tipoActa"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabelWithAsterisk
                          required
                          className="text-gray-600"
                        >
                          Tipo de Acta
                        </FormLabelWithAsterisk>

                        <FormControl>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              {/*
                               * FIX (2026-01):
                               * El `Combobox` (Popover + Command) dentro de `Dialog` estaba causando que algunos usuarios
                               * NO pudieran seleccionar correctamente el tipo de acta (click no aplicaba el valor).
                               *
                               * Para estabilizar UX, usamos `Select` (Radix) que es consistente dentro de Dialog/scroll.
                               * Relación:
                               * - Tipos se administran en `src/components/NewTipoActaModal.jsx`
                               */}
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un tipo de acta" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(tiposActa || []).map((tipo) => (
                                    <SelectItem
                                      key={tipo.id_tipo_acta}
                                      value={String(tipo.id_tipo_acta)}
                                    >
                                      {tipo.nombre_tipo} (ID {tipo.id_tipo_acta})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              type="button"
                              className="p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                              onClick={() => setOpenNewTipoActa(true)}
                              title="Crear tipo de acta"
                            >
                              <PlusIcon className="w-4 h-4 text-[#7C3AED]" />
                            </Button>
                          </div>
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                </div>
              </div>

              {/* Incidente */}
              <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 border border-green-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-600 p-2 rounded-lg">
                    <CalendarDays className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900">Detalles del incidente</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <FormField
                  control={form.control}
                  name="fechaIncidente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithAsterisk required className="text-gray-600">
                        Fecha del incidente
                      </FormLabelWithAsterisk>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horaIncidente"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-gray-600">
                        Hora del incidente
                      </Label>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lugar"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <Label className="text-gray-600">
                        Lugar del incidente
                      </Label>
                      <FormControl>
                        <Input placeholder="Ej: Oficina, Almacén" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                </div>
              </div>

              {/* Hechos y testigos */}
              <div className="bg-gradient-to-br from-yellow-50 via-white to-amber-50 border border-yellow-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-500 p-2 rounded-lg">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900">Hechos y testigos</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabelWithAsterisk required className="text-gray-600">
                        Descripción de los hechos
                      </FormLabelWithAsterisk>
                      <FormControl>
                        <Textarea
                          placeholder="Describe detalladamente lo sucedido..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testigos"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <Label className="text-gray-600">Testigos</Label>
                      <FormControl>
                        <Textarea
                          placeholder="Nombres de testigos presentes (Opcional)"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                </div>
              </div>

              {/* Sanción */}
              <div className="bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 border border-purple-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-[#7C3AED] p-2 rounded-lg">
                    <ShieldAlert className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900">Sanción</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <FormField
                  control={form.control}
                  name="sancion"
                  render={({ field }) => {
                    const sanciones = [
                      "amonestacion_verbal",
                      "amonestacion_escrita",
                      "suspension",
                      "rescision",
                    ];

                    return (
                      <FormItem>
                        <FormLabelWithAsterisk
                          required
                          className="text-gray-600"
                        >
                          Tipo de sanción
                        </FormLabelWithAsterisk>

                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una sanción" />
                            </SelectTrigger>

                            <SelectContent>
                              {sanciones.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {formatearTexto(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                </div>
              </div>

              {/* Elaboración */}
              <div className="bg-gradient-to-br from-teal-50 via-white to-cyan-50 border border-teal-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-teal-600 p-2 rounded-lg">
                    <FileSignature className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900">Elaboración</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <FormField
                  control={form.control}
                  name="elabora"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabelWithAsterisk
                          required
                          className="text-gray-600"
                        >
                          Elabora el acta
                        </FormLabelWithAsterisk>

                        <FormControl>
                          {/*
                            Autollenado SOLO en modo "create":
                            - Si logramos resolver el empleado logeado (por id_empleado o correo),
                              se bloquea el campo y se muestra el nombre.
                          */}
                          {mode === "create" && elaboraAutoEnProceso ? (
                            // Estado de carga (evita la sensación de que "no pasó nada" mientras se resuelve por correo).
                            <Input value="Cargando usuario logeado..." disabled className="bg-muted" />
                          ) : mode === "create" && empleadoElaboraAuto?.id_empleado ? (
                            /*
                             * IMPORTANTE (shadcn/Radix):
                             * `FormControl` usa un Slot que inyecta props (ej. `data-slot`) al hijo.
                             * Un React.Fragment (`<>...</>`) NO acepta props y rompe con:
                             * "Invalid prop `data-slot` supplied to `React.Fragment`..."
                             * Por eso envolvemos en un contenedor real.
                             */
                            <div className="space-y-2">
                              {/*
                                Autollenado (solo lectura):
                                - `field.value` se setea desde el effect al abrir (modo create).
                                - Visible: nombre completo del empleado resuelto por sesión.
                              */}
                              <Input
                                value={empleadoElaboraAutoNombre || "—"}
                                disabled
                                className="bg-muted"
                              />
                              <input type="hidden" value={field.value || ""} readOnly />
                            </div>
                          ) : (
                            // Fallback defensivo (si el usuario no tiene id_empleado en sesión)
                            <Combobox
                              options={
                                empleados?.data?.map((emp) => ({
                                  value: emp.id_empleado.toString(),
                                  label: `${emp.nombre} ${emp.apellido_paterno} ${emp.apellido_materno}`,
                                })) || []
                              }
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Selecciona quien elabora"
                              emptyText="No se encontraron empleados"
                              name="elabora"
                            />
                          )}
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="cargoElabora"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <Label className="text-gray-600">
                        Cargo de quien elabora
                      </Label>
                      <FormControl>
                        <Input
                          placeholder="Ej: Jefe de RH"
                          {...field}
                          // Si elabora viene de sesión, este campo se autollenará y será solo lectura.
                          disabled={mode === "create" && Boolean(empleadoElaboraAuto?.id_empleado)}
                          className={mode === "create" && Boolean(empleadoElaboraAuto?.id_empleado) ? "bg-muted" : ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                </div>
              </div>

              {/* Declaraciones */}
              <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-700 p-2 rounded-lg">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900">Declaraciones</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <FormField
                  control={form.control}
                  name="descargo"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <Label className="text-gray-600">
                        Descargo del trabajador
                      </Label>
                      <FormControl>
                        <Textarea
                          placeholder="Versión del empleado (opcional)"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aceptaHechos"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 border p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-7 w-11 [&>span]:size-5.5 
             data-[state=checked]:bg-emerald-500 
             data-[state=unchecked]:bg-gray-300"
                        />
                        <div>
                          <Label>El trabajador acepta los hechos</Label>
                          <p className="text-xs text-gray-500 mt-1">
                            Marca si el empleado reconoce los hechos descritos
                          </p>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="esReincidencia"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 flex items-center gap-3 border p-3 rounded-lg">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="h-7 w-11 [&>span]:size-5.5 
             data-[state=checked]:bg-emerald-500 
             data-[state=unchecked]:bg-gray-300"
                      />

                      <div>
                        <Label>Es reincidencia</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Marca si el empleado ya tiene actas previas similares
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                </div>
              </div>

              <div className="bg-gray-50 -mx-6 px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6 border-t">
                <Button variant="outline" type="button" onClick={handleClose} className="border-gray-300">
                  Cancelar
                </Button>

                <Button
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Guardando..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <NewTipoActaModal
        open={openNewTipoActa}
        onClose={setOpenNewTipoActa}
        refetch={mutateTiposActa}
        idEmpresa={dataUser?.id_empresa}
        mutateTiposActa={mutateTiposActa}
      />
    </>
  );
};

export default NewActaModal;
