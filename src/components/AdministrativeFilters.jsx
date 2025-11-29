"use client";

import React from "react";
import { Input } from "@/components/ui/input";
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
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
      <Input
        placeholder="Buscar folio..."
        value={folio}
        onChange={(e) => {
          const value = e.target.value;
          setFolio(value);
          updateFilters({ folio: value });
        }}
      />
      <Select
        value={estatus}
        onValueChange={(value) => {
          setEstatus(value);
          updateFilters({ estatus: value });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Estatus" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="elaborada">Elaborada</SelectItem>
          <SelectItem value="notificada">Notificada</SelectItem>
          <SelectItem value="cerrada">Cerrada</SelectItem>
          <SelectItem value="anulada">Anulada</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default AdministrativeFilters;
