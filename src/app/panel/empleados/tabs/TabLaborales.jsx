import { ComboboxSucursal } from "@/components/ComboboxSucursal";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
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

export default function TabLaborales({ form, soloLectura, dataUser }) {
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
    <section className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mx-1 my-3">
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

        <div className="col-span-2">
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

        {[{ name: "nip", label: "Código de empleado", required: false }].map(
          ({ name, label, type = "text", required = false }) => (
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
      </div>
    </section>
  );
}
