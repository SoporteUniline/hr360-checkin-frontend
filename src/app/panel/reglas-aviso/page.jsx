"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import axios from "@/lib/axios";
import Cookies from "js-cookie";
import TablePagination from "@/components/TablePagination";
import StatCard from "@/components/StatCard";

// UI (shadcn)
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Iconos
import {
  AlertTriangle,
  BellRing,
  Copy,
  Filter,
  Info,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import AccesosRapidos from "@/components/AccesosRapidos";
import { Combobox } from "@/components/Combobox";

// Utilidades locales
const diasSemanaMap = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

function descripcionConfig(regla) {
  const tipoRegla = (regla.nombre || "").toLowerCase();
  if (tipoRegla.includes("felicitar"))
    return "🎉 Felicitación automática (solo ON/OFF)";

  if (
    (tipoRegla.includes("cumpleaños") ||
      tipoRegla.includes("cumpleañero") ||
      tipoRegla.includes("aniversario")) &&
    tipoRegla.includes("avisar")
  ) {
    if (regla.periodicidad === "semanal") {
      return `Cada ${
        diasSemanaMap[regla.diaSemana] || "Lunes"
      }: próxima semana`;
    }
    if (regla.periodicidad === "mensual") {
      const diaTexto = regla.esUltimoDiaMes
        ? "Último día"
        : regla.esPrimerDiaMes
        ? "Día 1"
        : `Día ${regla.diaMes || 1}`;
      if (regla.diasAnticipacion === 30) return `${diaTexto}: este mes`;
      if (regla.diasAnticipacion === 60) return `${diaTexto}: próximo mes`;
    }
  }

  if (tipoRegla.includes("contratos") || tipoRegla.includes("vencer")) {
    if (regla.periodicidad === "semanal") {
      return `Cada ${diasSemanaMap[regla.diaSemana] || "Lunes"}: próximos ${
        regla.diasAnticipacion
      } días`;
    }
    if (regla.periodicidad === "mensual") {
      const diaTexto = regla.esUltimoDiaMes
        ? "Último día"
        : regla.esPrimerDiaMes
        ? "Día 1"
        : `Día ${regla.diaMes || 1}`;
      return `${diaTexto}: próximos ${regla.diasAnticipacion} días`;
    }
    if (regla.periodicidad === "diario") {
      return `Diario: próximos ${regla.diasAnticipacion} días`;
    }
  }

  if (regla.periodicidad === "diario") return "Reporte diario";
  if (regla.periodicidad === "semanal")
    return `Reporte cada ${diasSemanaMap[regla.diaSemana] || "Lunes"}`;

  return "Configurado";
}

export default function ReglasAvisoPage() {
  const { dataUser } = useAuth();
  const [empresaFiltro, setEmpresaFiltro] = useState("all");

  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const swrKey = `/checador/reglas-aviso?empresa=${empresaFiltro}`;
  const { data, isLoading, error, mutate } = useSWR(
    swrKey,
    fetcherWithToken,
    swr_config,
  );

  const opcionesEmpresas = React.useMemo(() => {
    const empresas = dataUser?.empresas_detalle || [];
    const lista = empresas.map((e) => ({
      label: e.nombre,
      value: String(e.id_empresa),
    }));

    return [{ label: "Todas las empresas", value: "all" }, ...lista];
  }, [dataUser]);

  const reglas = data || [];

  // Estadísticas
  const stats = useMemo(() => {
    const total = reglas.length;
    const activas = reglas.filter((r) => r.activa).length;
    const inactivas = total - activas;
    const totalEmp = reglas.reduce(
      (sum, r) => sum + (r.totalEmpleados || 0),
      0,
    );
    return { total, activas, inactivas, totalEmp };
  }, [reglas]);

  // Filtros simples
  const reglasFiltradas = useMemo(() => {
    return reglas.filter((r) => {
      const q = search.trim().toLowerCase();
      const mSearch = !q || r.nombre?.toLowerCase().includes(q);
      const mEstado =
        estado === "all" ||
        (estado === "activa" && r.activa) ||
        (estado === "inactiva" && !r.activa);
      return mSearch && mEstado;
    });
  }, [reglas, search, estado]);

  // Paginación (cliente)
  useEffect(() => {
    setPage(1);
  }, [search, estado, limit]);

  const total = reglasFiltradas.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const filas =
    limit === 1000000 ? reglasFiltradas : reglasFiltradas.slice(start, end);

  // Modales (editar / duplicar)
  const [openEdit, setOpenEdit] = useState(false);
  const [openDup, setOpenDup] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [reglaDetalle, setReglaDetalle] = useState(null); // incluye empleadosSeleccionados
  const [empleados, setEmpleados] = useState([]); // empleados de la empresa

  /**
   * Eliminación (confirmación).
   * Relación:
   * - Backend: `DELETE /api/checador/reglas-aviso/:id?empresa=...`
   *   (ver `hr360-checkin-backend/modules/attendance/controllers/reglasAvisoController.js`)
   */
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Helpers para cargar detalle + empleados
  const cargarDetalleYEmpleados = async (regla) => {
    setLoadingModal(true);
    try {
      const token = Cookies.get("token");
      const auth = { headers: { Authorization: `Bearer ${token}` } };
      const [resDetalle, resEmpleados] = await Promise.all([
        axios.get(`/checador/reglas-aviso/${regla.id}`, auth),
        axios.get(
          `/checador/empleados?empresa=${regla.idEmpresa}&page=1&limit=1000`,
          auth,
        ),
      ]);
      setReglaDetalle({ ...regla, ...resDetalle.data });
      // Normalizar lista de empleados para selección
      const lista = (resEmpleados.data?.data || []).map((e) => ({
        id: e.id_empleado,
        nombre: `${e.nombre} ${e.apellido_paterno || ""} ${
          e.apellido_materno || ""
        }`.trim(),
        correo: e.correo || "Sin correo",
      }));
      setEmpleados(lista);
    } finally {
      setLoadingModal(false);
    }
  };

  const abrirEditar = async (regla) => {
    await cargarDetalleYEmpleados(regla);
    setOpenEdit(true);
  };

  const abrirDuplicar = async (regla) => {
    await cargarDetalleYEmpleados(regla);
    setOpenDup(true);
  };

  const toggleEstado = async (regla, nuevo) => {
    try {
      const token = Cookies.get("token");
      await axios.patch(
        `/checador/reglas-aviso/${regla.id}/estado`,
        { activa: nuevo },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      mutate();
    } catch (e) {
      // noop: UI silenciosa
    }
  };

  const onDeleteRegla = (regla) => {
    setDeleteRow(regla);
  };

  const confirmDelete = async () => {
    if (!deleteRow?.id) return;
    try {
      setDeleting(true);
      const token = Cookies.get("token");
      await axios.delete(`/checador/reglas-aviso/${deleteRow.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { empresa: deleteRow.idEmpresa },
      });
      setDeleteRow(null);
      await mutate?.();
    } catch (e) {
      console.log("Error al eliminar:", e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header ADAMIA */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="bg-[#2563EB] p-2.5 rounded-lg">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Reglas de aviso
              </h1>
              <p className="text-sm text-gray-600">
                Edita configuración, duplica reglas y activa/desactiva
                notificaciones.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total reglas"
          value={stats.total}
          borderColor="border-blue-500"
        />
        <StatCard
          title="Reglas activas"
          value={stats.activas}
          borderColor="border-emerald-500"
        />
        <StatCard
          title="Reglas inactivas"
          value={stats.inactivas}
          borderColor="border-gray-400"
        />
        <StatCard
          title="Total empleados"
          value={stats.totalEmp}
          borderColor="border-amber-500"
        />
      </div>

      {/* Filtros */}
      <Card className="border-blue-100 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base font-bold text-blue-700 flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros de búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1">
              <Label className="text-sm font-medium text-gray-700">
                Empresa
              </Label>
              <Combobox
                options={opcionesEmpresas}
                value={String(empresaFiltro)}
                onChange={(val) => {
                  setEmpresaFiltro(val || "all");
                  setPage(1);
                }}
                placeholder="Filtrar por empresa..."
                emptyText="Empresa no encontrada"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-sm font-medium text-gray-700">
                Nombre
              </Label>
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar regla..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-sm font-medium text-gray-700">
                Estado
              </Label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="activa">Activas</SelectItem>
                  <SelectItem value="inactiva">Inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center justify-center"
                onClick={() => {
                  setSearch("");
                  setEstado("all");
                  setEmpresaFiltro("all");
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="p-0 overflow-hidden border-gray-100">
        <CardHeader className="border-b border-gray-100 bg-white pb-4">
          <CardTitle className="text-sm font-bold text-gray-900">
            Listado de reglas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Tipo de regla
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Empresa
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Configuración actual
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Empleados
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Acciones
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">
                    Estado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-gray-600"
                    >
                      Cargando...
                    </TableCell>
                  </TableRow>
                )}
                {error && !isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-red-600"
                    >
                      Error al cargar reglas
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  !error &&
                  filas.map((regla) => {
                    const esFelicitar = (regla.nombre || "")
                      .toLowerCase()
                      .includes("felicitar");
                    return (
                      <TableRow key={regla.id} className="hover:bg-zinc-50">
                        <TableCell className="font-semibold text-gray-900">
                          {regla.nombre}{" "}
                          {esFelicitar && (
                            <span className="ml-1 text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                              Solo ON/OFF
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {regla.empresa}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {descripcionConfig(regla)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            <Users className="h-3.5 w-3.5" />
                            {esFelicitar
                              ? "Todos"
                              : `${regla.totalEmpleados || 0}`}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {/*
                              Acciones por regla:
                              - Editar/Duplicar solo para reglas que no son "felicitar"
                              - Eliminar para cualquier regla (según solicitud)
                            */}
                            {!esFelicitar ? (
                              <>
                                <button
                                  onClick={() => abrirEditar(regla)}
                                  className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4 text-[#2563EB]" />
                                </button>
                                <button
                                  onClick={() => abrirDuplicar(regla)}
                                  className="p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                                  title="Duplicar"
                                >
                                  <Copy className="h-4 w-4 text-purple-600" />
                                </button>
                              </>
                            ) : null}
                            <button
                              onClick={() => onDeleteRegla(regla)}
                              className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={!!regla.activa}
                            onCheckedChange={(v) => toggleEstado(regla, v)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {!isLoading && !error && reglasFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-sm text-gray-600"
                    >
                      No hay reglas que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pie de tabla reutilizado del panel de permisos */}
      {!isLoading && !error && (
        <TablePagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {/* Dialogo Editar */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="p-0 overflow-hidden w-[95vw] md:max-w-6xl max-h-[90vh] md:max-h-[85vh]">
          <div className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                <Settings2 className="size-5 text-white" />
              </span>
              Configurar regla
              {reglaDetalle?.nombre ? ` - ${reglaDetalle.nombre}` : ""}
            </DialogTitle>
            <p className="text-sm text-white/80">
              Define la frecuencia, alcance y destinatarios del aviso.
            </p>
          </div>
          <div className="max-h-[calc(90vh-92px)] md:max-h-[calc(85vh-92px)] overflow-y-auto overscroll-contain p-5">
            {loadingModal ? (
              <div className="py-10 text-center text-sm text-gray-600">
                Cargando...
              </div>
            ) : reglaDetalle ? (
              <FormularioRegla
                modo="editar"
                detalle={reglaDetalle}
                empleados={empleados}
                onClose={() => setOpenEdit(false)}
                onSaved={() => {
                  setOpenEdit(false);
                  mutate();
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogo Duplicar */}
      <Dialog open={openDup} onOpenChange={setOpenDup}>
        <DialogContent className="p-0 overflow-hidden w-[95vw] md:max-w-6xl max-h-[90vh] md:max-h-[85vh]">
          <div className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                <Copy className="size-5 text-white" />
              </span>
              Duplicar regla
              {reglaDetalle?.nombre ? ` - ${reglaDetalle.nombre}` : ""}
            </DialogTitle>
            <p className="text-sm text-white/80">
              Crea una copia con una configuración diferente para evitar
              duplicados.
            </p>
          </div>
          <div className="max-h-[calc(90vh-92px)] md:max-h-[calc(85vh-92px)] overflow-y-auto overscroll-contain p-5">
            {loadingModal ? (
              <div className="py-10 text-center text-sm text-gray-600">
                Cargando...
              </div>
            ) : reglaDetalle ? (
              <FormularioRegla
                modo="duplicar"
                detalle={reglaDetalle}
                empleados={empleados}
                onClose={() => setOpenDup(false)}
                onSaved={() => {
                  setOpenDup(false);
                  mutate();
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />

      {/* Confirmación de eliminación */}
      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(open) => !open && setDeleteRow(null)}
      >
        <AlertDialogContent className="p-0 overflow-hidden sm:max-w-lg">
          <div className="p-5 bg-gradient-to-r from-red-600 to-red-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-base font-bold text-white">
                <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                  <AlertTriangle className="size-5 text-white" />
                </span>
                Eliminar regla de aviso
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-red-100">
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>

          <div className="p-5">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-sm text-red-800">
                {deleteRow
                  ? `Se eliminará la regla “${deleteRow.nombre || "Regla"}”.`
                  : "Se eliminará la regla seleccionada."}
              </AlertDescription>
            </Alert>
          </div>

          <AlertDialogFooter className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
            <AlertDialogCancel
              className="border border-gray-300 text-gray-700 hover:bg-gray-100"
              disabled={deleting}
            >
              <span className="inline-flex items-center">
                <X className="h-4 w-4 mr-2" /> Cancelar
              </span>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <span className="inline-flex items-center">
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? "Eliminando..." : "Eliminar"}
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormularioRegla({ modo, detalle, empleados, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const base = {
      idTipoRegla: detalle.idTipoRegla,
      idEmpresa: detalle.idEmpresa,
      idRegla: detalle.id,
      tipoNotificacion: detalle.tipoNotificacion || "reporte_periodico",
      periodicidad: detalle.periodicidad || "diario",
      diaSemana: detalle.diaSemana || null,
      diaMes: detalle.diaMes || null,
      esPrimerDiaMes: !!detalle.esPrimerDiaMes,
      esUltimoDiaMes: !!detalle.esUltimoDiaMes,
      diasAnticipacion: detalle.diasAnticipacion || 0,
      tipoAviso: detalle.tipoAviso || "antes",
      avisarUsuario: !!detalle.avisarUsuario,
      activa: !!detalle.activa,
      empleadosSeleccionados: detalle.empleadosSeleccionados || [],
    };
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const tipoNombre = (detalle.nombre || "").toLowerCase();

  const marcarTodos = (checked) => {
    if (checked) {
      setForm((f) => ({
        ...f,
        empleadosSeleccionados: empleados.map((e) => e.id),
      }));
    } else {
      setForm((f) => ({ ...f, empleadosSeleccionados: [] }));
    }
  };

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Guardar edición
  const guardar = async () => {
    setErrorMsg("");
    setSaving(true);
    try {
      // Validación simple
      if (form.empleadosSeleccionados.length === 0) {
        setErrorMsg("Debes seleccionar al menos un empleado.");
        return;
      }
      const token = Cookies.get("token");
      const auth = { headers: { Authorization: `Bearer ${token}` } };

      if (modo === "editar") {
        await axios.put(`/checador/reglas-aviso/${form.idRegla}`, form, auth);
        onSaved?.();
      } else {
        // Primero verificar duplicado
        setChecking(true);
        const ver = await axios.post(
          `/checador/reglas-aviso/verificar-duplicado`,
          form,
          auth,
        );
        if (ver.data?.existeDuplicado) {
          setErrorMsg(
            "⚠️ Ya existe una regla con esta configuración exacta. Por favor cambia la frecuencia, día o ventana de días.",
          );
          setChecking(false);
          return;
        }
        // Crear
        await axios.post(`/checador/reglas-aviso/duplicar`, form, auth);
        setChecking(false);
        onSaved?.();
      }
    } catch (e) {
      setErrorMsg(e.response?.data?.message || "Ocurrió un error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Vista compacta basada en los 3 tipos principales del HTML
  const isContratos =
    tipoNombre.includes("contratos") || tipoNombre.includes("vencer");
  const isCumpleAvisar =
    (tipoNombre.includes("cumpleaños") ||
      tipoNombre.includes("cumpleañero") ||
      tipoNombre.includes("aniversario")) &&
    tipoNombre.includes("avisar");
  const isReporte =
    tipoNombre.includes("inasistencia") ||
    tipoNombre.includes("llegadas") ||
    tipoNombre.includes("tarde");

  return (
    <div className="space-y-4">
      {modo === "duplicar" && (
        <div className="border border-amber-500/50 bg-amber-50 text-amber-900 rounded-md p-3 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-700" />
          <strong>Importante:</strong> Debes cambiar la configuración para
          evitar duplicados. No se permite crear reglas con la misma
          configuración exacta.
        </div>
      )}

      {errorMsg && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-sm text-red-800">
            {errorMsg}
          </AlertDescription>
        </Alert>
      )}

      {/* Configuración */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-3">
            {isContratos
              ? "¿Cuándo recibir el reporte?"
              : isCumpleAvisar
              ? "¿Cuándo avisar?"
              : "Configuración"}
          </div>

          {/* Frecuencia */}
          <div className="space-y-2 mb-3">
            <Label>
              {isCumpleAvisar ? "Frecuencia del reporte" : "Frecuencia"}
            </Label>
            <Select
              value={form.periodicidad}
              onValueChange={(v) => update({ periodicidad: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione" />
              </SelectTrigger>
              <SelectContent>
                {/* Etiquetas según tipo para coincidir con el HTML original */}
                {isContratos && (
                  <SelectItem value="diario">Todos los días</SelectItem>
                )}
                {isReporte && (
                  <SelectItem value="diario">Todos los días</SelectItem>
                )}
                {isReporte && (
                  <SelectItem value="semanal">
                    Semanalmente (resumen)
                  </SelectItem>
                )}
                {isContratos && (
                  <SelectItem value="semanal">
                    Día específico de la semana
                  </SelectItem>
                )}
                {isContratos && (
                  <SelectItem value="mensual">
                    Día específico del mes
                  </SelectItem>
                )}
                {isCumpleAvisar && (
                  <SelectItem value="semanal">Semanalmente</SelectItem>
                )}
                {isCumpleAvisar && (
                  <SelectItem value="mensual">Mensualmente</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Día semana */}
          {form.periodicidad === "semanal" && (
            <div className="space-y-2 mb-3">
              <Label>¿Qué día de la semana?</Label>
              <Select
                value={form.diaSemana || "lunes"}
                onValueChange={(v) => update({ diaSemana: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(diasSemanaMap).map((k) => (
                    <SelectItem key={k} value={k}>
                      {diasSemanaMap[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Día mes para mensual */}
          {form.periodicidad === "mensual" && (
            <div className="space-y-2 mb-3">
              <Label>¿Qué día del mes?</Label>
              <Select
                value={
                  form.esUltimoDiaMes
                    ? "31"
                    : form.esPrimerDiaMes
                    ? "1"
                    : `${form.diaMes || 1}`
                }
                onValueChange={(v) => {
                  if (v === "31") {
                    update({
                      diaMes: null,
                      esPrimerDiaMes: false,
                      esUltimoDiaMes: true,
                    });
                  } else if (v === "1") {
                    update({
                      diaMes: 1,
                      esPrimerDiaMes: true,
                      esUltimoDiaMes: false,
                    });
                  } else {
                    update({
                      diaMes: parseInt(v),
                      esPrimerDiaMes: false,
                      esUltimoDiaMes: false,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Día 1 (primer día)</SelectItem>
                  <SelectItem value="5">Día 5</SelectItem>
                  <SelectItem value="10">Día 10</SelectItem>
                  <SelectItem value="15">Día 15</SelectItem>
                  <SelectItem value="20">Día 20</SelectItem>
                  <SelectItem value="25">Día 25</SelectItem>
                  <SelectItem value="31">Último día del mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Ventana de días (contratos y reportes) o rango (cumple/anniv mensual) */}
          {(isContratos || isReporte) && (
            <div className="space-y-2">
              <Label>
                {isContratos
                  ? "¿En cuántos días vencerán los contratos que quieres monitorear?"
                  : "¿En cuántos días?"}
              </Label>
              {isContratos && (
                <div className="border border-amber-400/60 bg-amber-50 text-amber-900 rounded p-2 text-xs flex gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-amber-700" />
                  <div>
                    <strong>Ejemplo:</strong> Si ingresas "30", recibirás los
                    contratos que vencen en los próximos 30 días desde hoy.
                  </div>
                </div>
              )}
              <Input
                type="number"
                min={1}
                max={365}
                value={form.diasAnticipacion}
                onChange={(e) =>
                  update({ diasAnticipacion: parseInt(e.target.value || "0") })
                }
                className="w-36"
              />
            </div>
          )}
          {isCumpleAvisar && form.periodicidad === "mensual" && (
            <div className="space-y-2">
              <Label>¿De quiénes avisar?</Label>
              <Select
                value={`${form.diasAnticipacion || 30}`}
                onValueChange={(v) => update({ diasAnticipacion: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Los de este mes</SelectItem>
                  <SelectItem value="60">Los del próximo mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Avisar al usuario (contratos) */}
          {isContratos && (
            <div className="mt-3 flex items-center gap-2">
              <Checkbox
                id="avisar-usuario"
                checked={!!form.avisarUsuario}
                onCheckedChange={(v) => update({ avisarUsuario: !!v })}
              />
              <Label htmlFor="avisar-usuario">
                También notificar a cada empleado sobre su propio contrato
              </Label>
            </div>
          )}
        </div>

        {/* Empleados */}
        <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
          <div className="font-semibold mb-3">¿A quién enviar el reporte?</div>
          <div className="mb-2 flex items-center gap-2">
            <Checkbox
              id="todos"
              checked={
                form.empleadosSeleccionados.length > 0 &&
                form.empleadosSeleccionados.length === empleados.length
              }
              onCheckedChange={(v) => marcarTodos(!!v)}
            />
            <Label htmlFor="todos">Seleccionar todos</Label>
          </div>
          <div className="max-h-72 overflow-auto border border-gray-200 rounded-lg p-2 space-y-2 bg-gray-50">
            {empleados.map((emp) => {
              const checked = form.empleadosSeleccionados.includes(emp.id);
              return (
                <label
                  key={emp.id}
                  className="flex items-center gap-2 border border-gray-200 bg-white rounded-lg px-2 py-2"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      if (v) {
                        update({
                          empleadosSeleccionados: [
                            ...form.empleadosSeleccionados,
                            emp.id,
                          ],
                        });
                      } else {
                        update({
                          empleadosSeleccionados:
                            form.empleadosSeleccionados.filter(
                              (x) => x !== emp.id,
                            ),
                        });
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{emp.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      {emp.correo}
                    </div>
                  </div>
                </label>
              );
            })}
            {empleados.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No hay empleados disponibles.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 p-4 -mx-5 mt-4">
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end px-5">
          {/*
          Botones con paleta del sistema (ver `Colores.txt`):
          - Secundario: fondo blanco + borde gris (#d1d5db) + hover #f9fafb
          - Primario: #37495E + hover #2c3a4a + sombra

          Relación:
          - Otros módulos usan este patrón, por ejemplo Actas (botón principal slate) y confirmaciones.
        */}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button
            onClick={guardar}
            disabled={
              saving || checking || form.empleadosSeleccionados.length === 0
            }
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
          >
            {modo === "editar" ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Guardando..." : "Guardar cambios"}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                {checking
                  ? "Verificando..."
                  : saving
                  ? "Guardando..."
                  : "Crear regla duplicada"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
