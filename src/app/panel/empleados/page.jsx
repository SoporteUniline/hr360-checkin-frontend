"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import EmpleadosFilters from "./EmpleadosFilters";
import EmpleadosDataContainer from "./EmpleadosDataContainer";
import FormularioEmpleado from "./FormularioEmpleado";
import { StatCard } from "@/components/Cards";
import { Button } from "@/components/ui/button";
import axios from "axios";
import ModalCapacidadAgotada from "@/components/ModalCapacidadAgotada";

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
    lectura = false
  ) => {
    if (!empleado) {
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados-capacidad/check-capacidad?empresa_id=${idEmpresa}`
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
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/${empleado.id_empleado}`
        );
        empleado = data; // ahora incluye horarios y cuenta_bancaria
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
    abrirFormulario, // 🔑 Pasamos la función a DataContainer
  });

  return (
    <>
      <div>
        {modoFormulario ? (
          // 👉 Formulario
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
            mutate={mutate} // 🔑 refresca la tabla al guardar
          />
        ) : (
          // 👉 Vista general
          <>
            <div className="flex gap-2 mb-5 justify-end">
              <Button
                className="w-full sm:w-fit"
                onClick={() => abrirFormulario(null, false, false)}
              >
                <div>+</div>
                <div>Nuevo empleado</div>
              </Button>
            </div>
            {/* Estadísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total empleados"
                count={data?.estadisticas?.total_empleados || 0}
              />
              <StatCard
                title="Activos"
                count={data?.estadisticas?.empleados_activos || 0}
              />
              <StatCard
                title="Nuevos este mes"
                count={data?.estadisticas?.empleados_nuevos_mes || 0}
              />
              <StatCard
                title="Departamentos"
                count={data?.estadisticas?.total_departamentos || 0}
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
          </>
        )}
      </div>
      <ModalCapacidadAgotada
        open={modalCapacidadAbierto}
        onClose={() => setModalCapacidadAbierto(false)}
        mensaje={mensajeCapacidad}
      />
      ;
    </>
  );
}
