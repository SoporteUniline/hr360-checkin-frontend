import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function Filters({ setFilter }) {
  const handleChange = (status) => {
    setFilter((st) => ({ ...st, status }));
  };

  const handleSearchChange = (e) => {
    setFilter((st) => ({ ...st, search: e.target.value }));
  };

  return (
    <div className="mb-3 w-100 flex gap-3 flex-1">
      <Input
        className="min-w-[100px] md:w-80"
        placeholder="Buscar por nombre o correo electrónico"
        onChange={handleSearchChange}
      />
      <Select onValueChange={handleChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todos">Todos</SelectItem>
          <SelectItem value="Activo">Activo</SelectItem>
          <SelectItem value="Inactivo">Inactivo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
