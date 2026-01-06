"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import axios from "@/lib/axios";
import Cookies from "js-cookie";
import TablePagination from "@/components/TablePagination";

// UI (shadcn)
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

// Iconos
import { Copy, Settings2, Trash2 } from "lucide-react";
import AccesosRapidos from "@/components/AccesosRapidos";

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
  if (tipoRegla.includes("felicitar")) return "🎉 Felicitación automática (solo ON/OFF)";

  if (
    (tipoRegla.includes("cumpleaños") ||
      tipoRegla.includes("cumpleañero") ||
      tipoRegla.includes("aniversario")) &&
    tipoRegla.includes("avisar")
  ) {
    if (regla.periodicidad === "semanal") {
      return `Cada ${diasSemanaMap[regla.diaSemana] || "Lunes"}: próxima semana`;
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
      return `Cada ${diasSemanaMap[regla.diaSemana] || "Lunes"}: próximos ${regla.diasAnticipacion} días`;
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
  const id_empresa = dataUser?.id_empresa;

  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const swrKey = id_empresa
    ? `/checador/reglas-aviso?empresa=${id_empresa}`
    : null;
  const { data, isLoading, error, mutate } = useSWR(
    swrKey,
    fetcherWithToken,
    swr_config
  );

  const reglas = data || [];

  // Estadísticas
  const stats = useMemo(() => {
    const total = reglas.length;
    const activas = reglas.filter((r) => r.activa).length;
    const inactivas = total - activas;
    const totalEmp = reglas.reduce((sum, r) => sum + (r.totalEmpleados || 0), 0);
    return { total, activas, inactivas, totalEmp };
  }, [reglas]);

  // Filtros simples
  const reglasFiltradas = useMemo(() => {
    return reglas.filter((r) => {
      const q = search.trim().toLowerCase();
      const mSearch =
        !q || r.nombre?.toLowerCase().includes(q);
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
  const filas = limit === 1000000 ? reglasFiltradas : reglasFiltradas.slice(start, end);

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
          auth
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
        { headers: { Authorization: `Bearer ${token}` } }
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
    if (!id_empresa) return;
    try {
      setDeleting(true);
      const token = Cookies.get("token");
      await axios.delete(`/checador/reglas-aviso/${deleteRow.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        // Mandamos empresa para validar pertenencia en backend.
        params: { empresa: id_empresa },
      });
      setDeleteRow(null);
      await mutate?.();
    } catch (e) {
      // Mantener UX silenciosa como en toggleEstado, pero cerramos loading.
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-[#2c3e50]">Gestión de Reglas de Aviso</h1>
        <p className="text-sm text-[#6b7280]">
          Edita configuración | Duplica reglas | Activa/Desactiva
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-[#e5e7eb] rounded-md p-4 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold">
            Total Reglas
          </div>
          <div className="text-2xl font-bold text-[#2c3e50]">{stats.total}</div>
        </div>
        <div className="border border-[#e5e7eb] rounded-md p-4 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold">
            Reglas Activas
          </div>
          <div className="text-2xl font-bold text-[#2c3e50]">{stats.activas}</div>
        </div>
        <div className="border border-[#e5e7eb] rounded-md p-4 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold">
            Reglas Inactivas
          </div>
          <div className="text-2xl font-bold text-[#2c3e50]">{stats.inactivas}</div>
        </div>
        <div className="border border-[#e5e7eb] rounded-md p-4 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold">
            Total Empleados
          </div>
          <div className="text-2xl font-bold text-[#2c3e50]">{stats.totalEmp}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-2 items-center">
        <Input
          placeholder="Buscar por nombre de regla..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:w-80"
        />
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="md:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="activa">Activas</SelectItem>
            <SelectItem value="inactiva">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            {/*
              FIX hover:
              `TableRow` (shadcn) trae `hover:bg-muted/50` por defecto (ver `src/components/ui/table.jsx`),
              lo que "lava" el header al pasar el cursor.
              Forzamos el mismo color en hover para que NO cambie.
            */}
            <TableRow className="bg-[#37495E] hover:bg-[#37495E]">
              <TableHead className="text-white">Tipo de Regla</TableHead>
              <TableHead className="text-white">Empresa</TableHead>
              <TableHead className="text-white">Configuración Actual</TableHead>
              <TableHead className="text-white">Empleados</TableHead>
              <TableHead className="text-white">Acciones</TableHead>
              <TableHead className="text-right text-white">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6}>Cargando...</TableCell>
              </TableRow>
            )}
            {error && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-red-600">
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
                  <TableRow key={regla.id}>
                    <TableCell className="font-semibold">
                      {regla.nombre}{" "}
                      {esFelicitar && (
                        <span className="ml-1 text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          Solo ON/OFF
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{regla.empresa}</TableCell>
                    <TableCell>{descripcionConfig(regla)}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-white">
                        {esFelicitar ? "Todos" : `${regla.totalEmpleados} 👥`}
                      </span>
                    </TableCell>
                    <TableCell className="space-x-2">
                      {/*
                        Acciones por regla:
                        - Editar/Duplicar se mantienen solo para reglas que no son "felicitar"
                        - Eliminar se permite para cualquier regla (según solicitud)
                      */}
                      {!esFelicitar ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#93c5fd] text-[#2563eb] hover:bg-[#dbeafe] hover:text-[#1e40af]"
                            onClick={() => abrirEditar(regla)}
                          >
                            <Settings2 className="w-4 h-4 mr-1" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
                            onClick={() => abrirDuplicar(regla)}
                          >
                            <Copy className="w-4 h-4 mr-1" /> Duplicar
                          </Button>
                        </>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#fca5a5] text-[#dc2626] hover:bg-[#fee2e2]"
                        onClick={() => onDeleteRegla(regla)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                      </Button>
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
                <TableCell colSpan={6} className="text-center py-10">
                  No hay reglas que coincidan con los filtros
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
        <DialogContent className="w-[95vw] md:max-w-6xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto overscroll-contain">
          <DialogHeader>
            <DialogTitle>
              Configurar Regla
              {reglaDetalle?.nombre ? ` - ${reglaDetalle.nombre}` : ""}
            </DialogTitle>
          </DialogHeader>
          {loadingModal ? (
            <div className="py-10 text-center text-muted-foreground">
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
        </DialogContent>
      </Dialog>

      {/* Dialogo Duplicar */}
      <Dialog open={openDup} onOpenChange={setOpenDup}>
        <DialogContent className="w-[95vw] md:max-w-6xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto overscroll-contain">
          <DialogHeader>
            <DialogTitle>
              Duplicar Regla
              {reglaDetalle?.nombre ? ` - ${reglaDetalle.nombre}` : ""}
            </DialogTitle>
          </DialogHeader>
          {loadingModal ? (
            <div className="py-10 text-center text-muted-foreground">
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
        </DialogContent>
      </Dialog>
      
      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar regla de aviso?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow
                ? `Esta acción no se puede deshacer. Se eliminará la regla “${deleteRow.nombre || "Regla"}”.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]" disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
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
        setErrorMsg("⚠️ Debes seleccionar al menos un empleado");
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
        const ver = await axios.post(`/checador/reglas-aviso/verificar-duplicado`, form, auth);
        if (ver.data?.existeDuplicado) {
          setErrorMsg("⚠️ Ya existe una regla con esta configuración exacta. Por favor cambia la frecuencia, día o ventana de días.");
          setChecking(false);
          return;
        }
        // Crear
        await axios.post(`/checador/reglas-aviso/duplicar`, form, auth);
        setChecking(false);
        onSaved?.();
      }
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
        <div className="border border-amber-500/50 bg-amber-50 text-amber-900 rounded-md p-3 text-sm">
          <span className="mr-1">⚠️</span>
          <strong>Importante:</strong> Debes cambiar la configuración para evitar duplicados. No se permite crear reglas con la misma configuración exacta.
        </div>
      )}

      {errorMsg && (
        <div className="border border-red-500/50 bg-red-50 text-red-700 rounded-md p-3 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Configuración */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-md p-4">
          <div className="font-semibold mb-3">
            {isContratos
              ? "📅 ¿Cuándo recibir el reporte?"
              : isCumpleAvisar
              ? "📅 ¿Cuándo avisar?"
              : "Configuración"}
          </div>

          {/* Frecuencia */}
          <div className="space-y-2 mb-3">
            <Label>{isCumpleAvisar ? "Frecuencia del reporte" : "Frecuencia"}</Label>
            <Select
              value={form.periodicidad}
              onValueChange={(v) => update({ periodicidad: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione" />
              </SelectTrigger>
              <SelectContent>
                {/* Etiquetas según tipo para coincidir con el HTML original */}
                {isContratos && <SelectItem value="diario">Todos los días</SelectItem>}
                {isReporte && <SelectItem value="diario">Todos los días</SelectItem>}
                {isReporte && <SelectItem value="semanal">Semanalmente (resumen)</SelectItem>}
                {isContratos && <SelectItem value="semanal">Día específico de la semana</SelectItem>}
                {isContratos && <SelectItem value="mensual">Día específico del mes</SelectItem>}
                {isCumpleAvisar && <SelectItem value="semanal">Semanalmente</SelectItem>}
                {isCumpleAvisar && <SelectItem value="mensual">Mensualmente</SelectItem>}
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
                  form.esUltimoDiaMes ? "31" : form.esPrimerDiaMes ? "1" : `${form.diaMes || 1}`
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
                <div className="border border-amber-400/60 bg-amber-50 text-amber-900 rounded p-2 text-xs">
                  💡 <strong>Ejemplo:</strong> Si ingresas "30", recibirás los contratos que vencen en los próximos 30 días desde hoy.
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
                onValueChange={(v) =>
                  update({ diasAnticipacion: parseInt(v) })
                }
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
        <div className="border rounded-md p-4">
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
          <div className="max-h-72 overflow-auto border rounded-md p-2 space-y-2 bg-muted/30">
            {empleados.map((emp) => {
              const checked = form.empleadosSeleccionados.includes(emp.id);
              return (
                <label
                  key={emp.id}
                  className="flex items-center gap-2 border bg-background rounded px-2 py-2"
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
                            form.empleadosSeleccionados.filter((x) => x !== emp.id),
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

      <DialogFooter>
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
          className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
        >
          Cancelar
        </Button>
        <Button
          onClick={guardar}
          disabled={saving || checking || form.empleadosSeleccionados.length === 0}
          className="bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]"
        >
          {modo === "editar"
            ? saving
              ? "Guardando..."
              : "Guardar cambios"
            : checking
            ? "Verificando..."
            : saving
            ? "Guardando..."
            : "Crear regla duplicada"}
        </Button>
      </DialogFooter>
    </div>
  );
}


