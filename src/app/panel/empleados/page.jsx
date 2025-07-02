"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";
import { formatearFecha } from "@/lib/utils";
import NuevoEmpleado from "./NuevoEmpleado"; // Modal de creación
import DetalleEmpleado from "./DetalleEmpleado"; // Vista detalle
import TablePagination from "@/components/TablePagination";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import FormularioEmpleado from "./FormularioEmpleado";
import EstadoEmpleadoDialog from "./EstadoEmpleadoDialog";
import { twMerge } from "tailwind-merge";

export default function TablaEmpleados() {
  const [soloLectura, setSoloLectura] = useState(false);
  const [editar, setEditar] = useState(false);
  const [values, setValues] = useState(null);
  const limit = 10;
  const [modoFormulario, setModoFormulario] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const { dataUser } = useAuth();

  const id_empresa = dataUser?.id_empresa;

  const { data, error, isLoading } = useSWR(
    `/checador/empleados?empresa=${id_empresa}&page=${page}&limit=${limit}`,
    fetcherWithToken,
    swr_config
  );

  const handleSearchChange = (e) => {
    setFilter(e.target.value);
  };

  const onPageChange = (value) => {
    setPage(value);
  };

  if (isLoading) return <LoadingTable rows={10} />;
  if (error)
    return (
      <ErrorPage message={error?.message || "Error al cargar empleados"} />
    );

  const empleados = data?.data || [];

  const dataFiltrada = empleados.filter((item) => {
    const nombreCompleto = `${item.nombre} ${item.apellido_paterno} ${
      item.apellido_materno || ""
    }`.toLowerCase();
    return nombreCompleto.includes(filter.toLowerCase());
  });

  return (
    <div>
      {modoFormulario ? (
        <FormularioEmpleado
          key={editar ? values?.id_empleado : "nuevo"}
          editar={editar}
          values={values}
          page={page}
          limit={limit}
          setModoFormulario={setModoFormulario}
          modoFormulario={modoFormulario}
          soloLectura={soloLectura}
          setEditar={setEditar}
          setSoloLectura={setSoloLectura}
        />
      ) : (
        <>
          <div className="mb-3 w-full flex gap-3 justify-between items-center">
            <Input
              className="w-full max-w-md"
              placeholder="Buscar empleado por nombre..."
              onChange={handleSearchChange}
            />
            {/* <NuevoEmpleado
          page={page}
          limit={limit}
          modoFormulario={modoFormulario}
        /> */}
            <Button
              onClick={() => {
                setModoFormulario(true);
                setEditar(false); // 🔑 Muy importante: asegúrate que editar esté en false
                setValues(null); // 🔑 Limpia los valores anteriores
                setSoloLectura(false); // 🔑 Limpia el soloLectura también por si acaso
              }}
            >
              Nuevo empleado
            </Button>
          </div>
          {selected ? (
            <DetalleEmpleado item={selected} setSelected={setSelected} />
          ) : (
            <>
              {dataFiltrada.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No se encontraron empleados.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Fecha de ingreso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataFiltrada.map((item, index) => {
                      const nombreCompleto = `${item.nombre} ${
                        item.apellido_paterno
                      } ${item.apellido_materno || ""}`;
                      return (
                        <TableRow
                          key={index}
                          onClick={() => {
                            if (item) {
                              setValues(item);
                              setEditar(false);
                              setModoFormulario(true);
                              setSoloLectura(true);
                            }
                          }}
                          className={twMerge(
                            "cursor-pointer",
                            item.estado === "Inactivo" &&
                              "bg-gray-100 text-gray-400 line-through"
                          )}
                        >
                          <TableCell>{nombreCompleto}</TableCell>
                          <TableCell>{item.puesto}</TableCell>
                          <TableCell>{item.departamento}</TableCell>
                          <TableCell>
                            {formatearFecha(item.fecha_ingreso)}
                          </TableCell>
                          <TableCell>{item.estado}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <div>
                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setValues(item);
                                    setEditar(true);
                                    setModoFormulario(true);
                                    setSoloLectura(false);
                                    setSelected(null);
                                  }}
                                  className={twMerge(
                                    "decoration-transparent !line-through-0 !no-underline font-semibold",
                                    item.estado === "Inactivo" &&
                                      "text-blue-600 border-blue-600"
                                  )}
                                >
                                  Editar
                                </Button>
                              </div>

                              <div
                                onClick={(e) => e.stopPropagation()} // 👈 Esto evita que se dispare el click de la fila
                              >
                                <EstadoEmpleadoDialog
                                  item={item}
                                  limit={limit}
                                  page={page}
                                  className={
                                    item.estado === "Inactivo"
                                      ? "text-green-600 border-green-600"
                                      : "text-green-600 border-green-600"
                                  }
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </>
          )}

          <TablePagination
            page={page}
            limit={limit}
            total={data?.total || 0}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}
