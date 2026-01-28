"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import axios from "@/lib/axios";
import Cookies from "js-cookie";
import { useSnackbar } from "notistack";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { contratosApi } from "@/lib/contratosApi";
import { Copy, FileText, Pencil, Plus, Save } from "lucide-react";

/**
 * Dialog para crear/editar/duplicar Contratos.
 * - Si `seedItem` llega y NO es edición, precarga datos como duplicación.
 */
export default function ContratoDialog({
  open,
  setOpen,
  editItem,
  seedItem,
  idEmpresa,
  onSaved,
}) {
  const isEdit = Boolean(editItem);
  const isDuplicate = !isEdit && !!seedItem;
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth();

  // Catálogo empleados (por empresa)
  const [empleados, setEmpleados] = useState([]);
  const [empleadoId, setEmpleadoId] = useState("");
  const [puestos, setPuestos] = useState([]);

  // Buscadores con sugerencias (empleado y jefe)
  const [empSearch, setEmpSearch] = useState("");
  const [openEmpSug, setOpenEmpSug] = useState(false);
  const [jefeSearch, setJefeSearch] = useState("");
  const [openJefeSug, setOpenJefeSug] = useState(false);

  // Formulario principal
  const [form, setForm] = useState({
    tipo_contrato: "",
    fecha_inicio: "",
    fecha_fin: "",
    salario_base: "",
    periodicidad_pago: "",
    moneda: "MXN",
    tipo_jornada: "diurna",
    horas_semanales: 40,
    hora_entrada: "09:00",
    hora_salida: "18:00",
    hora_comida_inicio: "14:00",
    hora_comida_fin: "15:00",
    puesto: "",
    departamento: "",
    modalidad_trabajo: "presencial",
    dias_vacaciones: 6,
    aguinaldo_dias: 15,
    prima_vacacional: 25,
    prestaciones_superiores: "",
    notas: "",
    estatus: "activo",
    jefe_inmediato_id: "",
    lugar_trabajo: "",
  });

  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar empleados al abrir
  useEffect(() => {
    if (!open || !idEmpresa) return;
    (async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get(
          `/checador/empleados/activos?empresa=${idEmpresa}&page=1&limit=1000`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const mapped = list.map((e) => ({
          id: String(e.id_empleado),
          nombre: [e.nombre, e.apellido_paterno, e.apellido_materno]
            .filter(Boolean)
            .join(" "),
          puesto: e.puesto || "",
          departamento: e.departamento || "",
          id_puesto: e.id_puesto || null,
        }));
        setEmpleados(mapped);
      } catch {
        setEmpleados([]);
      }
      try {
        const token = Cookies.get("token");
        const r2 = await axios.get(
          `/checador/empleados/puestos?empresa=${idEmpresa}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const arr = Array.isArray(r2.data) ? r2.data : [];
        setPuestos(
          arr.map((p) => ({
            id: String(p.id || p.id_puesto || p.id),
            nombre: p.nombre || p.nombre_puesto || "",
          }))
        );
      } catch {}
    })();
  }, [open, idEmpresa]);

  function nombrePuestoPorId(idP) {
    if (!idP) return null;
    const found = puestos.find((p) => String(p.id) === String(idP));
    return found?.nombre || null;
  }

  async function completarDatosEmpleado(id) {
    try {
      const token = Cookies.get("token");
      const resp = await axios.get(`/checador/empleados/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const emp = resp?.data || {};
      const nombrePuesto = nombrePuestoPorId(emp.id_puesto) || emp.puesto || "";
      setForm((f) => ({
        ...f,
        puesto: nombrePuesto || f.puesto,
        departamento: emp.departamento || f.departamento,
      }));
    } catch {
      const emp = empleados.find((e) => e.id === String(id));
      const nombrePuesto =
        nombrePuestoPorId(emp?.id_puesto) || emp?.puesto || "";
      setForm((f) => ({
        ...f,
        puesto: nombrePuesto || f.puesto,
        departamento: emp?.departamento || f.departamento,
      }));
    }
  }

  // Rellenar datos al abrir/editar/duplicar
  useEffect(() => {
    if (!open) return;
    setErrors([]);
    // Cerrar sugerencias al abrir
    setOpenEmpSug(false);
    setOpenJefeSug(false);
    if (isEdit) {
      setEmpleadoId(String(editItem?.id_empleado || ""));
      setForm({
        tipo_contrato: editItem?.tipo_contrato || editItem?.tipoContrato || "",
        fecha_inicio: editItem?.fecha_inicio
          ? dayjs(editItem.fecha_inicio).format("YYYY-MM-DD")
          : editItem?.fechaInicio || "",
        fecha_fin: editItem?.fecha_fin
          ? dayjs(editItem.fecha_fin).format("YYYY-MM-DD")
          : editItem?.fechaFin || "",
        salario_base: editItem?.salario_base ?? editItem?.salarioBase ?? "",
        periodicidad_pago:
          editItem?.periodicidad_pago || editItem?.periodicidadPago || "",
        moneda: editItem?.moneda || "MXN",
        tipo_jornada:
          editItem?.tipo_jornada || editItem?.tipoJornada || "diurna",
        horas_semanales:
          editItem?.horas_semanales ?? editItem?.horasSemanales ?? 40,
        hora_entrada: editItem?.hora_entrada || "09:00",
        hora_salida: editItem?.hora_salida || "18:00",
        hora_comida_inicio: editItem?.hora_comida_inicio || "14:00",
        hora_comida_fin: editItem?.hora_comida_fin || "15:00",
        puesto: editItem?.puesto || "",
        departamento: editItem?.departamento || "",
        modalidad_trabajo:
          editItem?.modalidad_trabajo ||
          editItem?.modalidadTrabajo ||
          "presencial",
        dias_vacaciones:
          editItem?.dias_vacaciones ?? editItem?.diasVacaciones ?? 6,
        aguinaldo_dias:
          editItem?.aguinaldo_dias ?? editItem?.aguinaldoDias ?? 15,
        prima_vacacional:
          editItem?.prima_vacacional ??
          editItem?.primaVacacionalPorcentaje ??
          25,
        prestaciones_superiores:
          editItem?.prestaciones_superiores ??
          editItem?.prestacionesSuperiores ??
          "",
        notas: editItem?.notas || "",
        estatus: editItem?.estatus || "activo",
        jefe_inmediato_id: String(editItem?.jefe_inmediato_id || ""),
        lugar_trabajo: editItem?.lugar_trabajo || "",
      });
    } else if (isDuplicate) {
      const c = seedItem;
      setEmpleadoId(String(c?.id_empleado || c?.idEmpleado || ""));
      // fecha inicio = día siguiente de fin, si existe; si no, mañana
      let fechaInicio = dayjs().add(1, "day").format("YYYY-MM-DD");
      if (c?.fecha_fin || c?.fechaFin) {
        const fin = dayjs(
          c.fecha_fin || c.fechaFin,
          ["YYYY-MM-DD", "DD/MM/YYYY"],
          true
        );
        if (fin.isValid()) fechaInicio = fin.add(1, "day").format("YYYY-MM-DD");
      }
      setForm((f) => ({
        ...f,
        tipo_contrato: "",
        fecha_inicio: fechaInicio,
        fecha_fin: "",
        salario_base: c?.salario_base ?? c?.salarioBase ?? "",
        periodicidad_pago: c?.periodicidad_pago || c?.periodicidadPago || "",
        moneda: c?.moneda || "MXN",
        tipo_jornada: c?.tipo_jornada || c?.tipoJornada || "diurna",
        horas_semanales: c?.horas_semanales ?? c?.horasSemanales ?? 40,
        // Parse horario "Entrada: 09:00 | Salida: 18:00 | Comida: 14:00 - 15:00"
        hora_entrada: c?.horario?.match(/(\d{1,2}:\d{2})/g)?.[0] || "09:00",
        hora_salida: c?.horario?.match(/(\d{1,2}:\d{2})/g)?.[1] || "18:00",
        hora_comida_inicio:
          c?.horario?.match(/(\d{1,2}:\d{2})/g)?.[2] || "14:00",
        hora_comida_fin: c?.horario?.match(/(\d{1,2}:\d{2})/g)?.[3] || "15:00",
        puesto: c?.puesto || "",
        departamento: c?.departamento || "",
        modalidad_trabajo:
          c?.modalidad_trabajo || c?.modalidadTrabajo || "presencial",
        dias_vacaciones: c?.dias_vacaciones ?? c?.diasVacaciones ?? 6,
        aguinaldo_dias: c?.aguinaldo_dias ?? c?.aguinaldoDias ?? 15,
        prima_vacacional:
          c?.prima_vacacional ?? c?.primaVacacionalPorcentaje ?? 25,
        prestaciones_superiores:
          c?.prestaciones_superiores ?? c?.prestacionesSuperiores ?? "",
        notas: `RENOVACIÓN del contrato ${
          c?.folio || c?.id
        }\nContrato anterior: ${(c?.fecha_inicio || c?.fechaInicio) ?? ""} - ${
          (c?.fecha_fin || c?.fechaFin) ?? "Indefinido"
        }\n\n${c?.notas || ""}`,
        jefe_inmediato_id: String(c?.jefe_inmediato_id || ""),
        lugar_trabajo: c?.lugar_trabajo || "",
      }));
    } else {
      setEmpleadoId("");
      setForm((f) => ({
        ...f,
        tipo_contrato: "",
        fecha_inicio: "",
        fecha_fin: "",
        salario_base: "",
        periodicidad_pago: "",
        moneda: "MXN",
        tipo_jornada: "diurna",
        horas_semanales: 40,
        hora_entrada: "09:00",
        hora_salida: "18:00",
        hora_comida_inicio: "14:00",
        hora_comida_fin: "15:00",
        puesto: "",
        departamento: "",
        modalidad_trabajo: "presencial",
        dias_vacaciones: 6,
        aguinaldo_dias: 15,
        prima_vacacional: 25,
        prestaciones_superiores: "",
        notas: "",
        estatus: "activo",
        jefe_inmediato_id: "",
        lugar_trabajo: "",
      }));
    }
  }, [open, isEdit, seedItem, isDuplicate, editItem]);

  // Sincronizar textos visibles de empleado/jefe
  useEffect(() => {
    const n = empleados.find((e) => e.id === empleadoId)?.nombre || "";
    setEmpSearch(n);
  }, [empleados, empleadoId, open]);
  useEffect(() => {
    const n =
      empleados.find((e) => e.id === form.jefe_inmediato_id)?.nombre || "";
    setJefeSearch(n);
  }, [empleados, form.jefe_inmediato_id, open]);

  // Autocompletar desde selección empleado
  const empleadoSeleccionado = useMemo(
    () => empleados.find((e) => e.id === empleadoId),
    [empleados, empleadoId]
  );
  useEffect(() => {
    if (empleadoSeleccionado) {
      setForm((f) => ({
        ...f,
        puesto: f.puesto || empleadoSeleccionado.puesto || "",
        departamento: f.departamento || empleadoSeleccionado.departamento || "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoSeleccionado?.id]);

  const requiereFechaFin =
    form.tipo_contrato &&
    !["indefinido", "prestacion_servicios"].includes(form.tipo_contrato);

  async function guardar() {
    const errs = [];
    if (!empleadoId) errs.push("Selecciona un empleado.");
    if (!form.tipo_contrato) errs.push("Selecciona el tipo de contrato.");
    if (!form.fecha_inicio) errs.push("La fecha de inicio es obligatoria.");
    if (requiereFechaFin && !form.fecha_fin)
      errs.push("La fecha de fin es obligatoria para este tipo.");
    if (!form.salario_base || Number(form.salario_base) < 0)
      errs.push("Ingresa un salario base válido.");
    if (!form.periodicidad_pago)
      errs.push("Selecciona la periodicidad de pago.");
    if (!form.moneda) errs.push("Selecciona la moneda.");

    setErrors(errs);
    if (errs.length > 0) {
      enqueueSnackbar("Revisa los campos requeridos.", { variant: "warning" });
      return;
    }

    const payload = {
      id_empleado: Number(empleadoId),
      id_empresa: idEmpresa,
      tipo_contrato: form.tipo_contrato,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      salario_base: Number(form.salario_base),
      periodicidad_pago: form.periodicidad_pago,
      moneda: form.moneda,
      tipo_jornada: form.tipo_jornada,
      horas_semanales: Number(form.horas_semanales),
      horario: `Entrada: ${form.hora_entrada} | Salida: ${form.hora_salida} | Comida: ${form.hora_comida_inicio} - ${form.hora_comida_fin}`,
      puesto: form.puesto || null,
      departamento: form.departamento || null,
      dias_vacaciones: Number(form.dias_vacaciones || 6),
      aguinaldo_dias: Number(form.aguinaldo_dias || 15),
      prima_vacacional: Number(form.prima_vacacional || 25),
      prestaciones_superiores: form.prestaciones_superiores || null,
      lugar_trabajo: form.lugar_trabajo || null,
      modalidad_trabajo: form.modalidad_trabajo,
      elaborado_por_id: dataUser?.id_empleado || null,
      notas: form.notas || null,
      estatus: form.estatus || "activo",
      jefe_inmediato_id: form.jefe_inmediato_id
        ? Number(form.jefe_inmediato_id)
        : null,
      es_renovacion: isDuplicate ? 1 : 0,
      contrato_anterior_id: isDuplicate
        ? Number(seedItem?.id || seedItem?.id_contrato || 0) || null
        : null,
    };

    setLoading(true);
    try {
      if (isEdit && editItem?.id) {
        await contratosApi.actualizar(editItem.id, payload);
        enqueueSnackbar("Contrato actualizado correctamente.", {
          variant: "success",
        });
      } else {
        await contratosApi.crear(payload);
        enqueueSnackbar("Contrato creado correctamente.", {
          variant: "success",
        });
      }
      onSaved?.();
      setOpen(false);
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        "No se pudo guardar el contrato. Verifica el servicio.";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header ADAMIA */}
        <DialogHeader className="p-0">
          <div className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                {isEdit ? (
                  <Pencil className="h-6 w-6 text-white" />
                ) : isDuplicate ? (
                  <Copy className="h-6 w-6 text-white" />
                ) : (
                  <FileText className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold">
                  {isEdit
                    ? "Editar contrato"
                    : isDuplicate
                    ? `Duplicar contrato ${seedItem?.folio || seedItem?.id || ""}`
                    : "Nuevo contrato"}
                </DialogTitle>
                <p className="text-sm text-blue-100">
                  {isEdit
                    ? "Actualiza la información del contrato"
                    : isDuplicate
                    ? "Crea una renovación a partir del contrato anterior"
                    : "Registra un nuevo contrato para un empleado"}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {isDuplicate ? (
            <div className="rounded-md border-l-4 border-yellow-500 bg-yellow-50 p-3 text-sm text-yellow-800">
              <div className="font-semibold mb-1">
                Estás duplicando el contrato {seedItem?.folio}
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Tipo de contrato: debes seleccionarlo nuevamente.</li>
                <li>
                  Fecha de inicio sugerida: día siguiente al fin del anterior.
                </li>
                <li>Fecha de fin: déjala vacía o establece una nueva.</li>
                <li>
                  Se copiaron salario, horarios, prestaciones y modalidad.
                </li>
              </ul>
            </div>
          ) : null}

          {/* Información Básica */}
          <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border border-blue-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#2563EB] p-2 rounded-lg">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div className="font-semibold text-gray-900">
                Información básica
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empleado</Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar empleado..."
                    value={empSearch}
                    onChange={(e) => {
                      setEmpSearch(e.target.value);
                      setOpenEmpSug(true);
                    }}
                    onFocus={() => setOpenEmpSug(true)}
                    onBlur={() => setTimeout(() => setOpenEmpSug(false), 120)}
                  />
                  {openEmpSug ? (
                    <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow max-h-64 overflow-auto">
                      {(empleados || [])
                        .filter((x) =>
                          x.nombre
                            .toLowerCase()
                            .includes(empSearch.trim().toLowerCase())
                        )
                        .slice(0, 50)
                        .map((emp) => (
                          <div
                            key={`emp-sel-${emp.id}`}
                            className="px-3 py-2 cursor-pointer text-sm hover:bg-slate-100"
                            onMouseDown={() => {
                              setEmpleadoId(emp.id);
                              setEmpSearch(emp.nombre);
                              completarDatosEmpleado(emp.id);
                            }}
                          >
                            {emp.nombre}
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Puesto</Label>
                <Input
                  value={form.puesto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, puesto: e.target.value }))
                  }
                  placeholder="Ej: Analista de Datos"
                />
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input
                  value={form.departamento}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, departamento: e.target.value }))
                  }
                  placeholder="Ej: TI"
                />
              </div>
              <div className="space-y-2">
                <Label>Elaborado por</Label>
                <Input value={dataUser?.nombre || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Jefe Inmediato</Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar jefe..."
                    value={jefeSearch}
                    onChange={(e) => {
                      setJefeSearch(e.target.value);
                      setOpenJefeSug(true);
                    }}
                    onFocus={() => setOpenJefeSug(true)}
                    onBlur={() => setTimeout(() => setOpenJefeSug(false), 120)}
                  />
                  {openJefeSug ? (
                    <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow max-h-64 overflow-auto">
                      <div
                        className="px-3 py-2 cursor-pointer text-sm hover:bg-slate-100 font-semibold text-slate-700"
                        onMouseDown={() => {
                          setForm((f) => ({ ...f, jefe_inmediato_id: "" }));
                          setJefeSearch("");
                        }}
                      >
                        Sin jefe directo
                      </div>
                      {(empleados || [])
                        .filter((x) =>
                          x.nombre
                            .toLowerCase()
                            .includes(jefeSearch.trim().toLowerCase())
                        )
                        .slice(0, 50)
                        .map((emp) => (
                          <div
                            key={`jefe-sel-${emp.id}`}
                            className="px-3 py-2 cursor-pointer text-sm hover:bg-slate-100"
                            onMouseDown={() => {
                              setForm((f) => ({
                                ...f,
                                jefe_inmediato_id: emp.id,
                              }));
                              setJefeSearch(emp.nombre);
                            }}
                          >
                            {emp.nombre}
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Tipo y Vigencia */}
          <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50 border border-amber-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-amber-500 p-2 rounded-lg">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="font-semibold text-gray-900">
                Tipo y vigencia
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select
                  value={form.tipo_contrato}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, tipo_contrato: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinido">Indefinido</SelectItem>
                    <SelectItem value="temporal">Temporal</SelectItem>
                    <SelectItem value="obra_determinada">
                      Obra Determinada
                    </SelectItem>
                    <SelectItem value="capacitacion">
                      Capacitación Inicial
                    </SelectItem>
                    <SelectItem value="prueba">Periodo de Prueba</SelectItem>
                    <SelectItem value="prestacion_servicios">
                      Prestación de Servicios
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Inicio</Label>
                <Input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fecha_inicio: e.target.value }))
                  }
                />
              </div>
              {requiereFechaFin ? (
                <div className="space-y-2">
                  <Label>Fecha de Fin</Label>
                  <Input
                    type="date"
                    value={form.fecha_fin}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fecha_fin: e.target.value }))
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Compensación */}
          <div className="bg-gradient-to-br from-green-50 via-white to-green-50 border border-green-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-green-600 p-2 rounded-lg">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="font-semibold text-gray-900">Compensación</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Salario Base</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.salario_base}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, salario_base: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Periodicidad de Pago</Label>
                <Select
                  value={form.periodicidad_pago}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, periodicidad_pago: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quincenal">Quincenal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select
                  value={form.moneda}
                  onValueChange={(v) => setForm((f) => ({ ...f, moneda: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MXN">MXN - $ Peso Mexicano</SelectItem>
                    <SelectItem value="USD">USD - $ Dólar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Jornada */}
          <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50 border border-orange-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-orange-600 p-2 rounded-lg">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="font-semibold text-gray-900">
                Jornada laboral
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Jornada</Label>
                <Select
                  value={form.tipo_jornada}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, tipo_jornada: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diurna">
                      Diurna (6:00 - 20:00)
                    </SelectItem>
                    <SelectItem value="nocturna">
                      Nocturna (20:00 - 6:00)
                    </SelectItem>
                    <SelectItem value="mixta">Mixta</SelectItem>
                    <SelectItem value="reducida">Reducida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horas Semanales</Label>
                <Input
                  type="number"
                  min="1"
                  max="48"
                  step="0.5"
                  value={form.horas_semanales}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, horas_semanales: e.target.value }))
                  }
                />
              </div>
              <div />
              <div className="space-y-2">
                <Label>Entrada</Label>
                <Input
                  type="time"
                  value={form.hora_entrada}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hora_entrada: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Salida</Label>
                <Input
                  type="time"
                  value={form.hora_salida}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hora_salida: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Comida (inicio)</Label>
                <Input
                  type="time"
                  value={form.hora_comida_inicio}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      hora_comida_inicio: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Comida (fin)</Label>
                <Input
                  type="time"
                  value={form.hora_comida_fin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hora_comida_fin: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Prestaciones */}
          {form.tipo_contrato !== "prestacion_servicios" ? (
            <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50 border border-purple-100 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-[#7C3AED] p-2 rounded-lg">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c1.657 0 3-1.343 3-3S13.657 2 12 2 9 3.343 9 5s1.343 3 3 3zm0 0v14m-7-7h14"
                    />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900">Prestaciones</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Días de Vacaciones</Label>
                  <Input
                    type="number"
                    min="6"
                    value={form.dias_vacaciones}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        dias_vacaciones: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Días de Aguinaldo</Label>
                  <Input
                    type="number"
                    min="15"
                    value={form.aguinaldo_dias}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, aguinaldo_dias: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prima Vacacional (%)</Label>
                  <Input
                    type="number"
                    min="25"
                    step="0.01"
                    value={form.prima_vacacional}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        prima_vacacional: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <Label>Prestaciones Superiores</Label>
                  <Textarea
                    placeholder="Ej: Vales de despensa $2,000, Seguro de gastos médicos..."
                    value={form.prestaciones_superiores}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        prestaciones_superiores: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Ubicación y modalidad + Notas */}
          <div className="bg-gradient-to-br from-teal-50 via-white to-teal-50 border border-teal-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-teal-600 p-2 rounded-lg">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="font-semibold text-gray-900">
                Ubicación y modalidad
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modalidad</Label>
                <Select
                  value={form.modalidad_trabajo}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, modalidad_trabajo: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="remoto">Remoto</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lugar de Trabajo</Label>
                <Input
                  value={form.lugar_trabajo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lugar_trabajo: e.target.value }))
                  }
                  placeholder="Ej: CDMX, Sucursal Centro"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Notas</Label>
                <Textarea
                  placeholder="Información adicional o acuerdos especiales…"
                  value={form.notas}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notas: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Errores */}
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
        </div>

        <DialogFooter className="p-6 pt-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="border-gray-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={guardar}
            disabled={loading}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
