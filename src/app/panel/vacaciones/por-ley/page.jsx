"use client";

/**
 * Página: Vacaciones por ley (CRUD)
 * - CRUD sobre la tabla vacaciones_por_ley por empresa
 * - GET    /api/checador/vacaciones-ley?id_empresa=:id
 * - POST   /api/checador/vacaciones-ley
 * - PUT    /api/checador/vacaciones-ley/:id
 * - DELETE /api/checador/vacaciones-ley/:id
 *
 * Relacionado con:
 * - Backend: redlab_back/modules/attendance/controllers/vacacionesLeyController.js
 *            redlab_back/modules/attendance/routes/vacacionesLeyRoutes.js
 * - Navbar: src/components/Navbar.jsx (botón Vacaciones)
 */

import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TablePagination from "@/components/TablePagination";
import { useSnackbar } from "notistack";
import styles from "../vacaciones-theme.module.css";
import AccesosRapidos from "@/components/AccesosRapidos";
import {
  BookOpen,
  Pencil,
  Plus,
  Save,
  Trash2,
  AlertTriangle,
} from "lucide-react";

function num(n, d = 0) {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return 0;
  return d === 0 ? Math.round(v) : Number(v.toFixed(d));
}

export default function VacacionesPorLeyPage() {
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [empresaActiva, setEmpresaActiva] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [form, setForm] = useState({
    anios: "",
    dias: "",
    prima_vacacional: 0,
    dias_extras: 0,
    prima_extra: 0,
    id_empresa: "",
  });

  // Paginación simple en cliente
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const total = rows.length;
  const pageRows = useMemo(() => {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }, [rows, page, limit]);

  const total_dias = num(form.dias, 0) + num(form.dias_extras, 0);
  const total_prima = num(form.prima_vacacional, 2) + num(form.prima_extra, 2);

  const resetForm = () => {
    setForm({
      anios: "",
      dias: "",
      prima_vacacional: 0,
      dias_extras: 0,
      prima_extra: 0,
    });
    setEditRow(null);
  };

  const fetchRows = async () => {
    if (!dataUser?.empresas) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/vacaciones-ley`;
      const res = await axios.get(url, {
        params: { id_empresa: empresaActiva },
      });
      setRows(res.data || []);
    } catch (e) {
      setError("Error al cargar vacaciones por ley");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [empresaActiva, dataUser]);

  const openCreate = () => {
    resetForm();
    setForm((f) => ({
      ...f,
      // Si hay una empresa seleccionada en el filtro, la usamos, si no, la primera del usuario
      id_empresa:
        empresaActiva !== "all" ? empresaActiva : dataUser?.id_empresa || "",
    }));
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      anios: row.anios,
      dias: row.dias,
      prima_vacacional: row.prima_vacacional ?? 0,
      dias_extras: row.dias_extras ?? 0,
      prima_extra: row.prima_extra ?? 0,
      id_empresa: row.id_empresa, // <--- Cargar la empresa del registro
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Validaciones básicas en cliente
    if (form.anios === "" || form.dias === "" || !form.id_empresa) {
      enqueueSnackbar("Empresa, Años y Días son obligatorios", {
        variant: "error",
      });
      return;
    }
    if (Number(form.anios) < 0 || Number(form.dias) < 0) {
      enqueueSnackbar("Años y Días deben ser valores positivos", {
        variant: "error",
      });
      return;
    }
    // No duplicar 'anios' dentro de la MISMA empresa
    const targetAnios = Number(form.anios);
    const targetEmpresa = Number(form.id_empresa); // Obtenemos la empresa del form

    const dup = rows.some(
      (r) =>
        Number(r.anios) === targetAnios &&
        Number(r.id_empresa) === targetEmpresa && // <--- Clave: Validar que sea la misma empresa
        (!editRow || r.id !== editRow.id),
    );

    if (dup) {
      enqueueSnackbar("Ya existe una regla con esos años para esta empresa", {
        variant: "warning",
      });
      return;
    }
    const payload = {
      ...form,
      anios: Number(form.anios),
      dias: Number(form.dias),
      prima_vacacional: num(form.prima_vacacional, 2),
      dias_extras: Number(form.dias_extras),
      prima_extra: num(form.prima_extra, 2),
      total_dias,
      total_prima,
      id_empresa: Number(form.id_empresa),
    };
    try {
      const base = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/vacaciones-ley`;
      if (editRow) {
        await axios.put(`${base}/${editRow.id}`, payload);
        enqueueSnackbar("Registro actualizado correctamente", {
          variant: "success",
        });
      } else {
        await axios.post(base, payload);
        enqueueSnackbar("Registro creado correctamente", {
          variant: "success",
        });
      }
      setDialogOpen(false);
      await fetchRows();
    } catch (e) {
      const msg = e?.response?.data?.error || "Error al guardar";
      enqueueSnackbar(msg, { variant: "error" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      const base = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/vacaciones-ley`;
      await axios.delete(`${base}/${deleteRow.id}`, {
        params: { id_empresa: deleteRow.id_empresa },
      });
      enqueueSnackbar("Registro eliminado correctamente", {
        variant: "success",
      });
      await fetchRows();
    } catch (e) {
      const msg = e?.response?.data?.error || "Error al eliminar";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setDeleteRow(null);
    }
  };

  return (
    <div className={`${styles.vacacionesTheme} space-y-6`}>
      {/* Header ADAMIA */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="bg-[#2563EB] p-2.5 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Vacaciones por ley
              </h1>
              <p className="text-sm text-gray-600">
                Configura días y primas por año de antigüedad.
              </p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white w-full sm:w-auto gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
      </div>

      <select
        value={empresaActiva}
        onChange={(e) =>
          setEmpresaActiva(
            e.target.value === "all" ? "all" : Number(e.target.value),
          )
        }
        className="text-sm border rounded-md px-2 py-1 bg-white"
      >
        <option value="all">🌍 Todas las empresas</option>
        {dataUser?.empresas_detalle?.map((emp) => (
          <option key={emp.id_empresa} value={emp.id_empresa}>
            {emp.nombre}
          </option>
        ))}
      </select>

      <Card className="p-0 overflow-hidden border-gray-100">
        <CardHeader className="border-b border-gray-100 bg-white pb-4">
          <CardTitle className="text-sm font-bold text-gray-900">
            Lista de reglas
          </CardTitle>
        </CardHeader>
        {loading ? (
          <div className="text-center text-slate-400 py-16">Cargando...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-16">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-center text-slate-400 py-16">Sin registros</div>
        ) : (
          <>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold uppercase text-gray-600">
                      Empresa
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-gray-600">
                      Años
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-gray-600">
                      Días
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-gray-600">
                      Prima vac. (%)
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-gray-600">
                      Días extra
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-gray-600">
                      Prima extra (%)
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-gray-600">
                      Total días
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-gray-600">
                      Total prima (%)
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-[10px] text-muted-foreground uppercase">
                        {dataUser?.empresas_detalle?.find(
                          (e) => e.id_empresa === r.id_empresa,
                        )?.nombre || "N/A"}
                      </TableCell>
                      <TableCell className="font-semibold">{r.anios}</TableCell>
                      <TableCell>{r.dias}</TableCell>
                      <TableCell>{num(r.prima_vacacional, 2)}</TableCell>
                      <TableCell>{num(r.dias_extras, 0)}</TableCell>
                      <TableCell>{num(r.prima_extra, 2)}</TableCell>
                      <TableCell>{num(r.total_dias, 0)}</TableCell>
                      <TableCell>{num(r.total_prima, 2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => openEdit(r)}
                            className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4 text-[#2563EB]" />
                          </button>
                          <button
                            onClick={() => setDeleteRow(r)}
                            className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </>
        )}
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-[95vw] sm:max-w-lg">
          <DialogHeader className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                <BookOpen className="size-5 text-white" />
              </span>
              {editRow ? "Editar regla" : "Nueva regla"}
            </DialogTitle>
            <p className="text-sm text-white/80">
              Define días y primas por año de antigüedad.
            </p>
          </DialogHeader>

          <div
            className={`${styles.vacacionesTheme} max-h-[70vh] overflow-y-auto px-5`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <div className="text-[11px] uppercase text-slate-500 font-bold mb-2">
                  Empresa destino
                </div>
                <select
                  disabled={!!editRow} // Bloqueado al editar para evitar inconsistencias
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={form.id_empresa}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      id_empresa: Number(e.target.value),
                    }))
                  }
                >
                  <option value="" disabled>
                    Selecciona una empresa
                  </option>
                  {dataUser?.empresas_detalle?.map((emp) => (
                    <option key={emp.id_empresa} value={emp.id_empresa}>
                      {emp.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700">Años</div>
                <Input
                  type="number"
                  value={form.anios}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, anios: e.target.value }))
                  }
                  className="bg-white mt-2"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Días</div>
                <Input
                  type="number"
                  value={form.dias}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dias: e.target.value }))
                  }
                  className="bg-white mt-2"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Prima vacacional (%)
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={form.prima_vacacional}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, prima_vacacional: e.target.value }))
                  }
                  className="bg-white mt-2"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Días extra
                </div>
                <Input
                  type="number"
                  value={form.dias_extras}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dias_extras: e.target.value }))
                  }
                  className="bg-white mt-2"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Prima extra (%)
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={form.prima_extra}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, prima_extra: e.target.value }))
                  }
                  className="bg-white mt-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Total días
                  </div>
                  <div className="mt-2 h-9 px-3 py-2 text-sm border rounded-md bg-gray-50">
                    {total_dias}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Total prima (%)
                  </div>
                  <div className="mt-2 h-9 px-3 py-2 text-sm border rounded-md bg-gray-50">
                    {total_prima.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
            >
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Confirmación de eliminación (estilo consistente con UI) */}
      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(open) => !open && setDeleteRow(null)}
      >
        <AlertDialogContent className="p-0 overflow-hidden sm:max-w-lg">
          <div className="p-5 bg-gradient-to-r from-red-600 to-red-700 text-white">
            <div className="flex items-center gap-2 text-base font-bold">
              <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                <AlertTriangle className="size-5 text-white" />
              </span>
              ¿Eliminar regla?
            </div>
            <div className="text-sm text-red-100 mt-1">
              Esta acción no se puede deshacer.
            </div>
          </div>
          <div className="p-5">
            <AlertDialogDescription className="text-sm text-gray-700">
              {deleteRow
                ? `Eliminarás la regla de "${deleteRow.anios}" años.`
                : ""}
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-100">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#ef4444] hover:bg-[#dc2626]"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
