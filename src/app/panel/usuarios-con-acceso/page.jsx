"use client";

import Cookies from "js-cookie";
import axios from "@/lib/axios";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AccesosRapidos from "@/components/AccesosRapidos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TablePagination from "@/components/TablePagination";
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
import {
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react";

export default function UserAccessPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth();
  const token = Cookies.get("token");

  const [openConfirm, setOpenConfirm] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [accesoSeleccionado, setAccesoSeleccionado] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    contrasenia: "",
    estado: "Activo",
  });

  const fetcherWithToken = (url) =>
    axios
      .get(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => res.data);

  const { data, isLoading, mutate } = useSWR(
    `/checador/users/access?page=${page}&limit=${limit}&search=${debouncedSearch}`,
    fetcherWithToken,
  );

  const accesos = data?.data || [];
  const total = data?.total || 0;

  const abrirCrear = () => {
    setAccesoSeleccionado(null);
    setForm({
      nombre: "",
      correo: "",
      contrasenia: "",
      estado: "Activo",
    });
    setOpenForm(true);
  };

  const abrirEditar = (acceso) => {
    setAccesoSeleccionado(acceso);
    setForm({
      nombre: acceso.nombre,
      correo: acceso.correo,
      contrasenia: "",
      estado: acceso.estado,
    });
    setOpenForm(true);
  };

  const handleChange = (e) => {
    const field = e.target.dataset.field;
    setForm({ ...form, [field]: e.target.value });
  };

  const validarFormulario = () => {
    if (!form.nombre.trim()) {
      enqueueSnackbar("El nombre es obligatorio", { variant: "warning" });
      return false;
    }

    if (!form.correo.trim()) {
      enqueueSnackbar("El correo es obligatorio", { variant: "warning" });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.correo)) {
      enqueueSnackbar("El correo no tiene un formato válido", {
        variant: "warning",
      });
      return false;
    }

    if (!accesoSeleccionado) {
      if (!form.contrasenia.trim()) {
        enqueueSnackbar("La contraseña es obligatoria", {
          variant: "warning",
        });
        return false;
      }

      if (form.contrasenia.length < 6) {
        enqueueSnackbar("La contraseña debe tener al menos 6 caracteres", {
          variant: "warning",
        });
        return false;
      }
    }

    if (accesoSeleccionado && form.contrasenia.trim()) {
      if (form.contrasenia.length < 6) {
        enqueueSnackbar("La contraseña debe tener al menos 6 caracteres", {
          variant: "warning",
        });
        return false;
      }
    }

    return true;
  };

  const guardarAcceso = async () => {
    if (!validarFormulario()) return;

    try {
      if (accesoSeleccionado) {
        await axios.put(
          `/checador/users/access/${accesoSeleccionado.id_acceso}`,
          {
            nombre: form.nombre,
            correo: form.correo,
            contrasenia: form.contrasenia || undefined,
            estado: form.estado,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        enqueueSnackbar("Acceso actualizado correctamente", {
          variant: "success",
        });
      } else {
        await axios.post(
          "/checador/users/access",
          {
            nombre: form.nombre,
            correo: form.correo,
            contrasenia: form.contrasenia,
            rol: "Recruiter",
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        enqueueSnackbar("Acceso creado correctamente", {
          variant: "success",
        });
      }

      setOpenForm(false);
      mutate();
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.error || "Error al guardar acceso",
        { variant: "error" },
      );
    }
  };

  const confirmarEliminar = (acceso) => {
    setAccesoSeleccionado(acceso);
    setOpenConfirm(true);
  };

  const eliminarAcceso = async () => {
    try {
      await axios.delete(
        `/checador/users/access/${accesoSeleccionado.id_acceso}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      enqueueSnackbar("Acceso eliminado correctamente", {
        variant: "success",
      });

      mutate();
      setOpenConfirm(false);
      setAccesoSeleccionado(null);
    } catch {
      enqueueSnackbar("No se pudo eliminar el acceso", {
        variant: "error",
      });
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 space-y-6">
      {/* Header ADAMIA */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="bg-[#2563EB] p-2.5 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Usuarios con acceso
              </h1>
              <p className="text-sm text-gray-600">
                Administra usuarios que pueden acceder al sistema.
              </p>
            </div>
          </div>
          <Button
            onClick={abrirCrear}
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
          >
            <Plus className="h-4 w-4" /> Nuevo acceso
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={abrirCrear}
          className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
        >
          <Plus className="h-4 w-4" /> Nuevo acceso
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-blue-100 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base font-bold text-blue-700 flex items-center gap-2">
            <Search className="h-4 w-4" /> Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-2 md:items-end">
            <div className="w-full md:max-w-sm">
              <Label className="text-sm text-gray-700">Nombre o correo</Label>
              <div className="relative mt-1">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por nombre o correo"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
            </div>
            <div className="w-full md:w-auto md:ml-auto">
              <Button
                variant="outline"
                className="w-full md:w-auto border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => setSearchInput("")}
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Limpiar búsqueda
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="p-0 overflow-hidden border-gray-100">
        <CardHeader className="border-b border-gray-100 bg-white pb-4">
          <CardTitle className="text-sm font-bold text-gray-900">
            Lista de usuarios
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Nombre
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Correo
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Estado
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-sm text-gray-600"
                    >
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : accesos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-10 text-sm text-gray-600"
                    >
                      {debouncedSearch
                        ? "No se encontraron resultados para tu búsqueda."
                        : "No hay usuarios registrados."}
                    </TableCell>
                  </TableRow>
                ) : (
                  accesos.map((acceso) => {
                    const esMiAcceso = acceso.correo === dataUser?.correo;
                    const activo =
                      String(acceso.estado || "").toLowerCase() === "activo";

                    return (
                      <TableRow
                        key={acceso.id_acceso}
                        className="hover:bg-zinc-50"
                      >
                        <TableCell className="font-medium text-gray-900">
                          {acceso.nombre}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {acceso.correo}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              activo
                                ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"
                                : "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700"
                            }
                          >
                            {acceso.estado || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                              title={
                                esMiAcceso
                                  ? "No puedes editar tu propio acceso"
                                  : "Editar"
                              }
                              disabled={esMiAcceso}
                              onClick={() => abrirEditar(acceso)}
                            >
                              <Pencil className="h-4 w-4 text-[#2563EB]" />
                            </button>
                            <button
                              className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                              title={
                                esMiAcceso
                                  ? "No puedes eliminar tu propio acceso"
                                  : "Eliminar"
                              }
                              disabled={esMiAcceso}
                              onClick={() => confirmarEliminar(acceso)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TablePagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-lg">
          <DialogHeader className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                <User className="size-5 text-white" />
              </span>
              {accesoSeleccionado ? "Editar acceso" : "Nuevo acceso"}
            </DialogTitle>
            <p className="text-sm text-white/80">
              Crea o actualiza usuarios con acceso al sistema.
            </p>
          </DialogHeader>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-sm text-blue-900 flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-blue-700" />
                Usa un correo válido; se utiliza para iniciar sesión y
                notificaciones.
              </AlertDescription>
            </Alert>

            <form autoComplete="off" className="space-y-3">
              <Input
                placeholder="Nombre"
                name="nombre_acceso"
                data-field="nombre"
                autoComplete="off"
                value={form.nombre}
                onChange={handleChange}
                required
                minLength={2}
                className="bg-white"
              />

              <Input
                placeholder="Correo"
                type="email"
                name="correo_acceso"
                data-field="correo"
                autoComplete="off"
                value={form.correo}
                onChange={handleChange}
                required
                className="bg-white"
              />

              <Input
                placeholder={
                  accesoSeleccionado
                    ? "Nueva contraseña (opcional)"
                    : "Contraseña"
                }
                type="password"
                name="password_acceso"
                data-field="contrasenia"
                autoComplete="new-password"
                value={form.contrasenia}
                onChange={handleChange}
                required={!accesoSeleccionado}
                minLength={5}
                className="bg-white"
              />

              {accesoSeleccionado && (
                <div className="space-y-2">
                  <Label>Estado</Label>

                  <Select
                    value={form.estado}
                    onValueChange={(value) =>
                      setForm({ ...form, estado: value })
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form>
          </div>

          <DialogFooter className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <X className="h-4 w-4 mr-2" /> Cancelar
            </Button>
            <Button
              onClick={guardarAcceso}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              <Save className="h-4 w-4 mr-2" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={openConfirm} onOpenChange={setOpenConfirm}>
        <AlertDialogContent className="p-0 overflow-hidden sm:max-w-lg">
          <div className="p-5 bg-gradient-to-r from-red-600 to-red-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-base font-bold text-white">
                <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                  <Trash2 className="size-5 text-white" />
                </span>
                Eliminar acceso
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-red-100">
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>

          <div className="p-5">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-sm text-red-800">
                ¿Seguro que deseas eliminar el acceso de{" "}
                <strong>{accesoSeleccionado?.correo}</strong>?
              </AlertDescription>
            </Alert>
          </div>

          <AlertDialogFooter className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
            <AlertDialogCancel className="border border-gray-300 text-gray-700 hover:bg-gray-100">
              <X className="h-4 w-4 mr-2" /> Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarAcceso}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
