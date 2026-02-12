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
import { FormLabelWithAsterisk } from "@/components/FormLabelWithAsterisk";

export default function TabNomina({ form, soloLectura }) {
  return (
    <section className="space-y-6">
      <div className="bg-gradient-to-br from-green-50 via-white to-green-50 border-2 border-green-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-lg shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Datos de nómina</h3>
            <p className="text-sm text-gray-600">Configura la información salarial</p>
          </div>
        </div>

        <div className="space-y-6">
      <FormField
        name="periodo_pago"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabelWithAsterisk required={true}>
              Periodo de pago
            </FormLabelWithAsterisk>
            <Select
              onValueChange={field.onChange}
              value={field.value !== "" ? field.value : "sin-seleccion"}
              disabled={soloLectura}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un periodo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="sin-seleccion">
                  Selecciona un periodo
                </SelectItem>
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
            <FormLabelWithAsterisk required={true}>
              Forma de pago
            </FormLabelWithAsterisk>
            <Select
              onValueChange={field.onChange}
              value={field.value !== "" ? field.value : "sin-seleccion"}
              disabled={soloLectura}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la forma de pago" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="sin-seleccion">
                  Selecciona una forma de pago
                </SelectItem>
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
            <FormLabelWithAsterisk required={true}>
              Forma de cálculo
            </FormLabelWithAsterisk>
            <Select
              onValueChange={field.onChange}
              value={field.value !== "" ? field.value : "sin-seleccion"}
              disabled={soloLectura}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la forma de cálculo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="sin-seleccion">
                  Selecciona una forma de cálculo
                </SelectItem>
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
          name="sueldo"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sueldo ($)</FormLabel>
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
                    if (form.getValues("forma_calculo") === "%") {
                      form.setValue("sueldo", null);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
        </div>
      </div>
    </section>
  );
}
