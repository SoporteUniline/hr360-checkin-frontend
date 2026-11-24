import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import Cookies from "js-cookie";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarCheck2, Save } from "lucide-react";
// El empleado también pide permisos por horas (llega tarde, sale antes, sale y regresa): mismos campos y
// validación que el panel de RH. RH confirma o cambia «se repone / se rebaja» al aprobar.
import CamposPermisoHoras, { datosPermisoHoras, erroresPermisoHoras } from "@/app/panel/permisos/CamposPermisoHoras";
import { horarioPermiso } from "@/lib/asistencia/permisoHoras.mjs";
// Tipos de registro con goce: el empleado elige tipo y motivo; el goce y el trato de las horas los decide RH.
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import CamposMotivoGoce from "@/app/panel/permisos/CamposMotivoGoce";
import { camposSolicitud, esParcial, motivoAOpcion, motivoFinal, tipoHorasDe, tiposParaPermiso } from "@/lib/asistencia/tiposGoce.mjs";

const CAMPOS_HORAS = { modalidad: "dias", tipo_horas: "", tratamiento: "", hora_inicio: "", hora_fin: "" };
const corta = (h) => (h ? String(h).slice(0, 5) : "");

export const PermissionDialog = ({ open, setOpen, mutate, mode, selected }) => {
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const initialForm = {
    id_tipo_permiso: "",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
    estado: "Pendiente",
    id_empleado: dataUser?.id_empleado ?? "",
    motivoSel: { opcion: "", texto: "" },
    ...CAMPOS_HORAS,
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const isReadOnly = mode === "ver";
  const { data: dataMotivos } = useSWR(open ? "/checador/motivos-permiso" : null, fetcherWithToken, { revalidateOnFocus: false });
  const isEdit = mode === "editar";
  const isCreate = mode === "crear";

  useEffect(() => {
    if (open) {
      if ((mode === "editar" || mode === "ver") && selected) {
        setForm({
          id_tipo_permiso: String(selected.id_tipo_permiso),
          fecha_inicio: selected.fecha_inicio?.slice(0, 10),
          fecha_fin: selected.fecha_fin?.slice(0, 10),
          motivo: selected?.motivo ?? "",
          estado: selected.estado,
          id_empleado: selected.id_empleado,
          modalidad: selected.modalidad === "horas" ? "horas" : "dias",
          tipo_horas: selected.tipo_horas ?? "",
          tratamiento: selected.tratamiento ?? "",
          hora_inicio: corta(selected.hora_inicio),
          hora_fin: corta(selected.hora_fin),
          motivoSel: motivoAOpcion(selected.motivo_permiso, null),
        });
      } else {
        setForm(initialForm);
      }
      setErrors([]);
    } else {
      setForm(initialForm);
      setErrors([]);
    }
  }, [open, mode, selected]);

  const { data: tiposPermisoResponse, error: tiposError, isLoading: tiposLoading } = useTiposPermisoData();

  const arrayTiposPermiso = tiposPermisoResponse?.tiposPermiso;
  const tipoSel = (arrayTiposPermiso ?? []).find((t) => String(t.id) === String(form.id_tipo_permiso)) ?? null;
  // Un tipo que abarca parte del día ya dice si llega tarde, sale antes o sale y regresa.
  const parcial = Boolean(tipoSel && esParcial(tipoSel));
  const porHoras = parcial || form.modalidad === "horas";
  const nuevos = () => camposSolicitud(tipoSel, { motivo: motivoFinal(form.motivoSel), rh: false });

  const validateForm = () => {
    const validationErrors = [];
    if (!form.id_tipo_permiso)
      validationErrors.push("Selecciona el tipo de permiso.");
    // Las vacaciones no llevan motivo (descuentan del saldo).
    if (tipoSel && Number(tipoSel.descuenta_vacaciones) !== 1 && !motivoFinal(form.motivoSel)) validationErrors.push("Elige el motivo del permiso.");
    if (porHoras) return [...validationErrors, ...erroresPermisoHoras(form, { conTipo: parcial })];
    if (!form.fecha_inicio)
      validationErrors.push("La fecha de inicio es obligatoria.");
    if (!form.fecha_fin) validationErrors.push("La fecha fin es obligatoria.");
    if (
      form.fecha_inicio &&
      form.fecha_fin &&
      form.fecha_fin < form.fecha_inicio
    ) {
      validationErrors.push(
        "La fecha fin no puede ser anterior a la fecha inicio.",
      );
    }
    return validationErrors;
  };

  const getEmpresaIdSesion = () => {
    return (
      dataUser?.id_empresa ||
      dataUser?.empresas_detalle?.[0]?.id_empresa ||
      dataUser?.empresas?.[0] ||
      null
    );
  };

  const resolveEmpleadoId = async () => {
    const directId = Number(
      dataUser?.id_empleado || form.id_empleado || selected?.id_empleado,
    );
    if (Number.isFinite(directId) && directId > 0) {
      return directId;
    }

    const correoSesion = String(
      dataUser?.correo || dataUser?.email || "",
    ).trim();
    const empresaSesion = getEmpresaIdSesion();
    if (!correoSesion || !empresaSesion) return null;

    try {
      const token = Cookies.get("token");
      const response = await axios.get(
        `/checador/empleados/por-correo?empresa=${empresaSesion}&correo=${encodeURIComponent(
          correoSesion,
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const resolvedId = Number(response?.data?.id_empleado);
      return Number.isFinite(resolvedId) && resolvedId > 0 ? resolvedId : null;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      enqueueSnackbar("Revisa los campos marcados.", { variant: "warning" });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setErrors([]);
    try {
      const token = Cookies.get("token");
      const empleadoId = await resolveEmpleadoId();
      if (!empleadoId) {
        setErrors((prev) => [
          ...prev,
          "No se pudo identificar tu empleado en la sesión. Contacta al administrador.",
        ]);
        enqueueSnackbar("No se pudo identificar el empleado de la sesión.", {
          variant: "error",
        });
        return;
      }
      const payload = {
        id_tipo_permiso: Number(form.id_tipo_permiso),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        motivo: form.motivo || null,
        estado: "Pendiente",
        id_empleado: empleadoId,
        ...(porHoras ? datosPermisoHoras(form) : { modalidad: "dias" }),
        ...nuevos(),
      };

      await axios.post(`/checador/solicitudes-permiso`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      enqueueSnackbar("Solicitud creada correctamente", { variant: "success" });
      setOpen(false);
      mutate?.();
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.error || "No se pudo crear la solicitud",
        { variant: "error" },
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (savingRef.current) return;
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      enqueueSnackbar("Revisa los campos marcados.", { variant: "warning" });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setErrors([]);
    try {
      const token = Cookies.get("token");
      const empleadoId = await resolveEmpleadoId();
      if (!empleadoId) {
        setErrors((prev) => [
          ...prev,
          "No se pudo identificar tu empleado en la sesión. Contacta al administrador.",
        ]);
        enqueueSnackbar("No se pudo identificar el empleado de la sesión.", {
          variant: "error",
        });
        return;
      }
      const payload = {
        id_tipo_permiso: Number(form.id_tipo_permiso),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        motivo: form.motivo || null,
        id_empleado: empleadoId,
        estado: "Pendiente",
        ...(porHoras ? datosPermisoHoras(form) : { modalidad: "dias" }),
        ...nuevos(),
      };

      await axios.put(`/checador/solicitudes-permiso/${selected.id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      enqueueSnackbar("Solicitud actualizada correctamente", {
        variant: "success",
      });
      setOpen(false);
      mutate?.();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(
        error?.response?.data?.error || "No se pudo actualizar la solicitud",
        { variant: "error" },
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const pedibles = new Set(tiposParaPermiso(arrayTiposPermiso ?? []).map((t) => t.id));
  const arrayFiltered = arrayTiposPermiso?.filter((permiso) => pedibles.has(permiso.id) || Number(permiso.descuenta_vacaciones) === 1);

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!savingRef.current) setOpen(value); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 overflow-hidden max-w-[95vw] sm:max-w-xl [&_input]:min-h-11 [&_input]:text-base [&_textarea]:text-base [&_button]:min-h-11">
        <DialogHeader className="shrink-0 p-5 bg-blue-600 text-white">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-white/15">
              <CalendarCheck2 className="size-5 text-white" />
            </span>
            {isCreate
              ? "Solicitar permiso"
              : isEdit
              ? "Editar solicitud"
              : "Detalles del permiso"}
          </DialogTitle>
          <p className="text-sm text-white/80">
            {isReadOnly
              ? "Consulta el detalle de la solicitud."
              : "Completa los datos de tu solicitud de permiso."}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
          {tiposLoading && <p role="status" className="text-sm text-slate-500">Cargando tipos de permiso…</p>}
          {tiposError && <p role="alert" className="text-sm text-red-700">No pudimos cargar los tipos de permiso. Cierra e intenta de nuevo.</p>}
          {isReadOnly && <p className="text-sm font-medium">Estado: {selected?.estado} · {selected?.tipo_permiso_nombre}</p>}
          {isReadOnly && porHoras ? <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{horarioPermiso({ ...selected, hora_inicio: form.hora_inicio, hora_fin: form.hora_fin })} · {form.fecha_inicio?.split("-").reverse().join("/")}</p> : null}
          {!isReadOnly && !parcial ? (
            <div className="space-y-2">
              <Label>¿Por cuánto tiempo?</Label>
              <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200" role="radiogroup" aria-label="Duración del permiso">
                {[["dias", "Días completos"], ["horas", "Unas horas"]].map(([valor, texto]) => (
                  <button key={valor} type="button" role="radio" aria-checked={form.modalidad === valor} disabled={saving}
                    onClick={() => setForm((f) => ({ ...f, modalidad: valor }))}
                    className={`px-3 text-sm font-semibold transition ${form.modalidad === valor ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}>
                    {texto}
                  </button>
                ))}
              </div>
              {porHoras ? <p className="text-xs text-slate-500">Para llegar tarde, salir antes o salir y regresar el mismo día.</p> : null}
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="request-type">Tipo de permiso</Label>
              <Select
                value={form.id_tipo_permiso}
                onValueChange={(val) => {
                  const t = (arrayTiposPermiso ?? []).find((x) => String(x.id) === val);
                  setForm((prev) => ({
                    ...prev,
                    id_tipo_permiso: val,
                    ...(t && esParcial(t) ? { modalidad: "horas", tipo_horas: tipoHorasDe(t) } : {}),
                  }));
                }}
                disabled={isReadOnly || saving}
              >
                <SelectTrigger id="request-type" className="h-auto w-full min-h-11 whitespace-normal bg-white text-left text-base [&>span]:line-clamp-none">
                  <SelectValue placeholder="Selecciona un tipo de permiso" />
                </SelectTrigger>

                <SelectContent className="max-h-60 overflow-y-auto">
                  {arrayFiltered?.map((permiso) => (
                    <SelectItem key={permiso.id} value={String(permiso.id)}>
                      {permiso.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {porHoras ? null : (<>
            <div className="space-y-2">
              <Label htmlFor="request-start">Fecha inicial</Label>
              <Input
                id="request-start"
                type="date"
                value={form.fecha_inicio}
                onChange={(e) =>
                  setForm((formOriginal) => ({
                    ...formOriginal,
                    fecha_inicio: e.target.value,
                  }))
                }
                disabled={isReadOnly || saving}
              ></Input>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-end">Fecha final</Label>
              <Input
                id="request-end"
                type="date"
                value={form.fecha_fin}
                min={form.fecha_inicio || undefined}
                onChange={(e) =>
                  setForm((formOriginal) => ({
                    ...formOriginal,
                    fecha_fin: e.target.value,
                  }))
                }
                disabled={isReadOnly || saving}
              />
            </div>
            </>)}
          </div>

          {porHoras && !isReadOnly ? <CamposPermisoHoras form={form} setForm={setForm} tipoFijo={parcial} sinTratamiento={parcial} /> : null}

          {tipoSel ? (
            <CamposMotivoGoce tipo={tipoSel} motivos={dataMotivos} motivo={form.motivoSel} conGoce={false} disabled={isReadOnly || saving}
              onMotivo={(m) => setForm((f) => ({ ...f, motivoSel: m }))} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="request-reason">Observaciones</Label>
            <Textarea
              id="request-reason"
              rows={4}
              placeholder="Describe el motivo del permiso..."
              value={form.motivo ?? ""}
              onChange={(e) =>
                setForm((formOriginal) => ({
                  ...formOriginal,
                  motivo: e.target.value,
                }))
              }
              disabled={isReadOnly || saving}
            />
          </div>

          {errors.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>Corrige los siguientes puntos</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((errorMsg, index) => (
                    <li key={`error-${index}`}>{errorMsg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
          <Button disabled={saving} variant="secondary" onClick={() => setOpen(false)}>
            {isReadOnly ? "Cerrar" : "Cancelar"}
          </Button>

          {mode === "crear" && (
            <Button
              disabled={saving || tiposLoading || Boolean(tiposError)}
              onClick={handleSave}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Enviando…" : "Enviar solicitud"}
            </Button>
          )}

          {mode === "editar" && (
            <Button
              disabled={saving || tiposLoading || Boolean(tiposError)}
              onClick={handleUpdate}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
