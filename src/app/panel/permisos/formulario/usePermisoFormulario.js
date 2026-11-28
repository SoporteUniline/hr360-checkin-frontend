"use client";

// Estado y guardado del permiso en página (28/11/2026). Es la MISMA lógica que tenía la ventana PermisoDialog.jsx
// (validaciones, qué se manda al backend, goce y horas del motivo, alta masiva por días, una por persona por horas,
// cambio de estado y cancelación con días pasados); solo cambió dónde se dibuja: FormularioPermiso.jsx.
// No cambies aquí reglas de negocio sin cambiarlas también en el backend (solicitudPermisoController).
//   - Se relaciona con: src/lib/permisosApi.js, src/lib/asistencia/quePasoMotivo.mjs y CamposPermisoHoras.jsx.
//   - Lo nuevo de la página (no es regla de negocio): `sucio` (hay cambios sin guardar) y `guardar()` regresa true/false.
import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import useSWR from "swr";
import Cookies from "js-cookie";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { permisosApi } from "@/lib/permisosApi";
import { hhmm } from "@/lib/fechaHora.mjs";
import { tipoHorasDe } from "@/lib/asistencia/tiposGoce.mjs";
import { aplicado, camposSolicitud, claseDe, faltaPar, parDesdeSolicitud, parVacio } from "@/lib/asistencia/quePasoMotivo.mjs";
import { fotoPermiso } from "@/lib/permisos/paginaPermiso.mjs";
import { datosPermisoHoras, erroresPermisoHoras } from "../CamposPermisoHoras";

const esPorHoras = (item) => item?.modalidad === "horas";

const formVacio = () => ({
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
  // «Qué pasó» (id_tipo_permiso) + «Motivo»: el goce y las horas vienen del motivo (lib/asistencia/quePasoMotivo.mjs).
  par: parVacio(),
});

/**
 * editItem: el permiso a editar tal cual lo da la lista (null = nuevo). idEmpresa: la unidad elegida en la lista
 * («all» = todas). tiposPermiso: catálogo de tipos de registro.
 */
export default function usePermisoFormulario({ editItem = null, idEmpresa = "all", tiposPermiso = [] }) {
  const isEdit = Boolean(editItem);
  const { enqueueSnackbar } = useSnackbar();
  const [idEmpresaSeleccionada, setIdEmpresaSeleccionada] = useState("");

  // Estado del formulario (sin id_empleado aquí porque puede ser uno/muchos/todos)
  const [form, setForm] = useState(formVacio);
  const tipoSel = (Array.isArray(tiposPermiso) ? tiposPermiso : []).find((t) => String(t.id) === String(form.id_tipo_permiso)) ?? null;
  // Un tipo que abarca parte del día (entrada, salida o en medio) siempre es por horas y ya dice cuál; con los demás se
  // elige «Días completos» o «Por horas» como siempre.
  const parcial = Boolean(tipoSel && claseDe(tipoSel) === "parcial");
  const porHoras = parcial || form.modalidad === "horas";
  const { data: dataMotivos, error: errorMotivos } = useSWR("/checador/motivos-permiso", fetcherWithToken, { revalidateOnFocus: false });
  const nuevos = () => camposSolicitud(form.par, tipoSel, dataMotivos, { rh: true });
  const ap = aplicado(form.par, tipoSel, dataMotivos);
  // El motivo guardado se lee otra vez cuando llega el catálogo de motivos, mientras no se haya tocado.
  const parTocado = useRef(false);
  const [parLeido, setParLeido] = useState(false);
  useEffect(() => {
    if (isEdit && dataMotivos && !parTocado.current) setForm((f) => ({ ...f, par: parDesdeSolicitud(editItem, dataMotivos) }));
    if (dataMotivos) setParLeido(true);
  }, [isEdit, editItem, dataMotivos]);
  const elegirTipo = (v) => {
    const t = (Array.isArray(tiposPermiso) ? tiposPermiso : []).find((x) => String(x.id) === v);
    setForm((f) => ({ ...f, id_tipo_permiso: v, par: { ...f.par, goce: null, horas: null },
      ...(t && claseDe(t) === "parcial" ? { modalidad: "horas", tipo_horas: tipoHorasDe(t) } : {}) }));
  };
  const cambiarPar = (par) => { parTocado.current = true; setForm((f) => ({ ...f, par })); };
  const cambiarHoras = (v) => { parTocado.current = true; setForm((f) => ({ ...f, par: { ...f.par, horas: v } })); };

  // Catálogo y selección de empleados
  const [empleados, setEmpleados] = useState([]); // [{ id, nombre }]
  const [empleadosListos, setEmpleadosListos] = useState(false);
  const [empleadoId, setEmpleadoId] = useState(""); // para 'one'
  const [empleadoIds, setEmpleadoIds] = useState([]); // para 'many'
  const [empleadosBusqueda, setEmpleadosBusqueda] = useState("");

  const [loading, setLoading] = useState(false);
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

  // Cargar empleados de la empresa elegida
  useEffect(() => {
    if (!idEmpresaSeleccionada) {
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
      } finally {
        setEmpleadosListos(true);
      }
    })();
  }, [idEmpresaSeleccionada, isEdit, editItem]);

  // Rellenar datos del form al abrir/editar
  const [iniciado, setIniciado] = useState(false);
  useEffect(() => {
    let inicial = "";
    if (isEdit) {
      inicial = String(editItem?.id_empresa || "");
    } else if (idEmpresa && idEmpresa !== "all") {
      inicial = String(idEmpresa);
    }
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
      par: parDesdeSolicitud(editItem, dataMotivos),
    });
    parTocado.current = false;
    setErrors([]);
    // Evitar fugas de estado entre ediciones (cancelación con días pasados).
    setDiasPasadosPayload(null);
    setFechasPasadasPendientes([]);
    setOpenCancelDiasPasados(false);
    setIniciado(true);
    // Solo al abrir o cambiar de registro: si el catálogo de motivos llega después, el motivo guardado se vuelve a leer
    // arriba (sin reiniciar lo que el usuario ya cambió).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem, idEmpresa, isEdit]);

  // ¿Hay cambios sin guardar? Se toma la «foto» de lo cargado cuando ya llegó todo (empleados y, al editar, el motivo
  // guardado) y se compara con lo de ahora.
  const foto = fotoPermiso({ form, empleadoId, empleadoIds, idEmpresa: idEmpresaSeleccionada });
  const listo = iniciado && (!idEmpresaSeleccionada || empleadosListos) && (!isEdit || parLeido || Boolean(errorMotivos));
  const fotoInicial = useRef(null);
  useEffect(() => {
    if (listo && fotoInicial.current === null) fotoInicial.current = foto;
  }, [listo, foto]);
  const sucio = fotoInicial.current !== null && foto !== fotoInicial.current;

  // Nota: antes se bloqueaba la edición cuando el periodo ya había finalizado.
  // Requerimiento nuevo: SIEMPRE permitir edición/cancelación, pero con validaciones.

  // Regresa true si se guardó.
  async function guardar() {
    // Validaciones de formulario con mensajes amigables
    const errs = [];
    if (!form.id_tipo_permiso) errs.push("Selecciona el tipo de permiso.");
    const faltaMotivo = tipoSel ? faltaPar(form.par, tipoSel, dataMotivos, { motivoObligatorio: true }) : "";
    if (faltaMotivo) errs.push(faltaMotivo);
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
      return false;
    }
    setErrors([]);

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
          JSON.stringify(nuevos()) !== JSON.stringify(camposSolicitud(parDesdeSolicitud(editItem, dataMotivos), tipoSel, dataMotivos, { rh: true })) ||
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
              : form.estado === "Aprobado" && ap.r.goceCambia && ap.goce && !parcial
                ? { goce: ap.goce }
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
      return true;
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.error ||
        (e?.response?.status === 409
          ? "Existe un traslape con otro permiso activo o pendiente."
          : "Ocurrió un error al guardar.");
      enqueueSnackbar(msg, { variant: "error" });
      return false;
    } finally {
      setLoading(false);
    }
  }

  const filteredEmpleados = empleados.filter((e) =>
    e.nombre.toLowerCase().includes(empleadosBusqueda.trim().toLowerCase()),
  );

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

  // Cerrar la ventana de días pasados sin confirmar NO cambia el estado a Cancelado.
  const cambiarVentanaDiasPasados = (v) => {
    setOpenCancelDiasPasados(v);
    if (!v) setFechasPasadasPendientes([]);
  };
  // Guardar payload para enviarlo en `actualizarEstado` y aplicar el estado.
  const confirmarDiasPasados = (payload) => {
    setDiasPasadosPayload(payload);
    setForm((f) => ({ ...f, estado: "Cancelado" }));
    enqueueSnackbar("Días pasados configurados. Ahora guarda para cancelar.", { variant: "info" });
  };

  const cambiarEmpresa = (v) => {
    setIdEmpresaSeleccionada(v);
    setEmpleadoIds([]);
    setEmpleadoId(""); // Limpiar también el ID simple
  };
  const alternarEmpleado = (id) => setEmpleadoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return {
    isEdit, form, setForm, tipoSel, parcial, porHoras, dataMotivos, ap, elegirTipo, cambiarPar, cambiarHoras,
    idEmpresaSeleccionada, cambiarEmpresa, empleados, filteredEmpleados, empleadoId, setEmpleadoId, empleadoIds, alternarEmpleado,
    empleadosBusqueda, setEmpleadosBusqueda, loading, errors, guardar, handleEstadoChange, sucio,
    tiposRegistro, openCancelDiasPasados, cambiarVentanaDiasPasados, fechasPasadasPendientes, confirmarDiasPasados,
  };
}
