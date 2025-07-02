"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import axiosInstance from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import Cookies from "js-cookie";
import "dayjs/locale/es"; // Importar español
import localizedFormat from "dayjs/plugin/localizedFormat";

export default function ExperienciaLaboral({ user }) {
  const token = Cookies.get("token");
  const [experiencias, setExperiencias] = useState([]);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  dayjs.locale("es");
  dayjs.extend(localizedFormat);

  const form = useForm();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (user?.experiencia_laboral) {
      setExperiencias(user.experiencia_laboral);
    }
  }, [user]);

  useEffect(() => {
    const fetchExperiencia = async () => {
      try {
        const response = await axiosInstance.get(
          `/users/experiencia/${user.id_usuario}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setExperiencias(response.data);
      } catch (error) {
        enqueueSnackbar("Error al cargar experiencia laboral", {
          variant: "error",
        });
      }
    };

    if (user?.id_usuario) {
      fetchExperiencia();
    }
  }, [user, token]);

  const onSubmit = async (data) => {
    try {
      if (editId) {
        await axiosInstance.put(`/users/experiencia/${editId}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        enqueueSnackbar("Experiencia actualizada", { variant: "success" });
      } else {
        await axiosInstance.post(
          `/users/experiencia/${user.id_usuario}`,
          data,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        enqueueSnackbar("Experiencia agregada", { variant: "success" });
      }

      reset({
        puesto: null,
        empresa: null,
        duracion: null,
        motivo_salida: null,
        fecha_inicio: null,
        fecha_fin: null,
        actividades: null,
      });
      setEditId(null);

      const updatedUser = await axiosInstance.get(
        `/users/experiencia/${user.id_usuario}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setExperiencias(updatedUser.data);
    } catch (error) {
      console.log(error);
      const msg = error.response?.data?.error || "Error al guardar experiencia";
      enqueueSnackbar(msg, { variant: "error" });
    }
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    reset({
      ...item,
      fecha_inicio: item.fecha_inicio
        ? dayjs(item.fecha_inicio).format("YYYY-MM-DD")
        : "",
      fecha_fin: item.fecha_fin
        ? dayjs(item.fecha_fin).format("YYYY-MM-DD")
        : "",
    });
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/users/experiencia/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      enqueueSnackbar("Experiencia eliminada", { variant: "success" });
      setExperiencias(experiencias.filter((e) => e.id !== id));
    } catch (err) {
      enqueueSnackbar("Error al eliminar", { variant: "error" });
    }
  };

  return (
    <section className="space-y-6">
      <div className="my-5 border-b-1 border-gray-200">
        <p className="font-semibold">Experiencia Laboral</p>
      </div>

      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <FormItem>
            <FormLabel>Puesto</FormLabel>
            <FormControl>
              <Input
                {...register("puesto", { required: "Este campo es requerido" })}
              />
            </FormControl>
            <FormMessage>{errors.puesto?.message}</FormMessage>
          </FormItem>

          <FormItem>
            <FormLabel>Empresa</FormLabel>
            <FormControl>
              <Input
                {...register("empresa", {
                  required: "Este campo es requerido",
                })}
              />
            </FormControl>
            <FormMessage>{errors.empresa?.message}</FormMessage>
          </FormItem>

          <FormItem>
            <FormLabel>Duración</FormLabel>
            <FormControl>
              <Input {...register("duracion")} />
            </FormControl>
          </FormItem>

          <FormItem>
            <FormLabel>Motivo de salida</FormLabel>
            <FormControl>
              <Input {...register("motivo_salida")} />
            </FormControl>
          </FormItem>

          <FormItem>
            <FormLabel>Fecha de inicio</FormLabel>
            <FormControl>
              <Input type="date" {...register("fecha_inicio")} />
            </FormControl>
          </FormItem>

          <FormItem>
            <FormLabel>Fecha de fin</FormLabel>
            <FormControl>
              <Input type="date" {...register("fecha_fin")} />
            </FormControl>
          </FormItem>

          <FormItem className="md:col-span-2">
            <FormLabel>Actividades</FormLabel>
            <FormControl>
              <Input {...register("actividades")} />
            </FormControl>
          </FormItem>

          <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row gap-4">
            <Button
              type="submit"
              className="w-full md:w-auto flex-1 bg-slate-700"
            >
              {editId ? "Actualizar" : "Agregar"}
            </Button>

            {editId !== null && (
              <Button
                type="button"
                variant="outline"
                className="w-full md:w-auto flex-1"
                onClick={() => {
                  reset({
                    puesto: null,
                    empresa: null,
                    duracion: null,
                    motivo_salida: null,
                    fecha_inicio: null,
                    fecha_fin: null,
                    actividades: null,
                  });
                  setEditId(null);
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Form>

      <ul className="space-y-4">
        {experiencias.map((item) => (
          <li
            key={item.id}
            className="p-4 border rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div className="flex-1 space-y-1">
              <p className="font-medium text-lg">
                {item.puesto} - {item.empresa}
              </p>

              <p className="text-sm text-gray-600">
                Del {dayjs(item.fecha_inicio).format("DD [de] MMMM [del] YYYY")}{" "}
                al {dayjs(item.fecha_fin).format("DD [de] MMMM [del] YYYY")}
              </p>

              {item.duracion && (
                <p className="text-sm text-gray-700">
                  <strong>Duración:</strong> {item.duracion}
                </p>
              )}

              {item.actividades && (
                <p className="text-sm text-gray-700">
                  <strong>Actividades:</strong> {item.actividades}
                </p>
              )}

              {item.motivo_salida && (
                <p className="text-sm text-gray-700">
                  <strong>Motivo de salida:</strong> {item.motivo_salida}
                </p>
              )}
            </div>

            <div className="flex flex-row sm:flex-col gap-2 items-end sm:items-end">
              <Button onClick={() => handleEdit(item)} variant="outline">
                Editar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteId(item.id);
                  setIsOpen(true);
                }}
              >
                Eliminar
              </Button>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Estás seguro?</DialogTitle>
                  <DialogDescription>
                    Esta acción no se puede deshacer. La experiencia será
                    eliminada permanentemente.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDelete(deleteId);
                      setIsOpen(false);
                    }}
                  >
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </li>
        ))}
      </ul>
    </section>
  );
}
