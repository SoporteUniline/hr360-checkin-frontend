"use client";

import Cookies from "js-cookie";
import axios from "@/lib/axios";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function UserAccessPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth();
  const token = Cookies.get("token");

  const [openConfirm, setOpenConfirm] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [accesoSeleccionado, setAccesoSeleccionado] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    contrasenia: "",
    estado: "Activo",
  });

  /* ---------------- FETCHER ---------------- */
  const fetcherWithToken = (url) =>
    axios
      .get(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => res.data);

  const {
    data: accesos = [],
    isLoading,
    mutate,
  } = useSWR("/checador/users/access", fetcherWithToken);

  /* ---------------- FORM ---------------- */
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

    // 👉 SOLO obligatoria al CREAR
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

    // 👉 Al EDITAR, solo validar si escribió algo
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
        // CREAR
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

  /* ---------------- ELIMINAR ---------------- */
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

  if (isLoading) return <p className="p-6">Cargando...</p>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Usuarios con acceso</h1>

        <Button onClick={abrirCrear}>+ Nuevo acceso</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {accesos.map((acceso) => {
            const esMiAcceso = acceso.correo === dataUser?.correo;

            return (
              <TableRow key={acceso.id_acceso}>
                <TableCell>{acceso.nombre}</TableCell>
                <TableCell>{acceso.correo}</TableCell>

                <TableCell>
                  <Badge
                    variant={
                      acceso.estado === "Activo" ? "success" : "destructive"
                    }
                  >
                    {acceso.estado}
                  </Badge>
                </TableCell>

                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={esMiAcceso}
                    onClick={() => abrirEditar(acceso)}
                  >
                    Editar
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={esMiAcceso}
                    onClick={() => confirmarEliminar(acceso)}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* ---------- MODAL CREAR / EDITAR ---------- */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accesoSeleccionado ? "Editar acceso" : "Nuevo acceso"}
            </DialogTitle>
          </DialogHeader>

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
            />

            {accesoSeleccionado && (
              <div className="space-y-2">
                <Label>Estado</Label>

                <Select
                  value={form.estado}
                  onValueChange={(value) => setForm({ ...form, estado: value })}
                >
                  <SelectTrigger>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarAcceso}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- MODAL CONFIRMAR ---------- */}
      <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar acceso</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            ¿Seguro que deseas eliminar el acceso de{" "}
            <strong>{accesoSeleccionado?.correo}</strong>?
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={eliminarAcceso}>
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
