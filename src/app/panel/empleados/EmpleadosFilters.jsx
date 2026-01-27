"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // 👈 importamos Label
import { Combobox } from "@/components/Combobox";
import { useAuth } from "@/context/AuthContext";
import { useSnackbar } from "notistack";
import { useEffect, useState } from "react";
import axios from "axios";

export default function EmpleadosFilters({
  filtroEmpleado,
  setFiltroEmpleado,
  departamento,
  setDepartamento,
  estado,
  setEstado,
  setPage,
  fechaDesde,
  setFechaDesde,
}) {
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const fetchDepartamentos = async () => {
    if (!dataUser?.id_empresa) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos`,
        { params: { id_empresa: dataUser.id_empresa } }
      );
      setDepartamentos([
        { value: "", label: "Todos los departamentos" },
        ...(res.data.departamentos || []).map((d) => ({
          value: d.nombre,
          label: d.nombre,
        })),
      ]);
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error al cargar departamentos", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartamentos();
  }, [dataUser?.id_empresa]);

  const estadoOptions = [
    { value: "", label: "Todos" },
    { value: "Activo", label: "Activo" },
    { value: "Inactivo", label: "Inactivo" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Buscar empleado */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="buscarEmpleado" className="text-sm font-medium text-gray-700">
            Buscar
          </Label>
          <div className="relative">
            <Input
              id="buscarEmpleado"
              placeholder="Nombre, puesto, email..."
              value={filtroEmpleado}
              onChange={(e) => {
                setFiltroEmpleado(e.target.value);
                setPage(1);
              }}
              className="pl-3"
            />
          </div>
        </div>

        {/* Departamento */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="departamento" className="text-sm font-medium text-gray-700">
            Depto.
          </Label>
          <Combobox
            options={departamentos}
            value={departamento}
            onChange={(val) => {
              setDepartamento(val);
              setPage(1);
            }}
            placeholder="Todos"
            emptyText="No hay departamentos"
            name="departamento"
          />
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="estado" className="text-sm font-medium text-gray-700">
            Estado
          </Label>
          <Combobox
            options={estadoOptions}
            value={estado}
            onChange={(val) => {
              setEstado(val);
              setPage(1);
            }}
            placeholder="Todos"
            emptyText="No hay estados"
            name="estado"
          />
        </div>

        {/* Fecha desde */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="fechaDesde" className="text-sm font-medium text-gray-700">
            Desde
          </Label>
          <Input
            id="fechaDesde"
            type="date"
            value={fechaDesde}
            onChange={(e) => {
              setFechaDesde(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
