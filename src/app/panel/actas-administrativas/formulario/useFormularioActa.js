"use client";

// Estado y guardado del acta administrativa en página (28/11/2026). Es la MISMA lógica que tenía la ventana
// src/components/NewActaModal.jsx: el mismo esquema (validaciones y mensajes), el buscador de empleado, el autollenado de
// «Elabora el acta» y su cargo desde la sesión, y el mismo cuerpo que se manda al crear o editar. Solo cambió dónde se
// dibuja: FormularioActa.jsx (por pasos).
//   - Lo nuevo de la página (no es regla de negocio): `sucio` (cambios sin guardar), `revisarPaso` (valida con el MISMO
//     esquema solo los campos de un paso) y `guardar()` regresa { ok }.
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { administrativeMinutesApi } from "@/lib/administrativeMinutesApi";
import { fetcherWithToken } from "@/lib/fetcher";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposActa from "@/hooks/useTiposActa";
import { CAMPOS_PASO } from "@/lib/actas/formularioActa.mjs";

// El mismo esquema de NewActaModal.jsx.
export const schemaActa = z.object({
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

const VACIO = {
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
};

/** mode: "create" | "edit". actaToEdit: el acta (del listado) a editar. dataUser: la sesión (useAuth). */
export default function useFormularioActa({ mode = "create", actaToEdit = null, dataUser = null }) {
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Buscador de empleado estilo "Contratos":
   * - Input con sugerencias (dropdown)
   * - Navegación con teclado (↑/↓/Enter/Esc)
   * - Fuente de datos: `src/hooks/useEmpleadosData.js` -> endpoint `/checador/empleados`
   */
  const [empSearch, setEmpSearch] = useState("");
  const [isEmpSuggestionsOpen, setIsEmpSuggestionsOpen] = useState(false);
  const [hoveredEmpSuggestionIndex, setHoveredEmpSuggestionIndex] = useState(-1);
  const form = useForm({ resolver: zodResolver(schemaActa), defaultValues: VACIO });

  const empresaSeleccionada = form.watch("empresa");

  const { data: tiposActa = [], isLoading: loadingTipos, mutate: mutateTiposActa } = useTiposActa(empresaSeleccionada || null, 1, 100, "");

  const empleadosSugResp = useEmpleadosData(empresaSeleccionada, 1, 8, empSearch, "", "", "");
  const empleadosElaboraResp = useEmpleadosData(empresaSeleccionada, 1, 100, "", "", "", "");

  const sugerenciasEmpleados = useMemo(() => {
    const list = empleadosSugResp?.data?.data || [];
    return list.map((e) => ({
      id_empleado: e.id_empleado,
      nombre_completo: [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" "),
    }));
  }, [empleadosSugResp?.data]);

  const handleSelectEmpleadoSugerencia = (emp) => {
    if (!emp) return;
    setEmpSearch(emp.nombre_completo || "");
    setIsEmpSuggestionsOpen(false);
    form.setValue("empleado", String(emp.id_empleado), { shouldValidate: true, shouldDirty: true });
  };

  /**
   * Autollenado del campo "Elabora el acta" y "Cargo de quien elabora":
   * - Toma el empleado autenticado (`dataUser.id_empleado`)
   * - Si el usuario autenticado NO trae `id_empleado` (caso común cuando el token es de `usuarios`),
   *   resolvemos el empleado por correo con `/checador/empleados/por-correo`.
   * - Obtiene su puesto desde backend (empleados.id_puesto -> JOIN puestos).
   */
  const idEmpleadoSesion = dataUser?.id_empleado || null;
  const correoSesion = (dataUser?.correo || dataUser?.email || "").trim();

  const { data: empleadoPorCorreoResp, isLoading: empleadoPorCorreoLoading } = useSWR(
    !idEmpleadoSesion && correoSesion && dataUser?.id_empresa
      ? `/checador/empleados/por-correo?empresa=${dataUser.id_empresa}&correo=${encodeURIComponent(correoSesion)}`
      : null,
    fetcherWithToken,
  );
  // La ruta `/por-correo` devuelve un objeto (no array).
  const empleadoPorCorreo = useMemo(() => empleadoPorCorreoResp || null, [empleadoPorCorreoResp]);

  const { data: empleadoSesionData } = useSWR(idEmpleadoSesion ? `/checador/empleados/${idEmpleadoSesion}` : null, fetcherWithToken);

  const elaboraAutoEnProceso =
    mode === "create" && !idEmpleadoSesion && Boolean(correoSesion) && Boolean(dataUser?.id_empresa) && Boolean(empleadoPorCorreoLoading);

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
    return e.nombre_completo || [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" ");
  }, [empleadoElaboraAuto]);

  // En ambos casos el backend entrega `puesto` ya resuelto (JOIN puestos).
  const empleadoElaboraAutoPuesto = useMemo(() => (empleadoElaboraAuto?.puesto ? String(empleadoElaboraAuto.puesto) : ""), [empleadoElaboraAuto]);

  /**
   * El autollenado "Elabora" solo aplica cuando:
   * - estamos en creación
   * - hay empleado resuelto desde sesión
   * - y la empresa seleccionada coincide con la del empleado resuelto
   */
  const autoElaboraDisponible = useMemo(() => {
    if (mode !== "create") return false;
    if (!empleadoElaboraAuto?.id_empleado) return false;
    if (!empresaSeleccionada) return false;
    const empresaEmpleadoAuto = empleadoElaboraAuto?.id_empresa || dataUser?.id_empresa || null;
    if (!empresaEmpleadoAuto) return false;
    return String(empresaEmpleadoAuto) === String(empresaSeleccionada);
  }, [mode, empleadoElaboraAuto?.id_empleado, empleadoElaboraAuto?.id_empresa, dataUser?.id_empresa, empresaSeleccionada]);

  // Precarga valores en modo edición (cuando llega el acta; no pisa lo que se escribe después).
  useEffect(() => {
    if (mode !== "edit" || !actaToEdit) return;

    form.reset({
      empresa: String(actaToEdit.id_empresa),
      empleado: String(actaToEdit.id_empleado ?? ""),
      tipoActa: String(actaToEdit.id_tipo_acta ?? ""),
      fechaIncidente: actaToEdit.fecha_incidente ? String(actaToEdit.fecha_incidente).slice(0, 10) : "",
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
      `${actaToEdit.nombre_empleado || ""} ${actaToEdit.apellido_paterno_empleado || ""} ${actaToEdit.apellido_materno_empleado || ""}`
        .replace(/\s+/g, " ")
        .trim(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, actaToEdit]);

  /**
   * Inicialización en modo creación:
   * - Preselecciona la empresa de la sesión
   * - Limpia el buscador
   * - Autocompleta "Elabora" y "Cargo" desde la sesión (si aplica y la empresa coincide)
   */
  useEffect(() => {
    if (mode !== "create") return;

    // En creación, preseleccionamos empresa desde la sesión para evitar estado vacío
    // al abrir "Nuevo Tipo de Acta" y al cargar combos dependientes.
    const empresaActual = form.getValues("empresa");
    if (!empresaActual) {
      const empresaSesion =
        dataUser?.id_empresa ||
        (Array.isArray(dataUser?.empresas_detalle) && dataUser.empresas_detalle.length === 1 ? dataUser.empresas_detalle[0]?.id_empresa : null);
      if (empresaSesion) {
        form.setValue("empresa", String(empresaSesion), { shouldValidate: false, shouldDirty: false });
      }
    }

    // Reset de la UI del buscador (sin borrar otros campos si el usuario ya escribió)
    setEmpSearch("");
    setIsEmpSuggestionsOpen(false);
    setHoveredEmpSuggestionIndex(-1);

    // Autollenado desde sesión (id_empleado o por correo) (si aplica y empresa coincide)
    if (autoElaboraDisponible) {
      form.setValue("elabora", String(empleadoElaboraAuto.id_empleado), { shouldValidate: true, shouldDirty: false });
      if (empleadoElaboraAutoPuesto) {
        form.setValue("cargoElabora", String(empleadoElaboraAutoPuesto), { shouldValidate: false, shouldDirty: false });
      }
    } else {
      // Si no aplica autollenado para la empresa seleccionada, permitimos captura manual.
      form.setValue("elabora", "", { shouldValidate: false, shouldDirty: false });
      form.setValue("cargoElabora", "", { shouldValidate: false, shouldDirty: false });
    }
  }, [
    mode,
    dataUser?.id_empresa,
    dataUser?.empresas_detalle,
    form,
    empresaSeleccionada,
    autoElaboraDisponible,
    empleadoElaboraAuto?.id_empleado,
    empleadoElaboraAutoPuesto,
  ]);

  // Lo que se manda (igual que la ventana). Regresa { ok }.
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
        enqueueSnackbar("Acta actualizada correctamente", { variant: "success" });
      } else {
        await administrativeMinutesApi.crear(body);
        enqueueSnackbar("Acta creada correctamente", { variant: "success" });
      }
      // Sin form.reset(): la página navega enseguida. Si se marcara «sin cambios» antes, la guardia de salida haría
      // back() a la vez que la navegación (ver irTrasGuardar en FormularioActa.jsx).
      return { ok: true };
    } catch (error) {
      console.error("Error al crear el acta:", error);
      enqueueSnackbar(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          (mode === "edit" ? "Hubo un error al actualizar el acta" : "Hubo un error al crear el acta"),
        { variant: "error" },
      );
      return { ok: false, servidor: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guardar: como el <form onSubmit={form.handleSubmit(onSubmit)}> de la ventana (valida TODO con el esquema y, si está
  // bien, manda). { ok:false, errores } si falta algo.
  const enviando = useRef(false);
  const guardar = async () => {
    if (enviando.current) return { ok: false };
    enviando.current = true;
    try {
      let resultado = { ok: false };
      await form.handleSubmit(
        async (values) => { resultado = await onSubmit(values); },
        (errores) => { resultado = { ok: false, errores }; },
      )();
      return resultado;
    } finally {
      enviando.current = false;
    }
  };
  // «Continuar»: valida con el mismo esquema solo los campos del paso.
  const revisarPaso = (paso) => form.trigger(CAMPOS_PASO[paso] ?? []);
  // Un campo marcado en rojo se vuelve a revisar al corregirlo (para que el error se quite en cuanto queda bien).
  useEffect(() => {
    const sub = form.watch((_, { name }) => {
      if (name && form.getFieldState(name).error) form.trigger(name);
    });
    return () => sub.unsubscribe();
  }, [form]);

  const empleadosElabora = useMemo(() => {
    if (!empresaSeleccionada) return [];
    return (
      empleadosElaboraResp?.data?.data?.map((e) => ({
        value: String(e.id_empleado),
        label: [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" "),
      })) || []
    );
  }, [empresaSeleccionada, empleadosElaboraResp?.data]);

  // Al cambiar de empresa se limpia lo que depende de ella (igual que la ventana).
  const cambiarEmpresa = (value) => {
    form.setValue("empresa", value, { shouldDirty: true, shouldTouch: true });
    form.setValue("empleado", "");
    form.setValue("elabora", "");
    form.setValue("cargoElabora", "");
    form.setValue("tipoActa", "");
    setEmpSearch("");
  };

  const sucio = form.formState.isDirty;

  return {
    form, sucio, isSubmitting, guardar, revisarPaso, cambiarEmpresa,
    empresaSeleccionada, tiposActa, loadingTipos, mutateTiposActa,
    empSearch, setEmpSearch, isEmpSuggestionsOpen, setIsEmpSuggestionsOpen, hoveredEmpSuggestionIndex, setHoveredEmpSuggestionIndex,
    sugerenciasEmpleados, handleSelectEmpleadoSugerencia,
    elaboraAutoEnProceso, autoElaboraDisponible, empleadoElaboraAutoNombre, empleadosElabora,
  };
}
