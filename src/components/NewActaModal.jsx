"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useSnackbar } from "notistack";
import { useForm } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import { FormLabelWithAsterisk } from "./FormLabelWithAsterisk";
import { Combobox } from "./Combobox";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "@/lib/axios";
import { useState } from "react";
import { PlusIcon } from "lucide-react";
import NewTipoActaModal from "./NewTipoActaModal";

const schema = z.object({
  empleado: z.string().min(1, "Selecciona un empleado"),
  tipoActa: z.string().min(1, "Selecciona un tipo de acta"),
  fechaIncidente: z.string().min(1, "La fecha es obligatoria"),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  sancion: z.string().min(1, "Selecciona una sanción"),
  elabora: z.string().min(1, "Selecciona quién elabora"),

  horaIncidente: z.string().optional(),
  lugar: z.string().optional(),
  testigos: z.string().optional(),
  cargoElabora: z.string().optional(),
  descargo: z.string().optional(),
  aceptaHechos: z.boolean(),
  esReincidencia: z.boolean(),
});

const NewActaModal = ({
  open,
  onClose,
  empleados,
  tiposActa,
  refetch,
  dataUser,
  mutateTiposActa,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openNewTipoActa, setOpenNewTipoActa] = useState(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      empleado: "",
      tipoActa: "",
      fechaIncidente: "",
      horaIncidente: "",
      lugar: "",
      descripcion: "",
      testigos: "",
      sancion: "",
      elabora: "",
      cargoElabora: "",
      descargo: "",
      aceptaHechos: false,
      esReincidencia: false,
    },
  });

  const onSubmit = async (values) => {
    try {
      setIsSubmitting(true);

      const body = {
        id_empresa: dataUser?.id_empresa,

        id_empleado: values.empleado,
        id_tipo_acta: values.tipoActa,

        fecha_incidente: values.fechaIncidente,
        hora_incidente: values.horaIncidente || null,
        lugar_incidente: values.lugar || null,

        descripcion_hechos: values.descripcion,
        testigos: values.testigos || null,

        tipo_sancion: values.sancion,
        dias_suspension: null,

        descargo_trabajador: values.descargo || null,
        acepta_hechos: values.aceptaHechos,
        id_elabora: values.elabora,
        nombre_cargo_elabora: values.cargoElabora || null,

        es_reincidencia: values.esReincidencia,
        id_acta_previa: null,
      };

      await axios.post("/checador/administrativeMinutes/create", body);

      enqueueSnackbar("Acta creada correctamente", { variant: "success" });

      form.reset();
      await refetch?.();
      onClose(false);
    } catch (error) {
      console.error("Error al crear el acta:", error);

      enqueueSnackbar(
        error?.response?.data?.message || "Hubo un error al crear el acta",
        { variant: "error" }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose(false);
  };

  const formatearTexto = (str) => {
    if (!str) return "";
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className={twMerge("sm:max-w-xl md:max-w-2xl lg:max-w-3xl")}
        >
          <DialogHeader className="border-b-2 pb-2">
            <DialogTitle className="text-md text-gray-700">
              📋 Nueva Acta Administrativa
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="text-sm space-y-2 pt-2 max-h-[60vh] overflow-y-auto px-1"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <FormField
                  control={form.control}
                  name="empleado"
                  render={({ field }) => {
                    const options = empleados?.data?.map((emp) => ({
                      value: emp.id_empleado.toString(),
                      label: `${emp.nombre} ${emp.apellido_paterno} ${emp.apellido_materno}`,
                    }));

                    return (
                      <FormItem>
                        <FormLabelWithAsterisk
                          required
                          className="text-gray-600"
                        >
                          Empleado
                        </FormLabelWithAsterisk>

                        <FormControl>
                          <Combobox
                            options={options}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Selecciona un empleado"
                            emptyText="No se encontraron empleados"
                            name="empleado"
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="tipoActa"
                  render={({ field }) => {
                    const options =
                      tiposActa?.map((tipo) => ({
                        value: tipo.id_tipo_acta.toString(),
                        label: `${tipo.nombre_tipo} (ID ${tipo.id_tipo_acta})`,
                      })) ?? [];

                    return (
                      <FormItem>
                        <FormLabelWithAsterisk
                          required
                          className="text-gray-600"
                        >
                          Tipo de Acta
                        </FormLabelWithAsterisk>

                        <FormControl>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Combobox
                                options={options}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Selecciona un tipo de acta"
                                emptyText="No se encontraron tipos"
                                name="tipoActa"
                              />
                            </div>

                            <Button
                              type="button"
                              className="bg-slate-700 hover:bg-slate-800 p-2"
                              onClick={() => setOpenNewTipoActa(true)}
                            >
                              <PlusIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="fechaIncidente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithAsterisk required className="text-gray-600">
                        Fecha del incidente
                      </FormLabelWithAsterisk>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horaIncidente"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-gray-600">
                        Hora del incidente
                      </Label>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lugar"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <Label className="text-gray-600">
                        Lugar del incidente
                      </Label>
                      <FormControl>
                        <Input placeholder="Ej: Oficina, Almacén" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabelWithAsterisk required className="text-gray-600">
                        Descripción de los hechos
                      </FormLabelWithAsterisk>
                      <FormControl>
                        <Textarea
                          placeholder="Describe detalladamente lo sucedido..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testigos"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <Label className="text-gray-600">Testigos</Label>
                      <FormControl>
                        <Textarea
                          placeholder="Nombres de testigos presentes (Opcional)"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sancion"
                  render={({ field }) => {
                    const sanciones = [
                      "amonestacion_verbal",
                      "amonestacion_escrita",
                      "suspension",
                      "rescision",
                    ];

                    return (
                      <FormItem>
                        <FormLabelWithAsterisk
                          required
                          className="text-gray-600"
                        >
                          Tipo de sanción
                        </FormLabelWithAsterisk>

                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una sanción" />
                            </SelectTrigger>

                            <SelectContent>
                              {sanciones.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {formatearTexto(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="elabora"
                  render={({ field }) => {
                    const options = empleados.data.map((emp) => ({
                      value: emp.id_empleado.toString(),
                      label: `${emp.nombre} ${emp.apellido_paterno} ${emp.apellido_materno}`,
                    }));

                    return (
                      <FormItem>
                        <FormLabelWithAsterisk
                          required
                          className="text-gray-600"
                        >
                          Elabora el acta
                        </FormLabelWithAsterisk>

                        <FormControl>
                          <Combobox
                            options={options}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Selecciona quien elabora"
                            emptyText="No se encontraron empleados"
                            name="elabora"
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="cargoElabora"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <Label className="text-gray-600">
                        Cargo de quien elabora
                      </Label>
                      <FormControl>
                        <Input placeholder="Ej: Jefe de RH" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descargo"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <Label className="text-gray-600">
                        Descargo del trabajador
                      </Label>
                      <FormControl>
                        <Textarea
                          placeholder="Versión del empleado (opcional)"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aceptaHechos"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 border p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-7 w-11 [&>span]:size-5.5 
             data-[state=checked]:bg-emerald-500 
             data-[state=unchecked]:bg-gray-300"
                        />
                        <div>
                          <Label>El trabajador acepta los hechos</Label>
                          <p className="text-xs text-gray-500 mt-1">
                            Marca si el empleado reconoce los hechos descritos
                          </p>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="esReincidencia"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 flex items-center gap-3 border p-3 rounded-lg">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="h-7 w-11 [&>span]:size-5.5 
             data-[state=checked]:bg-emerald-500 
             data-[state=unchecked]:bg-gray-300"
                      />

                      <div>
                        <Label>Es reincidencia</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Marca si el empleado ya tiene actas previas similares
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" type="button" onClick={handleClose}>
                  Cancelar
                </Button>

                <Button
                  className="bg-slate-700 hover:bg-slate-800"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creando..." : "💾 Crear Acta"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <NewTipoActaModal
        open={openNewTipoActa}
        onClose={setOpenNewTipoActa}
        refetch={mutateTiposActa}
        idEmpresa={dataUser?.id_empresa}
        mutateTiposActa={mutateTiposActa}
      />
    </>
  );
};

export default NewActaModal;
