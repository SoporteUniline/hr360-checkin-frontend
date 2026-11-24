"use client";

// La misma ventana de edición (PanelEditarAsistencia) para una persona y un día, abierta desde otra pantalla.
// `onCerrar(huboCambios)` dice si se guardó algo para que la pantalla que la abrió recalcule.
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetcherWithToken } from "@/lib/fetcher";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import useAsistenciaActions from "@/hooks/useAsistenciaActions";
import { useEmpresaTimezone } from "@/context/AuthContext";
import { avisoCalendario, correccionesCalendario, indiceFestivos as crearIndiceFestivos } from "@/lib/asistencia/calendario.mjs";
import { herramientasHoras } from "@/lib/asistencia/horasEdicion.mjs";
import PanelEditarAsistencia from "./PanelEditarAsistencia";

export default function EditarDiaAsistencia({ idEmpresa, idEmpleado, nombre, fecha, onCerrar }) {
  const params = new URLSearchParams({ empresa: String(idEmpresa), page: "1", limit: "50", fechaInicio: fecha, fechaFin: fecha, filtroEmpleado: nombre ?? "" });
  const { data, error, isLoading, mutate } = useSWR(idEmpresa && fecha ? `/checador/asistencias?${params}` : null, fetcherWithToken, { revalidateOnFocus: false });
  const { data: empleados } = useEmpleadosData(idEmpresa);
  const { data: tiposPermiso } = useTiposPermisoData();
  const { data: festivosData } = useSWR(idEmpresa ? `/checador/holidays/${idEmpresa}` : null, fetcherWithToken, { revalidateOnFocus: false });
  const indiceFestivos = useMemo(() => crearIndiceFestivos(festivosData), [festivosData]);
  const zonaEmpresa = useEmpresaTimezone(idEmpresa);

  const registro = useMemo(
    () => (Array.isArray(data?.registros) ? data.registros : []).find((r) => Number(r.id_empleado) === Number(idEmpleado) && String(r.fecha ?? "").slice(0, 10) === fecha) ?? null,
    [data, idEmpleado, fecha],
  );
  const cambio = useRef(false);
  const recargar = async () => { cambio.current = true; await mutate(); };
  const acciones = useAsistenciaActions(recargar, () => { cambio.current = true; });
  const { editingRowId, editingRowData, handleEditClick, handleFieldChange, handleCancelEdit, handleActualizarBase } = acciones;

  // Abre la ventana en cuanto llega el registro; si se refresca (corregir una checada) se actualiza sin perder el borrador.
  const abierto = useRef(false);
  useEffect(() => {
    if (!registro) return;
    if (!abierto.current) { abierto.current = true; handleEditClick(registro); } else handleActualizarBase(registro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registro]);

  // Al guardar o cerrar, el hook suelta el registro (de un id a null): se cierra y se avisa si hubo cambios.
  const idPrevio = useRef(null);
  useEffect(() => {
    if (idPrevio.current != null && editingRowId == null) onCerrar(cambio.current);
    idPrevio.current = editingRowId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingRowId]);

  // Domingo y festivo se corrigen al entrar a editar, igual que en Asistencias.
  const correcciones = useMemo(() => (registro ? correccionesCalendario(registro, indiceFestivos) : {}), [registro, indiceFestivos]);
  useEffect(() => {
    Object.entries(correcciones).forEach(([campo, valor]) => handleFieldChange(campo, valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correcciones]);

  if (!registro || editingRowId == null) {
    const fechaMx = String(fecha).split("-").reverse().join("/");
    const mensaje = error ? "No se pudo cargar la asistencia de ese día." : isLoading || !data ? "Cargando la asistencia…" : "Ese día no tiene registro en Asistencias para esta persona.";
    return (
      <Dialog open onOpenChange={(v) => !v && onCerrar(cambio.current)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{nombre}</DialogTitle>
            <DialogDescription>{fechaMx}</DialogDescription>
          </DialogHeader>
          <p role={error ? "alert" : "status"} className="text-sm text-slate-600">{mensaje}</p>
        </DialogContent>
      </Dialog>
    );
  }

  const zona = registro.zona_horaria || zonaEmpresa;
  const avisos = avisoCalendario(registro, indiceFestivos);
  return (
    <PanelEditarAsistencia
      abierto
      registro={registro}
      datos={editingRowData}
      zona={zona}
      horas={herramientasHoras(editingRowData, zona)}
      empleados={empleados?.data}
      tiposPermiso={tiposPermiso}
      avisoDe={(campo) => avisos.find((a) => a.campo === campo)?.texto}
      isSaving={acciones.isSaving}
      handleFieldChange={handleFieldChange}
      handleSaveClick={acciones.handleSaveClick}
      handleCancelEdit={handleCancelEdit}
      handleRestoreOriginal={acciones.handleRestoreOriginal}
      mutateAsistencia={recargar}
    />
  );
}
