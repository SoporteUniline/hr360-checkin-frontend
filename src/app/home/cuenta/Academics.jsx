"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { useSnackbar } from "notistack";
import Cookies from "js-cookie";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Academics({ user }) {
  const niveles = [
    "Secundaria",
    "Preparatoria",
    "Licenciatura",
    "Maestría",
    "Doctorado",
    "Curso",
    "Diplomado",
    "Certificado",
  ];
  const token = Cookies.get("token");
  const [estudios, setEstudios] = useState([]);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const [isOpen, setIsOpen] = useState(false);
  const [customNivel, setCustomNivel] = useState("");

  const form = useForm({
    defaultValues: {
      nivel_educativo: "",
      institucion: "",
      carrera: "",
      anio_finalizacion: "",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = form;

  useEffect(() => {
    const fetchEstudios = async () => {
      try {
        const response = await axiosInstance.get(
          `/users/estudios/${user.id_usuario}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setEstudios(response.data);
      } catch (error) {
        enqueueSnackbar("Error al cargar estudios", { variant: "error" });
      }
    };

    if (user?.id_usuario) {
      fetchEstudios();
    }
  }, [user, token]);

  const onSubmit = async (data) => {
    try {
      if (editId) {
        await axiosInstance.put(`/users/estudios/${editId}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        enqueueSnackbar("Estudio actualizado", { variant: "success" });
      } else {
        await axiosInstance.post(`/users/estudios/${user.id_usuario}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        enqueueSnackbar("Estudio agregado", { variant: "success" });
      }

      reset({
        nivel_educativo: "",
        institucion: "",
        carrera: "",
        anio_finalizacion: "",
      });
      setEditId(null);
      const updatedUser = await axiosInstance.get(
        `/users/estudios/${user.id_usuario}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setEstudios(updatedUser.data);
    } catch (error) {
      const msg = error.response?.data?.error || "Error al guardar estudio";
      enqueueSnackbar(msg, { variant: "error" });
    }
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    reset(item);
    if (!niveles.includes(item.nivel_educativo)) {
      setCustomNivel(item.nivel_educativo);
    } else {
      setCustomNivel("");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/users/estudios/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      enqueueSnackbar("Estudio eliminado", { variant: "success" });
      setEstudios(estudios.filter((e) => e.id !== id));
    } catch (err) {
      enqueueSnackbar("Error al eliminar", { variant: "error" });
    }
  };

  return (
    <section className="space-y-6">
      <div className="my-5 border-b border-gray-200">
        <p className="font-semibold">Estudios Académicos</p>
      </div>

      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"
        >
          <FormItem>
            <FormLabel>Nivel educativo</FormLabel>
            <Controller
              name="nivel_educativo"
              control={form.control}
              rules={{ required: "Este campo es requerido" }}
              render={({ field }) => {
                const isOtro =
                  field.value === "Otro" ||
                  (field.value && !niveles.includes(field.value));

                return (
                  <>
                    <FormControl>
                      <Select
                        value={
                          niveles.includes(field.value)
                            ? field.value
                            : field.value
                            ? "Otro"
                            : ""
                        }
                        onValueChange={(value) => {
                          if (value === "Otro") {
                            setCustomNivel("");
                            field.onChange("Otro");
                          } else {
                            setCustomNivel("");
                            field.onChange(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un nivel" />
                        </SelectTrigger>
                        <SelectContent>
                          {niveles.map((nivel) => (
                            <SelectItem key={nivel} value={nivel}>
                              {nivel}
                            </SelectItem>
                          ))}
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>

                    {isOtro && (
                      <div className="mt-2">
                        <Input
                          placeholder="Especifica el nivel educativo"
                          value={customNivel}
                          onChange={(e) => {
                            const customValue = e.target.value;
                            setCustomNivel(customValue);
                            field.onChange(customValue);
                          }}
                        />
                      </div>
                    )}
                  </>
                );
              }}
            />
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel>Institución</FormLabel>
            <FormControl>
              <Input
                {...register("institucion", {
                  required: "Este campo es requerido",
                })}
              />
            </FormControl>
            <FormMessage>{errors.institucion?.message}</FormMessage>
          </FormItem>

          <FormItem>
            <FormLabel>Área de estudio</FormLabel>
            <FormControl>
              <Input {...register("carrera")} />
            </FormControl>
          </FormItem>

          <FormItem>
            <FormLabel>Año de finalización</FormLabel>
            <FormControl>
              <Input type="number" {...register("anio_finalizacion")} />
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
                    nivel_educativo: "",
                    institucion: "",
                    carrera: "",
                    anio_finalizacion: "",
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
        {estudios.map((item) => (
          <li
            key={item.id}
            className="p-4 border rounded-lg shadow-sm flex justify-between items-center"
          >
            <div>
              <p className="font-medium">
                {item.nivel_educativo} - {item.institucion}
              </p>
              <p className="text-sm text-gray-600">
                {item.carrera} ({item.anio_finalizacion})
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleEdit(item)} variant="outline">
                Editar
              </Button>
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleteId(item.id);
                    setIsOpen(true);
                  }}
                >
                  Eliminar
                </Button>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>¿Estás seguro?</DialogTitle>
                      <DialogDescription>
                        Esta acción no se puede deshacer. El estudio será
                        eliminado permanentemente.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                      >
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
              </>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
