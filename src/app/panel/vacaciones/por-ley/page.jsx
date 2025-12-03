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
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

function num(n, d = 0) {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return 0;
  return d === 0 ? Math.round(v) : Number(v.toFixed(d));
}

export default function VacacionesPorLeyPage() {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;
  const { enqueueSnackbar } = useSnackbar();

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
    if (!idEmpresa) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/vacaciones-ley`;
      const res = await axios.get(url, { params: { id_empresa: idEmpresa } });
      setRows(res.data || []);
    } catch (e) {
      setError("Error al cargar vacaciones por ley");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [idEmpresa]);

  const openCreate = () => {
    resetForm();
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
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Validaciones básicas en cliente
    if (form.anios === "" || form.dias === "") {
      enqueueSnackbar("Años y Días son obligatorios", { variant: "error" });
      return;
    }
    if (Number(form.anios) < 0 || Number(form.dias) < 0) {
      enqueueSnackbar("Años y Días deben ser valores positivos", { variant: "error" });
      return;
    }
    // No duplicar 'anios' dentro de la empresa (cliente)
    const targetAnios = Number(form.anios);
    const dup = rows.some((r) => Number(r.anios) === targetAnios && (!editRow || r.id !== editRow.id));
    if (dup) {
      enqueueSnackbar("Ya existe una regla con esos años", { variant: "warning" });
      return;
    }
    const payload = {
      anios: Number(form.anios),
      dias: Number(form.dias),
      prima_vacacional: num(form.prima_vacacional, 2),
      dias_extras: Number(form.dias_extras),
      prima_extra: num(form.prima_extra, 2),
      total_dias,
      total_prima,
      id_empresa: idEmpresa,
    };
    try {
      const base = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/vacaciones-ley`;
      if (editRow) {
        await axios.put(`${base}/${editRow.id}`, payload);
        enqueueSnackbar("Registro actualizado correctamente", { variant: "success" });
      } else {
        await axios.post(base, payload);
        enqueueSnackbar("Registro creado correctamente", { variant: "success" });
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
      await axios.delete(`${base}/${deleteRow.id}`, { params: { id_empresa: idEmpresa } });
      enqueueSnackbar("Registro eliminado correctamente", { variant: "success" });
      await fetchRows();
    } catch (e) {
      const msg = e?.response?.data?.error || "Error al eliminar";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setDeleteRow(null);
    }
  };

  return (
    <div className={`${styles.vacacionesTheme} p-4 md:p-6 space-y-4`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">📘 Vacaciones por ley</h1>
          <p className="text-sm text-muted-foreground">
            Configura los días y primas por año de antigüedad
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={openCreate}
            className="shadow-[0_4px_12px_rgba(55,73,94,0.3)] transition-all hover:-translate-y-0.5"
          >
            ➕ Nuevo
          </Button>
        </div>
      </div>

      <Card className="p-0">
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
                  <TableRow>
                    <TableHead>Años</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Prima vac. (%)</TableHead>
                    <TableHead>Días extra</TableHead>
                    <TableHead>Prima extra (%)</TableHead>
                    <TableHead>Total días</TableHead>
                    <TableHead>Total prima (%)</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{r.anios}</TableCell>
                      <TableCell>{r.dias}</TableCell>
                      <TableCell>{num(r.prima_vacacional, 2)}</TableCell>
                      <TableCell>{num(r.dias_extras, 0)}</TableCell>
                      <TableCell>{num(r.prima_extra, 2)}</TableCell>
                      <TableCell>{num(r.total_dias, 0)}</TableCell>
                      <TableCell>{num(r.total_prima, 2)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#93c5fd] text-[#2563eb] hover:bg-[#dbeafe] hover:text-[#1e40af]"
                            onClick={() => openEdit(r)}
                          >
                            ✏️ Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#fca5a5] text-[#dc2626] hover:bg-[#fee2e2]"
                            onClick={() => setDeleteRow(r)}
                          >
                            🗑️ Eliminar
                          </Button>
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
        <DialogContent className={`${styles.vacacionesTheme} max-w-lg`}>
          <DialogHeader>
            <DialogTitle>
              {editRow ? "Editar vacaciones por ley" : "Nueva vacaciones por ley"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase text-slate-500">Años</div>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                type="number"
                value={form.anios}
                onChange={(e) => setForm((f) => ({ ...f, anios: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-[11px] uppercase text-slate-500">Días</div>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                type="number"
                value={form.dias}
                onChange={(e) => setForm((f) => ({ ...f, dias: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-[11px] uppercase text-slate-500">Prima vac. (%)</div>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                type="number"
                step="0.01"
                value={form.prima_vacacional}
                onChange={(e) => setForm((f) => ({ ...f, prima_vacacional: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-[11px] uppercase text-slate-500">Días extra</div>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                type="number"
                value={form.dias_extras}
                onChange={(e) => setForm((f) => ({ ...f, dias_extras: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-[11px] uppercase text-slate-500">Prima extra (%)</div>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                type="number"
                step="0.01"
                value={form.prima_extra}
                onChange={(e) => setForm((f) => ({ ...f, prima_extra: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] uppercase text-slate-500">Total días</div>
                <div className="h-9 px-3 py-2 text-sm border rounded-md bg-slate-50">
                  {total_dias}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase text-slate-500">Total prima (%)</div>
                <div className="h-9 px-3 py-2 text-sm border rounded-md bg-slate-50">
                  {total_prima.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="bg-white border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)] transition-all hover:-translate-y-0.5"
            >
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación (estilo consistente con UI) */}
      <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow
                ? `Esta acción eliminará la regla de "${deleteRow.anios}" años. No podrás deshacerla.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-[#ef4444] hover:bg-[#dc2626]">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


