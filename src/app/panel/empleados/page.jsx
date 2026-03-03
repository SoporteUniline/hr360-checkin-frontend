"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import EmpleadosDataContainer from "./EmpleadosDataContainer";
import FormularioEmpleado from "./FormularioEmpleado";
import { Button } from "@/components/ui/button";
import { Users, UsersRound, UserPlus, Building2 } from "lucide-react";
import ModalCapacidadAgotada from "@/components/ModalCapacidadAgotada";
import AccesosRapidos from "@/components/AccesosRapidos";
import axios from "@/lib/axios";

// Componente de tarjeta de estadística estilo ADAMIA
const StatCard = ({ title, count, icon: Icon, trend }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{count || 0}</p>
          {trend && (
            <p className="text-xs text-green-600 font-medium mt-1">{trend}</p>
          )}
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <Icon className="w-6 h-6 text-[#2563EB]" />
        </div>
      </div>
    </div>
  );
};

export default function RegistroEmpleados() {
  const [modalCapacidadAbierto, setModalCapacidadAbierto] = useState(false);
  const [mensajeCapacidad, setMensajeCapacidad] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [modoFormulario, setModoFormulario] = useState(false);
  const [editar, setEditar] = useState(false);
  const [soloLectura, setSoloLectura] = useState(false);
  const [values, setValues] = useState(null);

  const { dataUser } = useAuth();
  const [empresaActiva, setEmpresaActiva] = useState("all");

  const idEmpresa = empresaActiva;

  // console.log(dataUser);

  const abrirFormulario = async (
    empleado = null,
    modoEditar = false,
    lectura = false,
  ) => {
    if (!empleado) {
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados-capacidad/check-capacidad?empresa_id=${idEmpresa}`,
        );

        // console.log(data);

        if (!data.permitido) {
          setMensajeCapacidad(data.message);
          setModalCapacidadAbierto(true);
          return;
        }
      } catch (error) {
        console.error("Error al validar capacidad:", error);
      }
    }

    if (empleado) {
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/${empleado.id_empleado}`,
        );
        empleado = data;
      } catch (error) {
        console.error("Error al obtener empleado:", error);
        return;
      }
    }

    console.log(empleado);

    setValues(empleado);
    setEditar(modoEditar);
    setModoFormulario(true);
    setSoloLectura(lectura);
  };

  const resetFilters = () => {
    setEmpresaActiva("all");
    setPage(1);
  };

  const { ui, data, mutate } = EmpleadosDataContainer({
    idEmpresa,
    page,
    limit,
    filtroNombre: "",
    departamento: "",
    estado: "",
    fechaDesde: "",
    setPage,
    abrirFormulario,
    resetFilters,
  });

  return (
    <>
      <div className="min-h-screen bg-[#F9FAFB] p-6">
        {modoFormulario ? (
          <FormularioEmpleado
            key={`formulario-${values?.id_empleado || "nuevo"}`}
            editar={editar}
            values={values}
            page={page}
            limit={limit}
            setModoFormulario={setModoFormulario}
            modoFormulario={modoFormulario}
            soloLectura={soloLectura}
            setEditar={setEditar}
            setSoloLectura={setSoloLectura}
            mutate={mutate}
          />
        ) : (
          <>
            <div className="flex justify-end mb-6">
              <Button
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
                onClick={() => abrirFormulario(null, false, false)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Nuevo empleado
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total empleados"
                count={data?.estadisticas?.total_empleados || 0}
                icon={Users}
              />
              <StatCard
                title="Activos"
                count={data?.estadisticas?.empleados_activos || 0}
                icon={UsersRound}
              />
              <StatCard
                title="Nuevos este mes"
                count={data?.estadisticas?.empleados_nuevos_mes || 0}
                icon={UserPlus}
              />
              <StatCard
                title="Departamentos"
                count={data?.estadisticas?.total_departamentos || 0}
                icon={Building2}
              />
            </div>
            {ui}

            {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
            <AccesosRapidos />
          </>
        )}
      </div>
      <ModalCapacidadAgotada
        open={modalCapacidadAbierto}
        onClose={() => setModalCapacidadAbierto(false)}
        mensaje={mensajeCapacidad}
      />
    </>
  );
}
