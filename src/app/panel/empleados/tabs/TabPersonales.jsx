import { ComboboxEstadoCivil } from "@/components/ComboboxEstadoCivil";
import { FormLabelWithAsterisk } from "@/components/FormLabelWithAsterisk";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function TabPersonales({ form, soloLectura }) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mx-1 my-3">
        {[
          {
            name: "apellido_paterno",
            label: "Apellido Paterno",
            required: true,
          },
          {
            name: "apellido_materno",
            label: "Apellido Materno",
            required: true,
          },
          {
            name: "fecha_nacimiento",
            label: "Fecha de nacimiento",
            type: "date",
            required: false,
          },
          { name: "telefono", label: "Teléfono", required: false },
          { name: "correo", label: "Correo", type: "email", required: false },
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
          name="curp"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CURP</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={soloLectura}
                  maxLength={18}
                  className="uppercase"
                  placeholder="Ej. GOLA850705HDFRRN09"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="rfc"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>RFC</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={soloLectura}
                  maxLength={13}
                  className="uppercase"
                  placeholder="Ej. GOLA8507052A1"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="nss"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>NSS</FormLabel>
              <FormControl>
                <Input {...field} disabled={soloLectura} maxLength={11} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="sexo"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sexo</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value !== "" ? field.value : "sin-seleccion"}
                disabled={soloLectura}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el sexo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sin-seleccion">
                    Selecciona una opción
                  </SelectItem>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Femenino">Femenino</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="estado_civil"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado civil</FormLabel>
              <ComboboxEstadoCivil
                value={field.value !== "" ? field.value : "sin-seleccion"}
                onChange={(val) =>
                  field.onChange(val === "" ? "sin-seleccion" : val)
                }
                disabled={soloLectura}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="direccion"
          control={form.control}
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input {...field} disabled={soloLectura} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
}
