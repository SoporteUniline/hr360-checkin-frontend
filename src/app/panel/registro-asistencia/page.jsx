"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useSWRConfig } from "swr"; // Importa useSWRConfig
import axios from "axios"; // Importa axios
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
import { fetcherWithToken } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import ErrorPage from "@/components/ErrorPage";
import LoadingTable from "@/components/LoadingTable";
import { Button } from "@/components/ui/button";
import TablePagination from "@/components/TablePagination";
import { useSnackbar } from "notistack"; // Importa useSnackbar
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea"; // Para notas

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ControlAsistencia() {
  const [fecha, setFecha] = useState(
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD")
  );
  const [page, setPage] = useState(1);
  const limit = 10;
  const [filtroEmpleado, setFiltroEmpleado] = useState("");

  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar(); // Inicializa useSnackbar
  const { mutate: globalMutate } = useSWRConfig(); // Para refetch global

  // Estado para la fila actualmente en edición
  const [editingRowId, setEditingRowId] = useState(null);
  // Estado para los datos de la fila que se están editando
  const [editingRowData, setEditingRowData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Cargar datos de la tabla
  const { data, error, isLoading, mutate } = useSWR(
    dataUser?.id_empresa
      ? `/checador/asistencias?empresa=${dataUser.id_empresa}&${
          fecha ? `fecha=${fecha}&` : ""
        }page=${page}&limit=${limit}`
      : null,
    fetcherWithToken
  );

  // Cargar empleados y tipos de permiso (para selects en edición)
  const { data: empleados } = useSWR(
    dataUser?.id_empresa
      ? `/checador/empleados?empresa=${dataUser.id_empresa}`
      : null,
    fetcherWithToken
  );
  const { data: tiposPermiso } = useSWR(
    "/checador/tiposPermiso",
    fetcherWithToken
  );

  const registros = Array.isArray(data?.registros) ? data.registros : [];
  const totalPages = data?.totalPages || 1;
  const currentPage = data?.currentPage || 1;

  const filtrados = registros.filter((r) =>
    `${r.nombre} ${r.apellido_paterno} ${r.apellido_materno || ""}`
      .toLowerCase()
      .includes(filtroEmpleado.toLowerCase())
  );

  const onPageChange = (newPage) => {
    setPage(newPage);
  };

  // Función para iniciar la edición de una fila
  const handleEditClick = (registro) => {
    setEditingRowId(registro.id);
    // Clonar el registro para evitar mutaciones directas y trabajar con una copia
    setEditingRowData({ ...registro });
  };

  // Función para cancelar la edición de una fila
  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingRowData({});
  };

  // Función para manejar cambios en los campos de edición de una fila
  const handleFieldChange = (name, value) => {
    setEditingRowData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Función para guardar los cambios de una fila
  const handleSaveClick = async () => {
    setIsSaving(true);

    const dataToSend = { ...editingRowData };

    // Limpiar campos no necesarios para el backend
    const fieldsToRemove = [
      "apellido_materno",
      "apellido_paterno",
      "created_at",
      "foto_perfil",
      "nombre",
      "tipo_registro_clave",
      "tipo_registro_nombre",
      "tipo_registro",
      "updated_at",
      "nombre_autorizador", // Añadir estos si no deben enviarse al backend
      "apellido_paterno_autorizador",
      "apellido_materno_autorizador",
      "nombre_extra_autorizador",
      "apellido_paterno_extra_autorizador",
      "apellido_materno_extra_autorizador",
    ];
    fieldsToRemove.forEach((field) => {
      delete dataToSend[field];
    });

    // Asegurar que los tipos de datos sean correctos para el backend
    if (dataToSend.id_tipo_permiso) {
      dataToSend.id_tipo_permiso = Number(dataToSend.id_tipo_permiso);
    } else {
      dataToSend.id_tipo_permiso = null; // Si no hay selección, enviar null
    }

    if (dataToSend.autorizado_por) {
      dataToSend.autorizado_por = Number(dataToSend.autorizado_por);
    } else {
      dataToSend.autorizado_por = null;
    }

    if (dataToSend.extras_autorizadas_por) {
      dataToSend.extras_autorizadas_por = Number(
        dataToSend.extras_autorizadas_por
      );
    } else {
      dataToSend.extras_autorizadas_por = null;
    }

    if (dataToSend.hrs_comida) {
      dataToSend.hrs_comida = parseFloat(dataToSend.hrs_comida);
    } else {
      dataToSend.hrs_comida = 0; // O null, dependiendo de lo que espere tu backend
    }

    if (dataToSend.porcentaje_dia_festivo) {
      dataToSend.porcentaje_dia_festivo = parseFloat(
        dataToSend.porcentaje_dia_festivo
      );
    } else {
      dataToSend.porcentaje_dia_festivo = 0;
    }

    if (dataToSend.prima_dominical) {
      dataToSend.prima_dominical = parseFloat(dataToSend.prima_dominical);
    } else {
      dataToSend.prima_dominical = 0;
    }

    // Convertir booleanos a 0 o 1
    dataToSend.asistencia = dataToSend.asistencia ? 1 : 0;
    dataToSend.goce_sueldo = dataToSend.goce_sueldo ? 1 : 0;
    dataToSend.pago_triple = dataToSend.pago_triple ? 1 : 0;
    dataToSend.correccion = dataToSend.correccion ? 1 : 0;
    dataToSend.es_domingo = dataToSend.es_domingo ? 1 : 0;
    dataToSend.es_festivo = dataToSend.es_festivo ? 1 : 0;
    dataToSend.hrs_extra = dataToSend.hrs_extra ? 1 : 0;

    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/asistencias/${dataToSend.id}`,
        dataToSend,
        {
          headers: {
            "Content-Type": "application/json",
            // "Authorization": `Bearer ${tuTokenDeAuth}`,
          },
        }
      );

      enqueueSnackbar("Asistencia actualizada correctamente.", {
        variant: "success",
      });
      setEditingRowId(null); // Sale del modo de edición
      setEditingRowData({}); // Limpia los datos de edición
      mutate(); // Revalida los datos de la tabla para mostrar los cambios
    } catch (error) {
      console.error("❌ Error al actualizar asistencia:", error);
      enqueueSnackbar(
        `Error al actualizar asistencia: ${
          error.response?.data?.message || error.message
        }`,
        { variant: "error" }
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingTable rows={10} />;
  if (error) {
    console.error(error);
    return <ErrorPage message="Error al cargar los registros de asistencia" />;
  }

  return (
    <div>
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
      </div>
      {filtrados.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          No hay registros para hoy o búsqueda sin resultados.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Tipo de registro</TableHead>
                {!fecha && <TableHead className="text-center">Fecha</TableHead>}
                <TableHead className="text-center">Entrada</TableHead>
                <TableHead className="text-center">Salida</TableHead>

                <TableHead className="text-center">¿Asistió?</TableHead>
                <TableHead className="text-center">¿Goce de sueldo?</TableHead>
                <TableHead className="text-center">¿Pago triple?</TableHead>
                <TableHead className="text-center">Corrección</TableHead>
                <TableHead className="text-center">Autorizado por</TableHead>
                <TableHead className="text-center">¿Es domingo?</TableHead>
                <TableHead className="text-center">Prima dominical</TableHead>
                <TableHead className="text-center">¿Es festivo?</TableHead>
                <TableHead className="text-center">
                  Porcentaje día festivo
                </TableHead>
                <TableHead className="text-center">
                  ¿Trabajó horas extra?
                </TableHead>
                <TableHead className="text-center">
                  Forma de pago horas extra
                </TableHead>
                <TableHead className="text-center">
                  Horas extras autorizadas por
                </TableHead>
                <TableHead className="text-center">Horas de comida</TableHead>
                <TableHead className="text-center">Notas</TableHead>
                <TableHead className="text-center">Notas horas extra</TableHead>
                <TableHead className="text-center">Estado</TableHead>

                <TableHead className="sticky right-0 bg-background z-10 text-center">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((reg, i) => (
                <TableRow key={reg.id}>
                  {" "}
                  {/* Usa reg.id como key */}
                  {editingRowId === reg.id ? (
                    <>
                      {/* Celdas en modo edición */}
                      <TableCell>{`${reg.nombre} ${reg.apellido_paterno}`}</TableCell>
                      <TableCell>
                        <Select
                          value={
                            editingRowData.id_tipo_permiso
                              ? String(editingRowData.id_tipo_permiso)
                              : ""
                          }
                          onValueChange={(val) =>
                            handleFieldChange("id_tipo_permiso", val)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {tiposPermiso?.data?.map((tipo) => (
                              <SelectItem key={tipo.id} value={String(tipo.id)}>
                                {tipo.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {!fecha && (
                        <TableCell className="text-center">
                          {dayjs(editingRowData.fecha).format("DD-MM-YYYY")}
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Input
                          type="time"
                          value={editingRowData.entrada?.slice(11, 16) || ""}
                          onChange={(e) => {
                            const hora = e.target.value;
                            const nuevaEntrada = hora
                              ? `${editingRowData.fecha.slice(
                                  0,
                                  10
                                )} ${hora}:00`
                              : null;
                            handleFieldChange("entrada", nuevaEntrada);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="time"
                          value={editingRowData.salida?.slice(11, 16) || ""}
                          onChange={(e) => {
                            const hora = e.target.value;
                            const nuevaSalida = hora
                              ? `${editingRowData.fecha.slice(
                                  0,
                                  10
                                )} ${hora}:00`
                              : null;
                            handleFieldChange("salida", nuevaSalida);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <ToggleGroup
                          type="single"
                          value={editingRowData.asistencia ? "1" : "0"}
                          onValueChange={(val) =>
                            handleFieldChange("asistencia", val === "1")
                          }
                        >
                          <ToggleGroupItem value="0">❌</ToggleGroupItem>
                          <ToggleGroupItem value="1">✅</ToggleGroupItem>
                        </ToggleGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <ToggleGroup
                          type="single"
                          value={editingRowData.goce_sueldo ? "1" : "0"}
                          onValueChange={(val) =>
                            handleFieldChange("goce_sueldo", val === "1")
                          }
                        >
                          <ToggleGroupItem value="0">❌</ToggleGroupItem>
                          <ToggleGroupItem value="1">✅</ToggleGroupItem>
                        </ToggleGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <ToggleGroup
                          type="single"
                          value={editingRowData.pago_triple ? "1" : "0"}
                          onValueChange={(val) =>
                            handleFieldChange("pago_triple", val === "1")
                          }
                        >
                          <ToggleGroupItem value="0">❌</ToggleGroupItem>
                          <ToggleGroupItem value="1">✅</ToggleGroupItem>
                        </ToggleGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <ToggleGroup
                          type="single"
                          value={editingRowData.correccion ? "1" : "0"}
                          onValueChange={(val) =>
                            handleFieldChange("correccion", val === "1")
                          }
                        >
                          <ToggleGroupItem value="0">❌</ToggleGroupItem>
                          <ToggleGroupItem value="1">✅</ToggleGroupItem>
                        </ToggleGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={
                            editingRowData.autorizado_por
                              ? String(editingRowData.autorizado_por)
                              : ""
                          }
                          onValueChange={(val) =>
                            handleFieldChange("autorizado_por", val)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Autorizado por" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {empleados?.data?.map((emp) => (
                              <SelectItem
                                key={emp.id_empleado}
                                value={String(emp.id_empleado)}
                              >
                                {emp.nombre} {emp.apellido_paterno}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <ToggleGroup
                          type="single"
                          value={editingRowData.es_domingo ? "1" : "0"}
                          onValueChange={(val) =>
                            handleFieldChange("es_domingo", val === "1")
                          }
                        >
                          <ToggleGroupItem value="0">❌</ToggleGroupItem>
                          <ToggleGroupItem value="1">✅</ToggleGroupItem>
                        </ToggleGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editingRowData.prima_dominical || 0}
                          onChange={(e) =>
                            handleFieldChange("prima_dominical", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <ToggleGroup
                          type="single"
                          value={editingRowData.es_festivo ? "1" : "0"}
                          onValueChange={(val) =>
                            handleFieldChange("es_festivo", val === "1")
                          }
                        >
                          <ToggleGroupItem value="0">❌</ToggleGroupItem>
                          <ToggleGroupItem value="1">✅</ToggleGroupItem>
                        </ToggleGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editingRowData.porcentaje_dia_festivo || 0}
                          onChange={(e) =>
                            handleFieldChange(
                              "porcentaje_dia_festivo",
                              e.target.value
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <ToggleGroup
                          type="single"
                          value={editingRowData.hrs_extra ? "1" : "0"}
                          onValueChange={(val) =>
                            handleFieldChange("hrs_extra", val === "1")
                          }
                        >
                          <ToggleGroupItem value="0">❌</ToggleGroupItem>
                          <ToggleGroupItem value="1">✅</ToggleGroupItem>
                        </ToggleGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={editingRowData.forma_pago_extras || ""}
                          onValueChange={(val) =>
                            handleFieldChange("forma_pago_extras", val)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Forma de pago" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            <SelectItem value="Tiempo por tiempo">
                              ⌛ Tiempo por tiempo
                            </SelectItem>
                            <SelectItem value="Descuento sobre nómina">
                              💸 Descuento sobre nómina
                            </SelectItem>
                            <SelectItem value="Pago de horas extras">
                              💰 Pago de horas extras
                            </SelectItem>
                            <SelectItem value="Reposición de tiempo por tiempo">
                              🔁 Reposición de tiempo por tiempo
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={
                            editingRowData.extras_autorizadas_por
                              ? String(editingRowData.extras_autorizadas_por)
                              : ""
                          }
                          onValueChange={(val) =>
                            handleFieldChange("extras_autorizadas_por", val)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Autorizadas por" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {empleados?.data?.map((emp) => (
                              <SelectItem
                                key={emp.id_empleado}
                                value={String(emp.id_empleado)}
                              >
                                {emp.nombre} {emp.apellido_paterno}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editingRowData.hrs_comida || 0}
                          onChange={(e) =>
                            handleFieldChange("hrs_comida", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Textarea
                          value={editingRowData.notas || ""}
                          onChange={(e) =>
                            handleFieldChange("notas", e.target.value)
                          }
                          className="min-w-[150px]"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Textarea
                          value={editingRowData.notas_hrs_extra || ""}
                          onChange={(e) =>
                            handleFieldChange("notas_hrs_extra", e.target.value)
                          }
                          className="min-w-[150px]"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-sm text-white ${
                            editingRowData.estado === "Abierto"
                              ? "bg-green-600"
                              : "bg-gray-500"
                          }`}
                        >
                          {editingRowData.estado}
                        </span>
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background z-10 text-center flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveClick}
                          disabled={isSaving}
                        >
                          {isSaving ? "Guardando..." : "Guardar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                        >
                          Cancelar
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      {/* Celdas en modo visualización */}
                      <TableCell>{`${reg.nombre} ${reg.apellido_paterno}`}</TableCell>
                      <TableCell>{reg.tipo_registro_nombre}</TableCell>
                      {!fecha && (
                        <TableCell className="text-center">
                          {reg.fecha
                            ? dayjs(reg.fecha)
                                .tz("America/Mexico_City")
                                .format("DD-MM-YYYY")
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        {reg.entrada ? reg.entrada.slice(11, 19) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.salida ? reg.salida.slice(11, 19) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.asistencia === 1 ? "✅" : "✖️"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.goce_sueldo === 1 ? "✅" : "✖️"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.pago_triple === 1 ? "✅" : "✖️"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.correccion === 1 ? "✅" : "✖️"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.nombre_autorizador
                          ? `${reg.nombre_autorizador} ${reg.apellido_paterno_autorizador} ${reg.apellido_materno_autorizador}`
                          : ""}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.es_domingo === 1 ? "✅" : "✖️"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.prima_dominical ? `${reg.prima_dominical} %` : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.es_festivo === 1 ? "✅" : "✖️"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.porcentaje_dia_festivo
                          ? `${reg.porcentaje_dia_festivo} %`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.hrs_extra === 1 ? "✅" : "✖️"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.forma_pago_extras ? reg.forma_pago_extras : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.nombre_extra_autorizador
                          ? `${reg.nombre_extra_autorizador} ${reg.apellido_paterno_extra_autorizador} ${reg.apellido_materno_extra_autorizador}`
                          : ""}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.hrs_comida ? reg.hrs_comida : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.notas ? reg.notas : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.notas_hrs_extra ? reg.notas_hrs_extra : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-sm text-white ${
                            reg.estado === "Abierto"
                              ? "bg-green-600"
                              : "bg-gray-500"
                          }`}
                        >
                          {reg.estado}
                        </span>
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background z-10 text-center">
                        <Button size="sm" onClick={() => handleEditClick(reg)}>
                          Editar
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
