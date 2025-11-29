"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import axios from "@/lib/axios";
import { useSnackbar } from "notistack";
import { FormLabelWithAsterisk } from "./FormLabelWithAsterisk";

const schema = z.object({
  nombre_tipo: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  clasificacion: z.enum(["falta", "sancion"]),
  gravedad: z.enum(["leve", "grave"]),
});

const NewTipoActaModal = ({
  open,
  onClose,
  refetch,
  idEmpresa,
  mutateTiposActa,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre_tipo: "",
      descripcion: "",
      clasificacion: "falta",
      gravedad: "leve",
    },
  });

  const handleClose = () => {
    form.reset();
    onClose(false);
  };

  const onSubmit = async (values) => {
    try {
      await axios.post("/checador/tipos-actas/create", {
        id_empresa: idEmpresa,
        ...values,
      });

      enqueueSnackbar("Tipo de acta creado correctamente", {
        variant: "success",
      });

      form.reset();
      refetch?.();
      onClose(false);
    } catch (err) {
      enqueueSnackbar("Error al crear el tipo de acta", { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader className="border-b-2 pb-2">
          <DialogTitle className="pb-2">➕ Nuevo Tipo de Acta</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="nombre_tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabelWithAsterisk required className="text-gray-600">
                    Nombre del Tipo
                  </FormLabelWithAsterisk>
                  <FormControl>
                    <Input placeholder="Ej: Falta injustificada" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-gray-600">Descripción</Label>
                  <FormControl>
                    <Textarea
                      placeholder="Describe brevemente este tipo de acta..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clasificacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabelWithAsterisk required className="text-gray-600">
                      Clasificación
                    </FormLabelWithAsterisk>
                    <FormControl>
                      <div className="flex gap-4">
                        <label>
                          <input
                            type="radio"
                            value="falta"
                            checked={field.value === "falta"}
                            onChange={field.onChange}
                          />{" "}
                          Falta
                        </label>
                        <label>
                          <input
                            type="radio"
                            value="sancion"
                            checked={field.value === "sancion"}
                            onChange={field.onChange}
                          />{" "}
                          Sanción
                        </label>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gravedad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabelWithAsterisk required className="text-gray-600">
                      Gravedad
                    </FormLabelWithAsterisk>
                    <FormControl>
                      <div className="flex gap-4">
                        <label>
                          <input
                            type="radio"
                            value="leve"
                            checked={field.value === "leve"}
                            onChange={field.onChange}
                          />{" "}
                          Leve
                        </label>
                        <label>
                          <input
                            type="radio"
                            value="grave"
                            checked={field.value === "grave"}
                            onChange={field.onChange}
                          />{" "}
                          Grave
                        </label>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-700 hover:bg-slate-800">
                💾 Guardar Tipo
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewTipoActaModal;
