"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useSWRConfig } from "swr";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/react";
import { fetcherWithToken } from "@/lib/fetcher";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSnackbar } from "notistack"; // Importa useSnackbar

export default function FormularioEditarAsistencia({
  registro,
  setRegistroSeleccionado,
  modoFormulario,
  setModoFormulario,
  empresaId,
  onGuardado,
  onCancel,
}) {
  const [formData, setFormData] = useState({ ...registro });
  const [isSaving, setIsSaving] = useState(false);
  const { mutate } = useSWRConfig();
  const { enqueueSnackbar } = useSnackbar();

  const { data: empleados } = useSWR(
    empresaId ? `/checador/empleados?empresa=${empresaId}` : null,
    fetcherWithToken
  );
  const { data: tiposPermiso } = useSWR(
    "/checador/tiposPermiso",
    fetcherWithToken
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const fieldsToRemove = [
      "apellido_materno",
      "apellido_paterno",
      "created_at",
      "foto_perfil",
      "nombre",
      "tipo_registro_clave",
      "tipo_registro_nombre",
      "tipo_registro",
      "updated_at",
    ];

    const dataToSend = { ...formData };
    fieldsToRemove.forEach((field) => {
      delete dataToSend[field];
    });

    if (dataToSend.id_tipo_permiso) {
      dataToSend.id_tipo_permiso = Number(dataToSend.id_tipo_permiso);
    }

    if (dataToSend.autorizado_por) {
      dataToSend.autorizado_por = Number(dataToSend.autorizado_por);
    }
    if (dataToSend.extras_autorizadas_por) {
      dataToSend.extras_autorizadas_por = Number(
        dataToSend.extras_autorizadas_por
      );
    }
    if (dataToSend.hrs_comida) {
      dataToSend.hrs_comida = parseFloat(dataToSend.hrs_comida);
    }
    if (dataToSend.porcentaje_dia_festivo) {
      dataToSend.porcentaje_dia_festivo = parseFloat(
        dataToSend.porcentaje_dia_festivo
      );
    }
    if (dataToSend.prima_dominical) {
      dataToSend.prima_dominical = parseFloat(dataToSend.prima_dominical);
    }

    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/asistencias/${dataToSend.id}`,
        dataToSend,
        {
          headers: {
            "Content-Type": "application/json",
            // "Authorization": `Bearer ${tuTokenDeAuth}`,
          },
        }
      );

      // Replaced alert by enqueueSnackbar
      enqueueSnackbar("Asistencia actualizada correctamente.", {
        variant: "success",
      });

      mutate(
        `/checador/asistencias?empresa=${empresaId}&fecha=${formData.fecha}`
      );

      if (onGuardado) {
        onGuardado();
      }

      setRegistroSeleccionado(null);
      setModoFormulario(false);
    } catch (error) {
      console.error("❌ Error al actualizar asistencia:", error);
      // Replaced alert by enqueueSnackbar
      enqueueSnackbar(
        `Error al actualizar asistencia: ${
          error.response?.data?.message || error.message
        }`,
        { variant: "error" }
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="flex items-center gap-2 text-blue-600 cursor-pointer"
        onClick={() => {
          setRegistroSeleccionado(null);
          setModoFormulario(false);
        }}
      >
        <Icon icon="material-symbols:arrow-back" width={24} height={24} />
        <span className="text-sm sm:text-base">Regresar a la tabla</span>
      </div>

      <div className="flex flex-col items-center gap-2 p-4 text-center">
        {/* FOTO DE PERFIL */}
        {formData.foto_perfil ? (
          <img
            src={formData.foto_perfil}
            alt="Foto de perfil"
            className="w-24 h-24 rounded-full object-cover border-2 border-black"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 border-2 border-gray-400">
            <Icon icon="mdi:account-circle-outline" width={64} height={64} />
          </div>
        )}

        {/* NOMBRE COMPLETO */}
        <p className="text-lg font-semibold mt-2">
          {`${formData.nombre || ""} ${formData.apellido_paterno || ""} ${
            formData.apellido_materno || ""
          }`}
        </p>

        {/* ENTRADA Y SALIDA */}
        <div className="text-sm text-gray-600">
          <p>
            Entrada:{" "}
            {formData.entrada
              ? new Date(formData.entrada).toLocaleString("es-MX", {
                  dateStyle: "long",
                  timeStyle: "short",
                })
              : "Sin registrar"}
          </p>
          <p>
            Salida:{" "}
            {formData.salida
              ? new Date(formData.salida).toLocaleString("es-MX", {
                  dateStyle: "long",
                  timeStyle: "short",
                })
              : "Sin registrar"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label className="mb-2">Autorizado por</Label>
              <Select
                value={
                  formData.autorizado_por ? String(formData.autorizado_por) : ""
                }
                onValueChange={(val) =>
                  setFormData({ ...formData, autorizado_por: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado">
                    {formData.autorizado_por && empleados?.data
                      ? (() => {
                          const selectedEmp = empleados.data.find(
                            (emp) =>
                              String(emp.id_empleado) ===
                              String(formData.autorizado_por)
                          );
                          return selectedEmp
                            ? `${selectedEmp.nombre} ${selectedEmp.apellido_paterno}`
                            : "Selecciona un empleado";
                        })()
                      : "Selecciona un empleado"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {empleados?.data?.map((emp) => (
                    <SelectItem
                      key={emp.id_empleado}
                      value={emp.id_empleado.toString()}
                    >
                      {emp.nombre} {emp.apellido_paterno}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 md:col-span-2">
              <div>
                <Label className="mb-2 block">Goce de Sueldo</Label>
                <ToggleGroup
                  type="single"
                  value={formData.goce_sueldo ? "1" : "0"}
                  onValueChange={(val) =>
                    setFormData({ ...formData, goce_sueldo: val === "1" })
                  }
                >
                  <ToggleGroupItem value="0" aria-label="Sin goce">
                    ❌ NO
                  </ToggleGroupItem>
                  <ToggleGroupItem value="1" aria-label="Con goce">
                    ✅ SÍ
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div>
                <Label className="mb-2 block">¿Asistencia?</Label>
                <ToggleGroup
                  type="single"
                  value={formData.asistencia ? "1" : "0"}
                  onValueChange={(val) =>
                    setFormData({ ...formData, asistencia: val === "1" })
                  }
                >
                  <ToggleGroupItem value="0" aria-label="No asistencia">
                    ❌ NO
                  </ToggleGroupItem>
                  <ToggleGroupItem value="1" aria-label="Sí asistencia">
                    ✅ SÍ
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <Label className="mb-2 block">¿Corrección?</Label>
                <ToggleGroup
                  type="single"
                  value={formData.correccion ? "1" : "0"}
                  onValueChange={(val) =>
                    setFormData({ ...formData, correccion: val === "1" })
                  }
                >
                  <ToggleGroupItem value="0" aria-label="No correción">
                    ❌ NO
                  </ToggleGroupItem>
                  <ToggleGroupItem value="1" aria-label="Sí corrección">
                    ✅ SÍ
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <Label className="mb-2 block">¿Horas extras?</Label>
                <ToggleGroup
                  type="single"
                  value={formData.hrs_extra ? "1" : "0"}
                  onValueChange={(val) =>
                    setFormData({ ...formData, hrs_extra: val === "1" })
                  }
                >
                  <ToggleGroupItem value="0" aria-label="No horas extra">
                    ❌ NO
                  </ToggleGroupItem>
                  <ToggleGroupItem value="1" aria-label="Sí horas extra">
                    ✅ SÍ
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            <div>
              <Label className="mb-2">Entrada corregida</Label>
              <Input
                type="time"
                name="entrada"
                value={formData.entrada?.slice(11, 16) || ""}
                onChange={(e) => {
                  const hora = e.target.value;
                  // Si la hora está vacía, guarda null. De lo contrario, formatea.
                  const nuevaEntrada = hora
                    ? `${formData.fecha} ${hora}:00`
                    : null;
                  setFormData({ ...formData, entrada: nuevaEntrada });
                }}
                disabled={!formData.correccion}
              />
            </div>

            <div>
              <Label className="mb-2">Salida corregida</Label>
              <Input
                type="time"
                name="salida"
                value={formData.salida?.slice(11, 16) || ""}
                onChange={(e) => {
                  const hora = e.target.value;
                  // Si la hora está vacía, guarda null. De lo contrario, formatea.
                  const nuevaSalida = hora
                    ? `${formData.fecha} ${hora}:00`
                    : null;
                  setFormData({ ...formData, salida: nuevaSalida });
                }}
                disabled={!formData.correccion}
              />
            </div>

            <div>
              <Label className="mb-2">Horas de comida</Label>
              <Input
                disabled={!formData.correccion}
                name="hrs_comida"
                type="number"
                step="0.1"
                min="0"
                value={formData.hrs_comida || 0}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label className="mb-2">Tipo de registro</Label>
              <Select
                disabled={!formData.correccion}
                value={
                  formData.id_tipo_permiso
                    ? String(formData.id_tipo_permiso)
                    : ""
                }
                onValueChange={(val) => {
                  const tipoSeleccionado = tiposPermiso?.data?.find(
                    (tipo) => String(tipo.id) === val
                  );

                  setFormData((prev) => ({
                    ...prev,
                    id_tipo_permiso: tipoSeleccionado
                      ? tipoSeleccionado.id
                      : null,
                    // Si 'tipo_registro' es solo para la UI y no para el backend,
                    // puedes eliminar esta línea si ya no la necesitas.
                    // tipo_registro: tipoSeleccionado ? tipoSeleccionado.clave : "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo">
                    {(() => {
                      const currentIdTipoPermiso = formData.id_tipo_permiso;
                      const allTiposPermiso = tiposPermiso?.data;

                      if (currentIdTipoPermiso && allTiposPermiso) {
                        const foundTipo = allTiposPermiso.find(
                          (tipo) =>
                            String(tipo.id) === String(currentIdTipoPermiso)
                        );
                        return foundTipo?.nombre || "Selecciona tipo";
                      }
                      return "Selecciona tipo";
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {tiposPermiso?.data?.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 md:col-span-2">
              <div>
                <Label className="mb-2 block">¿Es domingo?</Label>
                <ToggleGroup
                  type="single"
                  value={formData.es_domingo ? "1" : "0"}
                  onValueChange={(val) =>
                    setFormData({ ...formData, es_domingo: val === "1" })
                  }
                >
                  <ToggleGroupItem value="0" aria-label="Sí es domingo">
                    ❌ NO
                  </ToggleGroupItem>
                  <ToggleGroupItem value="1" aria-label="No es domingo">
                    ✅ SÍ
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div>
                <Label className="mb-2 block">¿Es día festivo?</Label>
                <ToggleGroup
                  type="single"
                  value={formData.es_festivo ? "1" : "0"}
                  onValueChange={(val) =>
                    setFormData({ ...formData, es_festivo: val === "1" })
                  }
                >
                  <ToggleGroupItem value="0" aria-label="No es festivo">
                    ❌ NO
                  </ToggleGroupItem>
                  <ToggleGroupItem value="1" aria-label="Sí es festivo">
                    ✅ SÍ
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <Label className="mb-2 block">¿Aplica pago triple?</Label>
                <ToggleGroup
                  type="single"
                  value={formData.pago_triple ? "1" : "0"}
                  onValueChange={(val) =>
                    setFormData({ ...formData, pago_triple: val === "1" })
                  }
                >
                  <ToggleGroupItem value="0" aria-label="No aplica pago triple">
                    ❌ NO
                  </ToggleGroupItem>
                  <ToggleGroupItem value="1" aria-label="Sí aplica pago triple">
                    ✅ SÍ
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {formData.es_domingo ? (
              <div className="md:col-span-2">
                <Label className="mb-2">Prima dominical (%)</Label>
                <Input
                  name="prima_dominical"
                  value={formData.prima_dominical || ""}
                  onChange={handleChange}
                  type="number"
                  step="0.1"
                  min="0"
                />
              </div>
            ) : null}

            {formData.es_festivo ? (
              <div className="md:col-span-2">
                <Label className="mb-2">Día festivo (%)</Label>
                <Input
                  name="porcentaje_dia_festivo"
                  value={formData.porcentaje_dia_festivo || ""}
                  onChange={handleChange}
                  type="number"
                  step="0.1"
                  min="0"
                />
              </div>
            ) : null}

            <div className="md:col-span-2">
              <Label className="mb-2">Notas generales</Label>
              <Textarea
                name="notas"
                value={formData.notas || ""}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        {formData.hrs_extra ? (
          <Card>
            <CardHeader>
              <CardTitle>Horas extras</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2">Autorizadas por</Label>
                <Select
                  value={
                    formData.extras_autorizadas_por
                      ? String(formData.extras_autorizadas_por)
                      : ""
                  }
                  onValueChange={(val) =>
                    setFormData({ ...formData, extras_autorizadas_por: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un empleado">
                      {formData.extras_autorizadas_por && empleados?.data
                        ? (() => {
                            const selectedEmp = empleados.data.find(
                              (emp) =>
                                String(emp.id_empleado) ===
                                String(formData.extras_autorizadas_por)
                            );
                            return selectedEmp
                              ? `${selectedEmp.nombre} ${selectedEmp.apellido_paterno}`
                              : "Selecciona un empleado";
                          })()
                        : "Selecciona un empleado"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {empleados?.data?.map((emp) => (
                      <SelectItem
                        key={emp.id_empleado}
                        value={emp.id_empleado.toString()}
                      >
                        {emp.nombre} {emp.apellido_paterno}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2">Forma de pago</Label>
                <Select
                  value={formData.forma_pago_extras || ""}
                  onValueChange={(val) =>
                    setFormData({ ...formData, forma_pago_extras: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona forma" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="Tiempo por tiempo">
                      ⌛ Tiempo por tiempo
                    </SelectItem>
                    <SelectItem value="Descuento sobre nómina">
                      💸 Descuento sobre nómina
                    </SelectItem>
                    <SelectItem value="Pago de horas extras">
                      💰 Pago de horas extras
                    </SelectItem>
                    <SelectItem value="Reposición de tiempo por tiempo">
                      🔁 Reposición de tiempo por tiempo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label className="mb-2">Notas sobre horas extras</Label>
                <Textarea
                  name="notas_hrs_extra"
                  value={formData.notas_hrs_extra || ""}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
