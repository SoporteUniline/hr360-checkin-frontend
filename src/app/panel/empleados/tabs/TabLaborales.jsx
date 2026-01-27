import { ComboboxSucursal } from "@/components/ComboboxSucursal";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { ComboboxDepartamento } from "@/components/ComboboxDepartamento";
import { FormLabelWithAsterisk } from "@/components/FormLabelWithAsterisk";
import { Switch } from "@/components/ui/switch";
import axios from "axios";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import ModalArea from "@/components/ModalArea";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "notistack";

export default function TabLaborales({ form, soloLectura, dataUser }) {
  const { enqueueSnackbar } = useSnackbar();
  const [areas, setAreas] = useState([]);
  const [areasAsignadas, setAreasAsignadas] = useState([]);
  const [mostrarModalArea, setMostrarModalArea] = useState(false);
  const [guardandoArea, setGuardandoArea] = useState(false);
  const checarGPS = form.watch("checar_gps");
  const empleadoId = form.watch("id_empleado");

  const crearArea = async (formData) => {
    if (!formData?.nombre_area?.trim()) {
      alert("El nombre del área es requerido");
      return;
    }

    if (!formData.latitud || !formData.longitud) {
      alert("Debes seleccionar una ubicación en el mapa");
      return;
    }

    setGuardandoArea(true);
    try {
      const datos = {
        ...formData,
        id_empresa: dataUser?.id_empresa,
        latitud: Number(formData.latitud),
        longitud: Number(formData.longitud),
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/area_check2`,
        datos
      );

      // 🔁 Actualiza la lista local de áreas
      setAreas((prev) => [...prev, datos]);

      setMostrarModalArea(false);
    } catch (error) {
      console.log("Error creando área:", error);

      enqueueSnackbar(error?.response?.data?.error, {
        variant: "error", // 🔴 color rojo de error
      });
    } finally {
      setGuardandoArea(false);
    }
  };

  const toggleArea = (id_area) => {
    setAreasAsignadas((prev) =>
      prev.includes(id_area)
        ? prev.filter((id) => id !== id_area)
        : [...prev, id_area]
    );
  };

  useEffect(() => {
    if (!checarGPS) return;

    const fetchAreas = async () => {
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/area_check2`,
          {
            params: {
              id_empresa: dataUser?.id_empresa,
              limit: 9999,
              page: 1,
            },
          }
        );
        setAreas(data.data);
      } catch (error) {
        console.error("Error al obtener áreas:", error);
      }
    };

    fetchAreas();
  }, [checarGPS, dataUser?.id_empresa]);

  useEffect(() => {
    if (!checarGPS || !empleadoId) return;

    const fetchAsignadas = async () => {
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/area_check/${empleadoId}/areas`
        );
        setAreasAsignadas(data.map((a) => a.id_area));
      } catch (error) {
        console.error("Error al obtener áreas del empleado", error);
      }
    };

    fetchAsignadas();
  }, [checarGPS, empleadoId]);

  useEffect(() => {
    form.setValue("areasAsignadas", areasAsignadas);
  }, [areasAsignadas]);

  const { data: empleados } = useSWR(
    `/checador/empleados?empresa=${dataUser?.id_empresa}&page=1&limit=500`,
    fetcherWithToken,
    swr_config
  );

  const responsables = [
    {
      name: "id_jefe_inmediato",
      label: "Jefe inmediato",
    },
    {
      name: "id_autoriza_vacaciones",
      label: "Responsable de vacaciones",
    },
    {
      name: "id_autoriza_permisos",
      label: "Responsable de permisos",
    },
  ];
  return (
    <section className="space-y-6">
      {/* Información laboral */}
      <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50 border-2 border-emerald-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-lg shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            Información laboral
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          name="nombre_empresa"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Empresa</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={dataUser?.nombre_empresa || ""}
                  disabled
                  readOnly
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name="sucursal"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabelWithAsterisk required={true}>
                Unidad de negocio o sucursal
              </FormLabelWithAsterisk>
              <ComboboxSucursal
                value={field.value}
                onChange={(val) => field.onChange(val)}
                disabled={soloLectura}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="departamento"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Departamento</FormLabel>
              <ComboboxDepartamento
                value={field.value}
                onChange={(val) => field.onChange(val)}
                disabled={soloLectura}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {[
          {
            name: "fecha_ingreso",
            label: "Fecha de ingreso",
            type: "date",
            required: false,
          },
        ].map(({ name, label, type = "text", required = false }) => (
          <FormField
            key={name}
            name={name}
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabelWithAsterisk required={required}>
                  {label}
                </FormLabelWithAsterisk>
                <FormControl>
                  <Input type={type} disabled={soloLectura} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <div className="col-span-1 sm:col-span-2">
          <FormField
            name="metodo_chequeo"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1 rounded-lg border p-4">
                <FormLabel className="text-base">Método de chequeo</FormLabel>
                <div className="text-sm text-muted-foreground mb-2">
                  Selecciona cómo el empleado registrará su entrada/salida
                </div>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={soloLectura}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder="Selecciona un método"
                        className="text-xs"
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="codigo">Código</SelectItem>
                    <SelectItem value="facial">Facial</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="col-span-1 sm:col-span-2">
          <FormField
            control={form.control}
            name="cierre_turno"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1 rounded-lg border p-4">
                <FormLabel className="text-base">Cierre de turno</FormLabel>

                <div className="text-sm text-muted-foreground mb-2">
                  Define si el sistema cierra el turno automáticamente o si el
                  empleado debe hacerlo manualmente
                </div>

                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={soloLectura}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un modo" />
                    </SelectTrigger>
                  </FormControl>

                  <SelectContent>
                    <SelectItem value="Automático">Automático</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                  </SelectContent>
                </Select>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="col-span-1 sm:col-span-2">
          <FormField
            name="new_pass"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabelWithAsterisk required={true}>
                  Contraseña
                </FormLabelWithAsterisk>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Nueva contraseña"
                    {...field}
                    disabled={soloLectura}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  Deja vacío si no deseas cambiar la contraseña.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {[{ name: "nip", label: "Código de empleado", required: false }].map(
          ({ name, label, type = "text", required = false }) => (
            <div key={name}>
              <FormField
                name={name}
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabelWithAsterisk required={required}>
                      {label}
                    </FormLabelWithAsterisk>
                    <FormControl>
                      <Input type={type} disabled={soloLectura} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />{" "}
            </div>
          )
        )}

        {responsables.map(({ name, label }) => (
          <FormField
            key={name}
            name={name}
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) => field.onChange(Number(value))}
                  disabled={soloLectura}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder="Selecciona un empleado"
                        className="text-xs"
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {empleados?.data?.map((emp) => (
                      <SelectItem
                        key={emp.id_empleado}
                        value={String(emp.id_empleado)}
                      >
                        {emp.nombre} {emp.apellido_paterno}{" "}
                        {emp.apellido_materno} ({emp.puesto})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <FormField
          name="checar_gps"
          control={form.control}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Checar GPS</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Requerir ubicación GPS al checar entrada/salida
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={soloLectura}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name="usar_reloj_checador"
          control={form.control}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Usar reloj checador</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Permitir que el empleado use el sistema de checador
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={soloLectura}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("checar_gps") && (
          <Button
            size="sm"
            onClick={() => setMostrarModalArea(true)}
            type="button"
            className="col-span-1 sm:col-span-2"
          >
            + Crear nueva área
          </Button>
        )}

        {/* 🔹 Áreas permitidas (solo si usar_reloj_checador = true) */}
        <div className="col-span-1 sm:col-span-2">
          {form.watch("checar_gps") && (
            <div className="border rounded-xl p-4 bg-slate-50 shadow-sm">
              <FormLabel className="text-base font-semibold block mb-3">
                Áreas donde el empleado puede checar
              </FormLabel>

              {areas.length === 0 ? (
                <p className="text-gray-500 italic text-sm">
                  ⚠️ No hay áreas registradas todavía. Crea una en el sistema.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {areas.map((area, index) => {
                    const asignada = areasAsignadas.includes(area.id_area);
                    return (
                      <div
                        key={area.id_area ?? `area-temp-${index}`}
                        className={`border rounded-lg p-3 flex items-center justify-between ${
                          asignada
                            ? "bg-blue-50 border-blue-300"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div>
                          <p className="font-medium">{area.nombre_area}</p>
                          <p className="text-xs text-gray-500">
                            {area.latitud}, {area.longitud}
                          </p>
                        </div>
                        {!soloLectura && (
                          <Checkbox
                            checked={asignada}
                            onCheckedChange={() => toggleArea(area.id_area)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ModalArea
        isOpen={mostrarModalArea}
        onClose={() => setMostrarModalArea(false)}
        onSave={crearArea}
        initialData={null}
        loading={guardandoArea}
      />
      </div>
    </section>
  );
}
