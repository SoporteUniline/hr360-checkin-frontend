"use client";
import React from "react";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function ExperienceForm({ form, loading }) {
  const { register, formState } = form;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <FormItem>
          <FormLabel required>Último Puesto:</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("ultimo_puesto", {
                required: "Campo obligatorio",
              })}
            />
          </FormControl>
          <FormMessage>{formState.errors.ultimo_puesto?.message}</FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel required>Empresa Anterior</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("empresa_anterior", {
                required: "Campo obligatorio",
              })}
            />
          </FormControl>
          <FormMessage>
            {formState.errors.empresa_anterior?.message}
          </FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel required>Duración del Puesto:</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("duracion_puesto", {
                required: "Campo obligatorio",
              })}
            />
          </FormControl>
          <FormMessage>{formState.errors.duracion_puesto?.message}</FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel>Actividades Principales:</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("actividades_principales")}
            />
          </FormControl>
          <FormMessage>
            {formState.errors.actividades_principales?.message}
          </FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel required>Último Salario (MXN):</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("ultimo_salario", {
                required: "Campo obligatorio",
              })}
            />
          </FormControl>
          <FormMessage>{formState.errors.ultimo_salario?.message}</FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel required>Motivo de Salida:</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("motivo_salida", {
                required: "Campo obligatorio",
              })}
            />
          </FormControl>
          <FormMessage>{formState.errors.motivo_salida?.message}</FormMessage>
        </FormItem>
      </div>
    </div>
  );
}
