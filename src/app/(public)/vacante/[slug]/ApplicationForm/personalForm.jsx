"use client";
import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function PersonalForm({ form, loading }) {
  const { register, formState } = form;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <FormItem>
          <FormLabel required>Nombre Completo</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("nombre_completo", {
                required: "Campo obligatorio",
              })}
            />
          </FormControl>
          <FormMessage>{formState.errors.nombre_completo?.message}</FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel required>Correo Electrónico:</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              type="email"
              {...register("correo", {
                required: "Campo obligatorio",
              })}
            />
          </FormControl>
          <FormMessage>{formState.errors.correo?.message}</FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel required>Teléfono:</FormLabel>
          <FormControl>
            <Input
              type="tel"
              placeholder="Teléfono a 10 dígitos"
              disabled={loading}
              {...register("telefono", {
                required: "Campo obligatorio",
                pattern: {
                  value: /^\d{10}$/,
                  message: "Teléfono no válido",
                },
              })}
            />
          </FormControl>
          <FormMessage>{formState.errors.telefono?.message}</FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel>Fecha de Nacimiento:</FormLabel>
          <FormControl>
            <Input
              type="date"
              disabled={loading}
              {...register("fecha_nacimiento")}
            />
          </FormControl>
          <FormMessage>
            {formState.errors.fecha_nacimiento?.message}
          </FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel>Edad</FormLabel>
          <FormControl>
            <Input disabled={loading} {...register("edad")} />
          </FormControl>
          <FormMessage>{formState.errors.edad?.message}</FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel required>Sexo:</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("sexo", {
                required: "Campo obligatorio",
              })}
            />
          </FormControl>
          <FormMessage>{formState.errors.sexo?.message}</FormMessage>
        </FormItem>
        <FormField
          control={form.control}
          name="estado_civil"
          rules={{ required: "Selecciona uno" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Estado Civil:</FormLabel>
              <FormControl>
                <Select
                  disabled={loading}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona uno" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Soltero(a)",
                      "Casado(a)",
                      "Divorciado(a)",
                      "Viudo(a)",
                    ].map((value, index) => (
                      <SelectItem key={index} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel required>CURP:</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("curp", {
                required: "Campo obligatorio",
                pattern: {
                  value: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]{2}$/,
                  message: "CURP no válida",
                },
              })}
            />
          </FormControl>
          <FormMessage>{formState.errors.curp?.message}</FormMessage>
        </FormItem>
      </div>
    </div>
  );
}
