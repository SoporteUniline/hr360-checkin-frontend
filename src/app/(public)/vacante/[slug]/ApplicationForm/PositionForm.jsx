"use client";
import React from "react";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function PositionForm({ form, loading }) {
  const { register, formState } = form;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <FormItem>
          <FormLabel required>Vacante Solicitada:</FormLabel>
          <FormControl>
            <Input
              disabled={loading}
              {...register("vacante_solicitada", {
                required: "Campo obligatorio",
              })}
            />
          </FormControl>
          <FormMessage>
            {formState.errors.vacante_solicitada?.message}
          </FormMessage>
        </FormItem>
        <FormItem>
          <FormLabel required>Fecha Disponible:</FormLabel>
          <FormControl>
            <Input
              type="date"
              disabled={loading}
              {...register("fecha_disponible")}
            />
          </FormControl>
          <FormMessage>
            {formState.errors.fecha_disponible?.message}
          </FormMessage>
        </FormItem>
      </div>
    </div>
  );
}
