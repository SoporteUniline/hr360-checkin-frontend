"use client";

import Cookies from "js-cookie";
import axios from "@/lib/axios";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
// (16/12/2026) Rol y permisos por módulo y empresas de cada acceso. Ver src/lib/permisos/permisos.mjs.
import EditorPermisos, { valorInicial } from "@/components/permisos/EditorPermisos";
import { plantilla as plantillaPorClave } from "@/lib/permisos/permisos.mjs";
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

function ResumenPermisos({ p }) {
  if (!p) return <span className="text-[13px] text-gray-400">—</span>;
  return (
    <span className="block min-w-0">
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[13px] font-semibold text-blue-800">
        {plantillaPorClave(p.plantilla)?.nombre ?? "Personalizado"}
      </span>
      <span className="mt-0.5 block text-[13px] text-gray-600">{p.resumen}</span>
    </span>
  );
}

export default function UserAccessPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth();
  const token = Cookies.get("token");
  const searchParams = useSearchParams();

  const [openConfirm, setOpenConfirm] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [accesoSeleccionado, setAccesoSeleccionado] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState(
    searchParams.get("nombre") || "",
  );
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

  // Permisos: catálogo (empresas del dueño) y resumen de cada acceso para la tabla.
  const { data: catalogo } = useSWR("/checador/permisos-acceso/catalogo", fetcherWithToken, { revalidateOnFocus: false });
  const { data: listaPermisos, mutate: mutatePermisos } = useSWR("/checador/permisos-acceso", fetcherWithToken, { revalidateOnFocus: false });
  const permisosDe = new Map((listaPermisos?.data || []).map((p) => [p.id_acceso, p]));
  const empresasDisponibles = catalogo?.empresas || [];
  const [permisosForm, setPermisosForm] = useState(valorInicial);
  const [cargandoPermisos, setCargandoPermisos] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const abrirCrear = () => {
    setAccesoSeleccionado(null);
    setForm({
      nombre: "",
      correo: "",
      contrasenia: "",
      estado: "Activo",
    });
    setPermisosForm(valorInicial());
    setOpenForm(true);
  };

  const abrirEditar = async (acceso) => {
    setAccesoSeleccionado(acceso);
    setForm({
      nombre: acceso.nombre,
      correo: acceso.correo,
      contrasenia: "",
      estado: acceso.estado,
    });
    setPermisosForm(valorInicial());
    setOpenForm(true);
    setCargandoPermisos(true);
    try {
      const { data: p } = await axios.get(`/checador/permisos-acceso/${acceso.id_acceso}`);
      setPermisosForm({ plantilla: p.plantilla, permisos: p.permisos, empresas: p.empresas || [], soloAlgunas: (p.empresas || []).length > 0 });
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.error || "No se pudieron leer los permisos de este acceso.", { variant: "error" });
    } finally {
      setCargandoPermisos(false);
    }
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

    if (permisosForm.soloAlgunas && permisosForm.empresas.length === 0) {
      enqueueSnackbar("Elige al menos una empresa o marca «Todas las empresas»", { variant: "warning" });
      return false;
    }

    return true;
  };

  const guardarPermisos = (idAcceso) =>
    axios.put(`/checador/permisos-acceso/${idAcceso}`, {
      plantilla: permisosForm.plantilla,
      permisos: permisosForm.permisos,
      empresas: permisosForm.soloAlgunas ? permisosForm.empresas : [],
    });

  const guardarAcceso = async () => {
    if (!validarFormulario()) return;
    if (cargandoPermisos || guardando) return;
    setGuardando(true);
    let creado = null;

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
        await guardarPermisos(accesoSeleccionado.id_acceso);

        enqueueSnackbar("Acceso actualizado correctamente", {
          variant: "success",
        });
      } else {
        const { data: nuevo } = await axios.post(
          "/checador/users/access",
          {
            nombre: form.nombre,
            correo: form.correo,
            contrasenia: form.contrasenia,
            rol: "Recruiter",
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        creado = nuevo;
        await guardarPermisos(nuevo.id_acceso);

        enqueueSnackbar("Acceso creado correctamente", {
          variant: "success",
        });
      }

      setOpenForm(false);
      mutate();
      mutatePermisos();
    } catch (error) {
      const motivo = error?.response?.data?.error || "Error al guardar acceso";
      if (creado) {
        // El acceso quedó creado pero sus permisos no: se abre en edición para reintentar (sin permisos = Administrador).
        enqueueSnackbar(`El acceso se creó, pero sus permisos no se guardaron: ${motivo}. Revísalos y vuelve a guardar.`, { variant: "error" });
        setAccesoSeleccionado(creado);
        setForm((f) => ({ ...f, contrasenia: "", estado: "Activo" }));
        mutate();
      } else {
        enqueueSnackbar(motivo, { variant: "error" });
      }
    } finally {
      setGuardando(false);
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
      {/* Encabezado compacto Adamia */}
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand shadow-[0_8px_18px_rgba(37,99,235,0.3)]">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
                Usuarios con acceso
              </h1>
              <p className="text-[12.5px] text-gray-500">
                Administra usuarios que pueden acceder al sistema.
              </p>
            </div>
          </div>
          <Button
            onClick={abrirCrear}
            className="h-[38px] w-full gap-2 rounded-md bg-brand font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.32)] hover:opacity-95 sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Nuevo acceso
          </Button>
        </div>
        <div className="mt-3 h-[2.5px] rounded bg-brand" />
      </div>

      {/* Filtros homologados */}
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-end">
          <div className="w-full md:max-w-sm">
            <label className="mb-1.5 block text-[11px] font-semibold text-gray-500">
              Nombre o correo
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o correo"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-[38px] rounded-md border-gray-200 bg-white pl-9 text-[13px]"
              />
            </div>
          </div>
          <div className="w-full md:ml-auto md:w-auto">
            <Button
              variant="outline"
              className="h-[38px] w-full rounded-md border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 md:w-auto"
              onClick={() => setSearchInput("")}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Limpiar búsqueda
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <Card className="hidden p-0 overflow-hidden border-gray-100 md:block">
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
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Rol y permisos
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
                      colSpan={5}
                      className="text-center py-8 text-sm text-gray-600"
                    >
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : accesos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
                        <TableCell>
                          <ResumenPermisos p={permisosDe.get(acceso.id_acceso)} />
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

      {/* Celular: tarjetas (sin scroll lateral) */}
      <ul className="space-y-2 md:hidden" aria-label="Usuarios con acceso">
        {isLoading ? (
          <li className="rounded-xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-600">Cargando...</li>
        ) : accesos.length === 0 ? (
          <li className="rounded-xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-600">
            {debouncedSearch ? "No se encontraron resultados para tu búsqueda." : "No hay usuarios registrados."}
          </li>
        ) : (
          accesos.map((acceso) => {
            const activo = String(acceso.estado || "").toLowerCase() === "activo";
            return (
              <li key={acceso.id_acceso} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-gray-900">{acceso.nombre}</p>
                    <p className="break-all text-[13px] text-gray-600">{acceso.correo}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[13px] font-semibold ${activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                    {acceso.estado || "-"}
                  </span>
                </div>
                <div className="mt-2"><ResumenPermisos p={permisosDe.get(acceso.id_acceso)} /></div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="min-h-11 gap-2 text-[13px]" onClick={() => abrirEditar(acceso)}>
                    <Pencil className="h-4 w-4 text-[#2563EB]" /> Editar
                  </Button>
                  <Button variant="outline" className="min-h-11 gap-2 border-red-200 text-[13px] text-red-700 hover:bg-red-50" onClick={() => confirmarEliminar(acceso)}>
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </Button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <TablePagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="flex max-h-[92dvh] flex-col gap-0 p-0 overflow-hidden sm:max-w-4xl">
          <DialogHeader className="p-5 bg-brand text-white">
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

          <div className="min-h-0 flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto">
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

            <div className="border-t border-gray-100 pt-4">
              {cargandoPermisos ? (
                <p role="status" className="text-sm text-gray-500">Cargando permisos…</p>
              ) : (
                <EditorPermisos valor={permisosForm} onChange={setPermisosForm} empresasDisponibles={empresasDisponibles} />
              )}
            </div>
          </div>

          <DialogFooter className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              className="min-h-11 border-gray-300 text-gray-700 hover:bg-gray-100 sm:min-h-9"
            >
              <X className="h-4 w-4 mr-2" /> Cancelar
            </Button>
            <Button
              onClick={guardarAcceso}
              disabled={guardando || cargandoPermisos}
              className="min-h-11 bg-[#2563EB] hover:bg-[#1d4ed8] text-white sm:min-h-9"
            >
              <Save className="h-4 w-4 mr-2" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={openConfirm} onOpenChange={setOpenConfirm}>
        <AlertDialogContent className="p-0 overflow-hidden sm:max-w-lg">
          <div className="p-5 bg-red-600 text-white">
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
