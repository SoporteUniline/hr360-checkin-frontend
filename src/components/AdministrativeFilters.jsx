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
import { useAuth } from "@/context/AuthContext";

export const AdministrativeFilters = ({
  empresaSeleccionada,
  setEmpresaSeleccionada,
  onChange,
  empleado,
  setEmpleado,
  folio,
  setFolio,
  estatus,
  setEstatus,
  empleados,
}) => {
  const { dataUser } = useAuth();
  const empleadosFiltrados =
    empleados?.data
      ?.filter((e) => {
        if (empresaSeleccionada === "all") return true;
        return String(e.id_empresa) === String(empresaSeleccionada);
      })
      .map((e) => ({
        value: String(e.id_empleado),
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
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
      <Combobox
        options={[
          { value: "all", label: "Todas las empresas" },
          ...(dataUser?.empresas_detalle || [])
            .filter((e) => e?.id_empresa != null)
            .map((e) => ({
              value: String(e.id_empresa),
              label: e.nombre,
            })),
        ]}
        value={empresaSeleccionada}
        onChange={(value) => {
          setEmpresaSeleccionada(value);

          setEmpleado("");
          setFolio("");
          setEstatus("");

          onChange({
            empleado: "",
            folio: "",
            estatus: "",
          });
        }}
        placeholder="Empresa"
      />

      <Combobox
        options={empleadosFiltrados}
        value={empleado}
        onChange={(value) => {
          setEmpleado(value);
          updateFilters({ empleado: value });
        }}
        placeholder={
          empresaSeleccionada === "all"
            ? "Buscar empleado..."
            : "Buscar empleado de la empresa..."
        }
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
