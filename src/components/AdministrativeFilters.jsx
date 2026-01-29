"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "./Combobox";

export const AdministrativeFilters = ({
  onChange,
  empleado,
  setEmpleado,
  folio,
  setFolio,
  estatus,
  setEstatus,
  empleados,
}) => {
  const empleadosUnicos =
    empleados?.data?.map((e) => ({
      value: e.id_empleado,
      label: `${e.nombre} ${e.apellido_paterno} ${e.apellido_materno}`,
    })) ?? [];

  const updateFilters = (newValues) => {
    const updated = {
      empleado,
      folio,
      estatus,
      ...newValues,
    };
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Empleado</Label>
          <Combobox
            options={empleadosUnicos}
            value={empleado}
            onChange={(value) => {
              setEmpleado(value);
              updateFilters({ empleado: value });
            }}
            placeholder="Buscar empleado..."
            emptyText="No se encontró empleado"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Folio</Label>
          <Input
            placeholder="Buscar folio..."
            value={folio}
            onChange={(e) => {
              const value = e.target.value;
              setFolio(value);
              updateFilters({ folio: value });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Estado</Label>
          <Select
            value={estatus === "" ? "__all__" : estatus}
            onValueChange={(value) => {
              const next = value === "__all__" ? "" : value;
              setEstatus(next);
              updateFilters({ estatus: next });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="elaborada">Elaborada</SelectItem>
              <SelectItem value="notificada">Notificada</SelectItem>
              <SelectItem value="cerrada">Cerrada</SelectItem>
              <SelectItem value="anulada">Anulada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default AdministrativeFilters;
