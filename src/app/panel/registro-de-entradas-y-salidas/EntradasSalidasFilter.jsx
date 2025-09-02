"use client";

import * as React from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/Combobox";
import { useAuth } from "@/context/AuthContext";
import { useSnackbar } from "notistack";

export default function EntradasSalidasFilter({
  filtroEmpleado,
  setFiltroEmpleado,
  fecha,
  setFecha,
  departamento,
  setDepartamento,
  estado,
  setEstado,
  setPage,
}) {
  const [departamentos, setDepartamentos] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const fetchDepartamentos = async () => {
    if (!dataUser?.id_empresa) return;

    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos`,
        {
          params: { id_empresa: dataUser.id_empresa },
        }
      );

      setDepartamentos([
        { value: "", label: "Todos los departamentos" },
        ...(res.data.departamentos || []).map((d) => ({
          value: d.nombre,
          label: d.nombre,
        })),
      ]);
    } catch (error) {
      console.error("❌ Error al cargar departamentos:", error);
      enqueueSnackbar("Error al cargar departamentos", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDepartamentos();
  }, [dataUser?.id_empresa]);

  const estadoOptions = [
    { value: "", label: "Todos los estados" },
    { value: "Abierto", label: "Abierto" },
    { value: "Cerrado", label: "Cerrado" },
  ];

  return (
    <div className="mb-3 w-full flex gap-3 justify-between items-center">
      <Input
        placeholder="Buscar empleado por nombre..."
        value={filtroEmpleado}
        onChange={(e) => setFiltroEmpleado(e.target.value)}
        className="w-full max-w-md"
      />

      <Input
        type="date"
        value={fecha}
        onChange={(e) => {
          setFecha(e.target.value);
          setPage(1);
        }}
        className="max-w-xs"
      />

      <div className="w-full max-w-xs">
        <Combobox
          options={departamentos}
          value={departamento}
          onChange={(val) => {
            setDepartamento(val);
            setPage(1);
          }}
          placeholder={loading ? "Cargando..." : "Selecciona un departamento"}
          emptyText="No hay departamentos"
          name="departamento"
        />
      </div>

      <div className="w-full max-w-xs">
        <Combobox
          options={estadoOptions}
          value={estado}
          onChange={(val) => {
            setEstado(val);
            setPage(1);
          }}
          placeholder="Selecciona un estado"
          emptyText="No hay estados"
          name="estado"
        />
      </div>
    </div>
  );
}
