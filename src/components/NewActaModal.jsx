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
import { PlusIcon, Search } from "lucide-react";
import NewTipoActaModal from "./NewTipoActaModal";
import { administrativeMinutesApi } from "@/lib/administrativeMinutesApi";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import useTiposActa from "@/hooks/useTiposActa";

const schema = z.object({
  empresa: z.string().min(1, "Selecciona una empresa"),
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
  refetch,
  dataUser,
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
  const [hoveredEmpSuggestionIndex, setHoveredEmpSuggestionIndex] =
    useState(-1);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      empresa: "",
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

  const empresaSeleccionada = form.watch("empresa");

  const {
    data: tiposActa = [],
    isLoading: loadingTipos,
    mutate: mutateTiposActa,
  } = useTiposActa(empresaSeleccionada || null, 1, 100, "");

  const empleadosSugResp = useEmpleadosData(
    empresaSeleccionada,
    1,
    8,
    empSearch,
    "",
    "",
    ""
  );

  const empleadosElaboraResp = useEmpleadosData(
    empresaSeleccionada,
    1,
    100,
    "",
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
      ? `/checador/empleados/por-correo?empresa=${
          dataUser.id_empresa
        }&correo=${encodeURIComponent(correoSesion)}`
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
      [e.nombre, e.apellido_paterno, e.apellido_materno]
        .filter(Boolean)
        .join(" ")
    );
  }, [empleadoElaboraAuto]);

  const empleadoElaboraAutoPuesto = useMemo(() => {
    const e = empleadoElaboraAuto;
    // En ambos casos el backend entrega `puesto` ya resuelto (JOIN puestos).
    return e?.puesto ? String(e.puesto) : "";
  }, [empleadoElaboraAuto]);

  /**
   * Precarga valores cuando el modal se usa en modo edición.
   * Importante: se hace cuando `open` cambia para no pisar cambios del usuario mientras escribe.
   */
  useEffect(() => {
    if (!open || mode !== "edit" || !actaToEdit) return;

    form.reset({
      empresa: String(actaToEdit.id_empresa), // 🔥 CLAVE
      empleado: String(actaToEdit.id_empleado ?? ""),
      tipoActa: String(actaToEdit.id_tipo_acta ?? ""),
      fechaIncidente: actaToEdit.fecha_incidente
        ? String(actaToEdit.fecha_incidente).slice(0, 10)
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

    setEmpSearch(
      `${actaToEdit.nombre_empleado || ""} ${
        actaToEdit.apellido_paterno_empleado || ""
      } ${actaToEdit.apellido_materno_empleado || ""}`
        .replace(/\s+/g, " ")
        .trim()
    );
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
        id_empresa: mode === "edit" ? actaToEdit.id_empresa : values.empresa,
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
        enqueueSnackbar("Acta actualizada correctamente", {
          variant: "success",
        });
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
          (mode === "edit"
            ? "Hubo un error al actualizar el acta"
            : "Hubo un error al crear el acta"),
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

  const empleadosElabora = useMemo(() => {
    if (!empresaSeleccionada) return [];
    return (
      empleadosElaboraResp?.data?.data?.map((e) => ({
        value: String(e.id_empleado),
        label: [e.nombre, e.apellido_paterno, e.apellido_materno]
          .filter(Boolean)
          .join(" "),
      })) || []
    );
  }, [empresaSeleccionada, empleadosElaboraResp?.data]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className={twMerge("sm:max-w-xl md:max-w-2xl lg:max-w-3xl")}
        >
          <DialogHeader className="border-b-2 pb-2">
            <DialogTitle className="text-md text-gray-700">
              {mode === "edit"
                ? "✏️ Editar Acta Administrativa"
                : "📋 Nueva Acta Administrativa"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="text-sm space-y-2 pt-2 max-h-[60vh] overflow-y-auto px-1"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                {mode === "create" && (
                  <FormField
                    control={form.control}
                    name="empresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabelWithAsterisk
                          required
                          className="text-gray-600"
                        >
                          Empresa
                        </FormLabelWithAsterisk>

                        <FormControl>
                          <Combobox
                            options={[
                              ...(dataUser?.empresas_detalle || []).map(
                                (e) => ({
                                  value: String(e.id_empresa),
                                  label: e.nombre,
                                })
                              ),
                            ]}
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              form.setValue("empleado", "");
                              form.setValue("elabora", "");
                              form.setValue("tipoActa", "");
                              setEmpSearch("");
                            }}
                            placeholder="Selecciona una empresa"
                            emptyText="No se encontraron empresas"
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                              className="pl-9"
                              placeholder="Buscar empleado..."
                              value={empSearch}
                              disabled={!empresaSeleccionada}
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
                                if (
                                  !isEmpSuggestionsOpen ||
                                  sugerenciasEmpleados.length === 0
                                )
                                  return;
                                if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  setHoveredEmpSuggestionIndex((prev) =>
                                    prev + 1 >= sugerenciasEmpleados.length
                                      ? 0
                                      : prev + 1
                                  );
                                } else if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  setHoveredEmpSuggestionIndex((prev) =>
                                    prev - 1 < 0
                                      ? sugerenciasEmpleados.length - 1
                                      : prev - 1
                                  );
                                } else if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSelectEmpleadoSugerencia(
                                    sugerenciasEmpleados[
                                      hoveredEmpSuggestionIndex
                                    ] || sugerenciasEmpleados[0]
                                  );
                                } else if (e.key === "Escape") {
                                  setIsEmpSuggestionsOpen(false);
                                }
                              }}
                            />

                            {isEmpSuggestionsOpen &&
                            sugerenciasEmpleados.length > 0 ? (
                              <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow">
                                <ul className="max-h-64 overflow-auto">
                                  {sugerenciasEmpleados.map((emp, idx) => (
                                    <li
                                      key={emp.id_empleado}
                                      onMouseDown={() =>
                                        handleSelectEmpleadoSugerencia(emp)
                                      }
                                      onMouseEnter={() =>
                                        setHoveredEmpSuggestionIndex(idx)
                                      }
                                      className={`px-3 py-2 cursor-pointer text-sm ${
                                        idx === hoveredEmpSuggestionIndex
                                          ? "bg-slate-100"
                                          : ""
                                      }`}
                                    >
                                      {emp.nombre_completo}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {/* Campo "real" que viaja al submit: ID del empleado */}
                            <input
                              type="hidden"
                              value={field.value || ""}
                              readOnly
                            />
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
                                disabled={!empresaSeleccionada || loadingTipos}
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      !empresaSeleccionada
                                        ? "Selecciona primero una empresa"
                                        : loadingTipos
                                        ? "Cargando tipos..."
                                        : "Selecciona un tipo de acta"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {(tiposActa || []).map((tipo) => (
                                    <SelectItem
                                      key={tipo.id_tipo_acta}
                                      value={String(tipo.id_tipo_acta)}
                                    >
                                      {tipo.nombre_tipo} (ID {tipo.id_tipo_acta}
                                      )
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              type="button"
                              className="bg-slate-700 hover:bg-slate-800 p-2"
                              onClick={() => setOpenNewTipoActa(true)}
                            >
                              <PlusIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

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
                    <FormItem>
                      <Label className="text-gray-600">
                        Lugar del incidente
                      </Label>
                      <FormControl>
                        <Input placeholder="Ej: Oficina, Almacén" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

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
                            <Input
                              value="Cargando usuario logeado..."
                              disabled
                              className="bg-muted"
                            />
                          ) : mode === "create" &&
                            empleadoElaboraAuto?.id_empleado ? (
                            <div className="space-y-2">
                              <Input
                                value={empleadoElaboraAutoNombre || "—"}
                                disabled
                                className="bg-muted"
                              />
                              <input
                                type="hidden"
                                value={field.value || ""}
                                readOnly
                              />
                            </div>
                          ) : (
                            // 👉 AQUÍ YA NO METEMOS {} EXTRA
                            <Combobox
                              options={empleadosElabora}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder={
                                !empresaSeleccionada
                                  ? "Selecciona primero una empresa"
                                  : "Selecciona quién elabora"
                              }
                              emptyText={
                                empresaSeleccionada
                                  ? "No se encontraron empleados"
                                  : "Selecciona una empresa"
                              }
                              disabled={!empresaSeleccionada}
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
                          disabled={
                            mode === "create" &&
                            Boolean(empleadoElaboraAuto?.id_empleado)
                          }
                          className={
                            mode === "create" &&
                            Boolean(empleadoElaboraAuto?.id_empleado)
                              ? "bg-muted"
                              : ""
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

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

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" type="button" onClick={handleClose}>
                  Cancelar
                </Button>

                <Button
                  className="bg-slate-700 hover:bg-slate-800"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? mode === "edit"
                      ? "Actualizando..."
                      : "Creando..."
                    : mode === "edit"
                    ? "💾 Guardar Cambios"
                    : "💾 Crear Acta"}
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
        idEmpresa={empresaSeleccionada}
        mutateTiposActa={mutateTiposActa}
      />
    </>
  );
};

export default NewActaModal;
