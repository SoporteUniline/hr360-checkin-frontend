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

export default function AcademyForm({ form, loading }) {
  const { register, formState } = form;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <FormField
          control={form.control}
          name="nivel_estudios"
          rules={{ required: "Selecciona un nivel" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Nivel de Estudios</FormLabel>
              <FormControl>
                <Select
                  disabled={loading}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Secundaria",
                      "Preparatoria",
                      "Licenciatura",
                      "Maestría",
                      "Doctorado",
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
          <FormLabel required>Institución Educativa:</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("institucion", {
                required: "Campo obligatorio",
              })}
            />
          </FormControl>
          <FormMessage>{formState.errors.institucion?.message}</FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel required>Carrera:</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("carrera", {
                required: "Campo obligatorio",
              })}
            />
          </FormControl>
          <FormMessage>{formState.errors.carrera?.message}</FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel>Año de Término:</FormLabel>
          <FormControl>
            <Input disabled={loading} {...register("anio_termino")} />
          </FormControl>
          <FormMessage>{formState.errors.anio_termino?.message}</FormMessage>
        </FormItem>
      </div>
    </div>
  );
}
