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

export default function TabNomina({ form, soloLectura }) {
  return (
    <section className="space-y-6 px-4 py-2">
      <FormField
        name="periodo_pago"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Periodo de pago</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={soloLectura}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un periodo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {[
                  "Diario",
                  "Semanal",
                  "Catorcenal",
                  "Quincenal",
                  "Mensual",
                  "Por hora",
                ].map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="forma_pago"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Forma de pago</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={soloLectura}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la forma de pago" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {["Fijo", "Comisiones", "Fijo + Comisiones"].map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="forma_calculo"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Forma de cálculo</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={soloLectura}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la forma de cálculo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {["$", "%", "Ambos"].map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {["$", "Ambos"].includes(form.watch("forma_calculo")) && (
        <FormField
          name="sueldo_por_hora"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sueldo por hora ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  disabled={soloLectura}
                  {...field}
                  value={field.value ?? ""} // clave para evitar null
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseFloat(value) : null);

                    // Si sólo seleccionó $, limpia porcentaje
                    if (form.getValues("forma_calculo") === "$") {
                      form.setValue("porcentaje", null);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {["%", "Ambos"].includes(form.watch("forma_calculo")) && (
        <FormField
          name="porcentaje"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Porcentaje (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  disabled={soloLectura}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseFloat(value) : null);

                    // Si sólo seleccionó %, limpia sueldo_por_hora
                    if (form.getValues("forma_calculo") === "%") {
                      form.setValue("sueldo_por_hora", null);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </section>
  );
}
