"use client";

/**
 * Página: Vacaciones por periodo (CRUD con confirmación)
 * - Lista periodos por empresa (join empleados)
 * - Crear/Editar en modal; confirmar antes de guardar cambios
 * - Eliminar con AlertDialog de confirmación
 *
 * Backend:
 * - GET    /api/checador/vacaciones-periodo?id_empresa=:id
 * - POST   /api/checador/vacaciones-periodo
 * - PUT    /api/checador/vacaciones-periodo/:id
 * - DELETE /api/checador/vacaciones-periodo/:id
 */

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TablePagination from "@/components/TablePagination";
import { useSnackbar } from "notistack";
import axiosWithBase from "@/lib/axios";
import AccesosRapidos from "@/components/AccesosRapidos";
import Cookies from "js-cookie";
import styles from "../vacaciones-theme.module.css";

export default function VacacionesPorPeriodoPage() {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const total = rows.length;
  const pageRows = useMemo(() => {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }, [rows, page, limit]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  const [form, setForm] = useState({
    id_empleado: "",
    fecha_inicio: "",
    fecha_fin: "",
    anios: "",
    dias: "",
    estado: "Activa",
  });

  // Catálogo de empleados para buscador (mismo formato que "Nuevo permiso")
  const [empleados, setEmpleados] = useState([]); // [{id, nombre}]
  const [busquedaEmp, setBusquedaEmp] = useState("");
  // Reglas de Vacaciones por ley para calcular días según años
  const [vacLey, setVacLey] = useState([]); // [{anios, dias, ...}]
  const [warningLey, setWarningLey] = useState(""); // mensaje si no existe la regla

  const fetchRows = async () => {
    if (!idEmpresa) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/vacaciones-periodo`;
      const res = await axios.get(url, { params: { id_empresa: idEmpresa } });
      setRows(res.data || []);
    } catch (e) {
      setError("Error al cargar vacaciones por periodo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [idEmpresa]);

  // Formatear fecha a dd/mm/yyyy
  const formatDMY = (iso) => {
    if (!iso) return "";
    const s = String(iso).slice(0, 10); // YYYY-MM-DD
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return s;
    return `${d}/${m}/${y}`;
  };

  // Cargar empleados cuando se abre el modal de nuevo/editar
  useEffect(() => {
    if (!dialogOpen || !idEmpresa) return;
    (async () => {
      try {
        const token = Cookies.get("token");
        const res = await axiosWithBase.get(
          `/checador/empleados/activos?empresa=${idEmpresa}&page=1&limit=1000`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const mapped = list.map((e) => ({
          id: String(e.id_empleado),
          nombre: [e.nombre, e.apellido_paterno, e.apellido_materno]
            .filter(Boolean)
            .join(" "),
        }));
        setEmpleados(mapped);
      } catch {
        setEmpleados([]);
      }
    })();
  }, [dialogOpen, idEmpresa]);

  // Cargar reglas de Vacaciones por ley al abrir el modal
  useEffect(() => {
    if (!dialogOpen || !idEmpresa) return;
    (async () => {
      try {
        const res = await axiosWithBase.get(`/checador/vacaciones-ley`, {
          params: { id_empresa: idEmpresa },
        });
        setVacLey(Array.isArray(res.data) ? res.data : []);
      } catch {
        setVacLey([]);
      }
    })();
  }, [dialogOpen, idEmpresa]);

  const openCreate = () => {
    setEditRow(null);
    setForm({
      id_empleado: "",
      fecha_inicio: "",
      fecha_fin: "",
      anios: "",
      dias: "",
      estado: "Activa",
    });
    setDialogOpen(true);
  };

  const openEdit = (r) => {
    setEditRow(r);
    setForm({
      id_empleado: r.id_empleado,
      fecha_inicio: r.fecha_inicio?.slice(0, 10) || "",
      fecha_fin: r.fecha_fin?.slice(0, 10) || "",
      anios: r.anios,
      dias: r.dias,
      estado: r.estado || "Activa",
    });
    setDialogOpen(true);
  };

  // Calcular automáticamente 'anios' y 'dias' según fechas y tabla de ley
  useEffect(() => {
    const { fecha_inicio, fecha_fin } = form;
    setWarningLey("");
    if (!fecha_inicio || !fecha_fin) return;
    // Aceptar tanto YYYY-MM-DD (inputs) como DD/MM/YYYY (posible entrada)
    const parse = (v) => {
      const d = dayjs(v, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
      return d.isValid() ? d : dayjs(v);
    };
    const start = parse(fecha_inicio).startOf("day");
    const end = parse(fecha_fin).startOf("day");
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) return;
    // Años completos transcurridos dentro del periodo (floor)
    const diffYears = Math.max(0, Math.floor(end.diff(start, "year", true)));
    // Buscar en Vacaciones por ley (coincidencia exacta de años)
    const regla = (vacLey || []).find((r) => Number(r.anios) === diffYears);
    // Evitar writes innecesarios
    setForm((f) => {
      const next = {
        ...f,
        anios: String(diffYears),
        dias: regla ? String(regla.dias) : "",
      };
      return (f.anios === next.anios && f.dias === next.dias) ? f : next;
    });
    if (!regla) {
      setWarningLey(
        `No existe una regla en "Vacaciones por ley" para ${diffYears} año(s).`
      );
    }
  }, [form.fecha_inicio, form.fecha_fin, vacLey]);

  const proceedSave = async () => {
    const payload = {
      ...form,
      id_empleado: Number(form.id_empleado),
      anios: Number(form.anios),
      dias: Number(form.dias),
    };
    try {
      const base = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/vacaciones-periodo`;
      if (editRow) {
        await axios.put(`${base}/${editRow.id}`, payload, {
          params: { id_empresa: idEmpresa },
        });
        enqueueSnackbar("Periodo actualizado correctamente", {
          variant: "success",
        });
      } else {
        await axios.post(base, payload);
        enqueueSnackbar("Periodo creado correctamente", { variant: "success" });
      }
      setDialogOpen(false);
      await fetchRows();
    } catch (e) {
      const msg = e?.response?.data?.error || "Error al guardar";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setConfirmSaveOpen(false);
    }
  };

  const handleSave = () => {
    // Validaciones básicas
    if (
      !form.id_empleado ||
      !form.fecha_inicio ||
      !form.fecha_fin ||
      form.anios === "" ||
      form.dias === ""
    ) {
      enqueueSnackbar("Todos los campos son obligatorios", {
        variant: "error",
      });
      return;
    }
    if (new Date(form.fecha_inicio) > new Date(form.fecha_fin)) {
      enqueueSnackbar("La fecha de inicio no puede ser mayor a la fecha fin", {
        variant: "error",
      });
      return;
    }
    if (Number(form.anios) < 0 || Number(form.dias) < 0) {
      enqueueSnackbar("Años y Días deben ser positivos", { variant: "error" });
      return;
    }
    setConfirmSaveOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      const base = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/vacaciones-periodo`;
      await axios.delete(`${base}/${deleteRow.id}`, {
        params: { id_empresa: idEmpresa },
      });
      enqueueSnackbar("Periodo eliminado correctamente", {
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

  // Badge por estado del periodo
  const EstadoBadge = ({ estado }) => {
    const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
    if (estado === "Activa") return <span className={base} style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>Activa</span>;
    if (estado === "Vencida") return <span className={base} style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>Vencida</span>;
    if (estado === "Usada") return <span className={base} style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Usada</span>;
    return <span className={base} style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>{estado || "—"}</span>;
  };

  return (
    <div className={`${styles.vacacionesTheme} p-4 md:p-6 space-y-4`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">
            📗 Vacaciones por periodo
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona periodos de vacaciones por empleado
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
                    <TableHead>Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Años</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">
                        {`${r.nombre} ${r.apellido_paterno || ""} ${
                          r.apellido_materno || ""
                        }`.trim()}
                      </TableCell>
                      <TableCell>{r.departamento || "-"}</TableCell>
                      <TableCell>{`${formatDMY(r.fecha_inicio)} → ${formatDMY(
                        r.fecha_fin
                      )}`}</TableCell>
                      <TableCell>{r.anios}</TableCell>
                      <TableCell>{r.dias}</TableCell>
                      <TableCell><EstadoBadge estado={r.estado} /></TableCell>
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

      {/* Modal de alta/edición */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`${styles.vacacionesTheme} max-w-lg`}>
          <DialogHeader>
            <DialogTitle>
              {editRow ? "Editar periodo" : "Nuevo periodo"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Buscador de empleado (mismo formato que 'Nuevo permiso') */}
            <div className="md:col-span-2 space-y-2">
              <div className="text-[11px] uppercase text-slate-500">
                Empleado
              </div>
              <Input
                placeholder="Buscar por nombre…"
                value={busquedaEmp}
                onChange={(e) => setBusquedaEmp(e.target.value)}
              />
              {/* Limitar a 3 elementos visibles antes de hacer scroll */}
              <div className="max-h-36 overflow-auto rounded-md border">
                <ul className="divide-y">
                  {empleados
                    .filter((e) =>
                      e.nombre
                        .toLowerCase()
                        .includes(busquedaEmp.trim().toLowerCase())
                    )
                    .map((e) => {
                      const checked = String(form.id_empleado || "") === e.id;
                      return (
                        <li
                          key={`emp-${e.id}`}
                          className="flex items-center gap-3 p-2"
                        >
                          <input
                            type="radio"
                            name="empleado_periodo"
                            className="size-4"
                            checked={checked}
                            onChange={() =>
                              setForm((f) => ({ ...f, id_empleado: e.id }))
                            }
                          />
                          <div className="min-w-0">
                            <div className="truncate">{e.nombre}</div>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
              <div className="text-xs text-muted-foreground">
                {form.id_empleado
                  ? "Empleado seleccionado"
                  : "Selecciona un empleado de la lista"}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-slate-500">
                Fecha inicio
              </div>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                type="date"
                value={form.fecha_inicio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fecha_inicio: e.target.value }))
                }
              />
            </div>
            <div>
              <div className="text-[11px] uppercase text-slate-500">
                Fecha fin
              </div>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                type="date"
                value={form.fecha_fin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fecha_fin: e.target.value }))
                }
              />
            </div>
            <div>
              <div className="text-[11px] uppercase text-slate-500">Años</div>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                type="number"
                value={form.anios}
                onChange={(e) => {
                  const nextAnios = e.target.value;
                  // Si el usuario cambia manualmente, intenta mapear días por ley
                  const regla = (vacLey || []).find(
                    (r) => String(r.anios) === String(nextAnios)
                  );
                  setForm((f) => ({
                    ...f,
                    anios: nextAnios,
                    dias: regla ? String(regla.dias) : f.dias,
                  }));
                  setWarningLey(
                    regla
                      ? ""
                      : nextAnios
                      ? `No existe una regla en "Vacaciones por ley" para ${nextAnios} año(s).`
                      : ""
                  );
                }}
              />
            </div>
            <div>
              <div className="text-[11px] uppercase text-slate-500">Días</div>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                type="number"
                value={form.dias}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dias: e.target.value }))
                }
              />
            </div>
            {warningLey ? (
              <div className="md:col-span-2 text-xs text-red-600">
                {warningLey}
              </div>
            ) : (
              <div className="md:col-span-2 text-xs text-slate-500">
                Años y días se calculan automáticamente según el rango de fechas
                y la tabla de Vacaciones por ley.
              </div>
            )}
            <div className="md:col-span-2">
              <div className="text-[11px] uppercase text-slate-500">Estado</div>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.estado}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estado: e.target.value }))
                }
              >
                <option value="Activa">Activa</option>
                <option value="Vencida">Vencida</option>
                <option value="Usada">Usada</option>
              </select>
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

      {/* Confirmación de guardar cambios */}
      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambios</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que deseas {editRow ? "actualizar" : "crear"} este
              periodo de vacaciones?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={proceedSave}
              className="bg-[#37495E] hover:bg-[#2c3a4a]"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación de eliminación */}
      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(open) => !open && setDeleteRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar periodo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow
                ? `Eliminarás el periodo ${formatDMY(
                    deleteRow.fecha_inicio
                  )} → ${formatDMY(deleteRow.fecha_fin)}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction className="bg-[#ef4444] hover:bg-[#dc2626]" onClick={confirmDelete}>
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
