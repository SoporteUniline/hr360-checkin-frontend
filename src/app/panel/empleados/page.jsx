"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import EmpleadosFilters from "./EmpleadosFilters";
import EmpleadosDataContainer from "./EmpleadosDataContainer";
import FormularioEmpleado from "./FormularioEmpleado";
import { Button } from "@/components/ui/button";
import { Users, UsersRound, UserPlus, Building2 } from "lucide-react";
import axios from "axios";
import ModalCapacidadAgotada from "@/components/ModalCapacidadAgotada";
import AccesosRapidos from "@/components/AccesosRapidos";

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

  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const filtroNombre = useDebounce(filtroEmpleado, 500);
  const [departamento, setDepartamento] = useState("");
  const [estado, setEstado] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");

  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

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

        console.log(data);

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

    setValues(empleado);
    setEditar(modoEditar);
    setModoFormulario(true);
    setSoloLectura(lectura);
  };

  const { ui, data, mutate } = EmpleadosDataContainer({
    idEmpresa,
    page,
    limit,
    filtroNombre,
    departamento,
    estado,
    fechaDesde,
    setPage,
    abrirFormulario,
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
            {/* Header del módulo - Estilo ADAMIA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Users className="w-7 h-7 text-[#2563EB]" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Empleados
                  </h1>
                  <p className="text-sm text-gray-600">
                    Gestiona la información de tu equipo de trabajo
                  </p>
                </div>
              </div>
              <Button
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
                onClick={() => abrirFormulario(null, false, false)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Nuevo empleado
              </Button>
            </div>

            {/* Estadísticas - Estilo ADAMIA */}
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

            {/* Filtros */}
            <EmpleadosFilters
              filtroEmpleado={filtroEmpleado}
              setFiltroEmpleado={setFiltroEmpleado}
              departamento={departamento}
              setDepartamento={setDepartamento}
              estado={estado}
              setEstado={setEstado}
              setPage={setPage}
              fechaDesde={fechaDesde}
              setFechaDesde={setFechaDesde}
            />

            {/* Tabla de empleados */}
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
