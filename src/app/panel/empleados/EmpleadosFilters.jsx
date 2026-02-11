"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // 👈 importamos Label
import { Combobox } from "@/components/Combobox";
import { useAuth } from "@/context/AuthContext";
import { useSnackbar } from "notistack";
import { useEffect, useState } from "react";
import axios from "@/lib/axios";

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
  empresaActiva,
  setEmpresaActiva,
}) {
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const fetchDepartamentos = async () => {
    try {
      setLoading(true);

      let empresasEnviar =
        empresaActiva === "all" ? dataUser?.empresas?.join(",") : empresaActiva;

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos`,
        { params: { id_empresa: empresasEnviar } }
      );

      const deps = Array.isArray(res.data.departamentos)
        ? res.data.departamentos
        : [];

      const nombresUnicos = [...new Set(deps.map((d) => d.nombre))];

      setDepartamentos([
        { value: "", label: "Todos los departamentos" },
        ...nombresUnicos.map((nombre) => ({
          value: nombre,
          label: nombre,
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
    if (!dataUser) return;
    fetchDepartamentos();
  }, [empresaActiva, dataUser]);

  useEffect(() => {
    if (!empresaActiva) {
      setEmpresaActiva("all");
    }
  }, []);

  const estadoOptions = [
    { value: "", label: "Todos" },
    { value: "Activo", label: "Activo" },
    { value: "Inactivo", label: "Inactivo" },
  ];

  const empresasOptions = [
    { value: "all", label: "Todas las empresas" },
    ...(dataUser?.empresas_detalle?.map((empresa) => ({
      value: empresa.id_empresa,
      label: empresa.nombre,
    })) || []),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
      {/* Empresa */}
      <div className="flex flex-col gap-2">
        <Label>Empresa</Label>
        <Combobox
          options={empresasOptions}
          value={empresaActiva}
          onChange={(val) => {
            if (val === "all") {
              setEmpresaActiva("all");
            } else {
              setEmpresaActiva(Number(val));
            }
            setPage(1);
          }}
          placeholder="Seleccionar empresa"
          emptyText="Sin empresas"
        />
      </div>

      {/* Buscar empleado */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="buscarEmpleado">Buscar empleado</Label>
        <Input
          id="buscarEmpleado"
          placeholder="Nombre, puesto, email..."
          value={filtroEmpleado}
          onChange={(e) => {
            setFiltroEmpleado(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Departamento */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="departamento">Departamento</Label>
        <Combobox
          options={departamentos}
          value={departamento}
          onChange={(val) => {
            setDepartamento(val);
            setPage(1);
          }}
          placeholder={"Todos los departamentos"}
          emptyText="No hay departamentos"
          name="departamento"
        />
      </div>

      {/* Estado */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="estado">Estado</Label>
        <Combobox
          options={estadoOptions}
          value={estado}
          onChange={(val) => {
            setEstado(val);
            setPage(1);
          }}
          placeholder="Todos los estados"
          emptyText="No hay estados"
          name="estado"
        />
      </div>

      {/* Fecha desde */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="fechaDesde">Desde fecha de ingreso</Label>
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
  );
}
