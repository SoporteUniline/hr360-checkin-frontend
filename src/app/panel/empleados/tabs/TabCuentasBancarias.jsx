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
import { useEffect, useState } from "react";

export default function TabCuentasBancarias({ form, soloLectura }) {
  console.log(form.getValues());
  const [bancoEsOtro, setBancoEsOtro] = useState(false);

  useEffect(() => {
    // Verificar valor inicial al montar el componente
    const valorInicial = form.getValues("banco");
    setBancoEsOtro(valorInicial === "Otro");

    // Escuchar cambios posteriores en el campo 'banco'
    const subscription = form.watch((values) => {
      setBancoEsOtro(values.banco === "Otro");
    });

    return () => subscription.unsubscribe?.();
  }, [form]);

  return (
    <section className="space-y-6 px-4 py-2">
      {/* Tipo de cuenta */}
      <FormField
        name="tipo_cuenta"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de cuenta</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={soloLectura}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Cuenta">Cuenta</SelectItem>
                <SelectItem value="CLABE">CLABE</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Banco */}
      <FormField
        name="banco"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Banco</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={soloLectura}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un banco" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {[
                  "BBVA",
                  "Banorte",
                  "Santander",
                  "HSBC",
                  "Scotiabank",
                  "Citibanamex",
                  "Banco Azteca",
                  "Otro",
                ].map((banco) => (
                  <SelectItem key={banco} value={banco}>
                    {banco}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Campo para escribir otro banco si elige "Otro" */}
      {bancoEsOtro && (
        <FormField
          name="otro_banco"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del banco</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={soloLectura}
                  placeholder="Especifica el banco"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Número de cuenta o CLABE */}
      <FormField
        name="numero_cuenta"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {form.watch("tipo_cuenta") === "CLABE"
                ? "CLABE interbancaria (18 dígitos)"
                : "Número de cuenta"}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                type="text"
                inputMode="numeric"
                maxLength={18}
                placeholder={
                  form.watch("tipo_cuenta") === "CLABE"
                    ? "Ej. 012345678901234567"
                    : "Ej. 1234567890"
                }
                value={field.value ?? ""}
                onChange={field.onChange}
                disabled={soloLectura}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  );
}
