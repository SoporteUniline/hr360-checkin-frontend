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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import axios from "@/lib/axios";
import { useSnackbar } from "notistack";
import { FormLabelWithAsterisk } from "./FormLabelWithAsterisk";
import useTiposActa from "@/hooks/useTiposActa";
import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useAuth } from "@/context/AuthContext";
import { Combobox } from "./Combobox";
import {
  FileText,
  Pencil,
  Trash2,
  AlertTriangle,
  Save,
  SlidersHorizontal,
} from "lucide-react";

const getSchema = (isEdit) =>
  z.object({
    empresa: isEdit
      ? z.string().optional()
      : z.string().min(1, "Selecciona una empresa"),
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
  /**
   * Estado de edición:
   * - Si `editingTipo` es distinto de null, el formulario entra en modo "Editar".
   * - Esto evita crear un segundo modal y mantiene el flujo simple.
   */
  const [editingTipo, setEditingTipo] = useState(null);
  const [deletingTipo, setDeletingTipo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(getSchema(!!editingTipo)),
    defaultValues: {
      empresa: "",
      nombre_tipo: "",
      descripcion: "",
      clasificacion: "falta",
      gravedad: "leve",
    },
  });

  const { dataUser } = useAuth();

  const empresaSeleccionada = form.watch("empresa");

  const { enqueueSnackbar } = useSnackbar();

  /**
   * Listado de tipos (para poder Editar/Eliminar dentro del mismo modal).
   * Relación:
   * - Hook: `src/hooks/useTiposActa.js` -> GET `/checador/tipos-actas`
   * - Backend: `modules/attendance/routes/tiposActasRoutes.js`
   */
  const {
    data: tiposActaList,
    isLoading: loadingTiposActaList,
    mutate: mutateTiposActaList,
  } = useTiposActa(empresaSeleccionada, 1, 200, "");

  const handleClose = () => {
    // Al cerrar, limpiamos el modo edición para que al reabrir siempre esté en "Crear".
    setEditingTipo(null);
    setDeletingTipo(null);
    setIsSubmitting(false);
    form.reset();
    onClose(false);
  };

  const onSubmit = async (values) => {
    try {
      if (!editingTipo && !empresaSeleccionada) {
        enqueueSnackbar("Selecciona una empresa", { variant: "warning" });
        return;
      }

      setIsSubmitting(true);

      if (editingTipo?.id_tipo_acta) {
        // Editar (PUT)
        await axios.put(`/checador/tipos-actas/${editingTipo.id_tipo_acta}`, {
          id_empresa: editingTipo.id_empresa,
          nombre_tipo: values.nombre_tipo,
          descripcion: values.descripcion,
          clasificacion: values.clasificacion,
          gravedad: values.gravedad,
        });

        enqueueSnackbar("Tipo de acta actualizado correctamente", {
          variant: "success",
        });
      } else {
        // Crear (POST)
        await axios.post("/checador/tipos-actas/create", {
          id_empresa: values.empresa,
          ...values,
        });

        enqueueSnackbar("Tipo de acta creado correctamente", {
          variant: "success",
        });
      }

      form.reset({
        empresa: values.empresa,
        nombre_tipo: "",
        descripcion: "",
        clasificacion: "falta",
        gravedad: "leve",
      });

      setEditingTipo(null);

      // Refrescamos listas (local y padre) para que el nuevo tipo aparezca al instante en "Nueva Acta".
      await mutateTiposActaList?.();
      await mutateTiposActa?.();
      await refetch?.();
    } catch (err) {
      console.error("Error al guardar tipo de acta:", err);
      enqueueSnackbar(
        err?.response?.data?.message || "Error al guardar el tipo de acta",
        {
          variant: "error",
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Inicia edición: precarga valores en el formulario.
   * Relación:
   * - El listado proviene de `useTiposActa` (tabla `tipos_acta_administrativa`).
   */
  const startEdit = (tipo) => {
    if (!tipo) return;
    setEditingTipo(tipo);
    form.reset({
      nombre_tipo: tipo.nombre_tipo || "",
      descripcion: tipo.descripcion || "",
      clasificacion: tipo.clasificacion || "falta",
      gravedad: tipo.gravedad || "leve",
    });
  };

  const cancelEdit = () => {
    setEditingTipo(null);
    form.reset({
      nombre_tipo: "",
      descripcion: "",
      clasificacion: "falta",
      gravedad: "leve",
    });
  };

  const confirmDelete = async () => {
    try {
      if (!deletingTipo?.id_empresa) {
        enqueueSnackbar("No se encontró la empresa del tipo de acta.", {
          variant: "error",
        });
        return;
      }

      if (!deletingTipo?.id_tipo_acta) return;

      setIsSubmitting(true);
      await axios.delete(`/checador/tipos-actas/${deletingTipo.id_tipo_acta}`, {
        params: { id_empresa: deletingTipo.id_empresa },
      });

      enqueueSnackbar("Tipo de acta eliminado correctamente", {
        variant: "success",
      });
      setDeletingTipo(null);
      if (editingTipo?.id_tipo_acta === deletingTipo.id_tipo_acta) {
        cancelEdit();
      }

      await mutateTiposActaList?.();
      await mutateTiposActa?.();
      await refetch?.();
    } catch (err) {
      console.error("Error al eliminar tipo de acta:", err);
      enqueueSnackbar(
        err?.response?.data?.message || "Error al eliminar el tipo de acta",
        { variant: "error" },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const tiposOrdenados = useMemo(() => {
    return [...(tiposActaList || [])].sort(
      (a, b) => (b.id_tipo_acta || 0) - (a.id_tipo_acta || 0),
    );
  }, [tiposActaList]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={twMerge(
          /**
           * Responsivo:
           * - En móvil ocupa casi todo el ancho.
           * - En desktop limita el ancho para mantener legibilidad.
           *
           * Relación:
           * - Este modal se abre desde `src/components/NewActaModal.jsx` (botón + en "Tipo de Acta").
           */
          "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-xl md:max-w-2xl p-0 overflow-hidden",
        )}
      >
        {/* Header - Diseño ADAMIA (patrón Contratos) */}
        <DialogHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <DialogTitle className="text-white text-lg font-semibold">
              {editingTipo ? "✏️ Editar Tipo de Acta" : "➕ Nuevo Tipo de Acta"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/*
          Contenedor con scroll interno:
          - Evita que el modal se salga de la pantalla en móviles.
        */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              {/* Información del tipo */}
              <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border border-blue-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-[#2563EB] p-2 rounded-lg">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900">
                    Información del tipo
                  </div>
                </div>

                {!editingTipo && (
                  <FormField
                    control={form.control}
                    name="empresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabelWithAsterisk required>
                          Empresa
                        </FormLabelWithAsterisk>

                        <FormControl>
                          <Combobox
                            options={(dataUser?.empresas_detalle || []).map(
                              (e) => ({
                                value: String(e.id_empresa),
                                label: e.nombre,
                              }),
                            )}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Selecciona una empresa"
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="nombre_tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithAsterisk required className="text-gray-600">
                        Nombre del tipo
                      </FormLabelWithAsterisk>
                      <FormControl>
                        <Input
                          placeholder="Ej: Falta injustificada"
                          {...field}
                        />
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
              </div>

              {/* Clasificación y gravedad */}
              <div className="bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 border border-purple-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-[#7C3AED] p-2 rounded-lg">
                    <SlidersHorizontal className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900">
                    Clasificación y gravedad
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nombre_tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabelWithAsterisk
                          required
                          className="text-gray-600"
                        >
                          Nombre del Tipo
                        </FormLabelWithAsterisk>
                        <FormControl>
                          <Input
                            placeholder="Ej: Falta injustificada"
                            {...field}
                          />
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
                </div>
              </div>

              <div className="bg-gray-50 -mx-6 px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6 border-t">
                {editingTipo ? (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={cancelEdit}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto border-gray-300"
                  >
                    {isSubmitting ? "Guardando..." : "💾 Guardar Tipo"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto border-gray-300"
                  >
                    Cancelar
                  </Button>
                )}

                <Button
                  type="submit"
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Guardando..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>

          {/* Administración: listado + acciones.
            Relación:
            - Se usa desde `src/components/NewActaModal.jsx` (botón + al lado de Tipo de Acta).
            - Cualquier cambio aquí debe reflejarse en el Select de Tipo de Acta al crear acta. */}
          <div className="pt-6 border-t">
            <div className="flex items-center justify-between gap-2 pb-2">
              <p className="font-semibold text-sm text-gray-900">
                Tipos existentes
              </p>
              {loadingTiposActaList ? (
                <span className="text-xs text-gray-500">Cargando...</span>
              ) : (
                <span className="text-xs text-gray-500">
                  {tiposOrdenados.length} registros
                </span>
              )}
            </div>

            {/*
            Responsivo:
            - En móvil, la tabla puede necesitar scroll horizontal.
            - En desktop, se mantiene dentro del borde con scroll vertical.
          */}
            <div className="max-h-[260px] overflow-y-auto overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                      Nombre
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                      Clasificación
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                      Gravedad
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiposOrdenados.length === 0 ? (
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Clasificación</TableHead>
                      <TableHead>Gravedad</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  ) : (
                    tiposOrdenados.map((tipo) => (
                      <TableRow key={tipo.id_tipo_acta}>
                        <TableCell className="font-medium">
                          {tipo.nombre_tipo}
                        </TableCell>
                        <TableCell className="capitalize">
                          {tipo.clasificacion}
                        </TableCell>
                        <TableCell className="capitalize">
                          {tipo.gravedad}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col sm:flex-row justify-end gap-2 min-w-[160px]">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-[#93c5fd] text-[#2563eb] hover:bg-[#dbeafe] hover:text-[#1e40af]"
                              onClick={() => startEdit(tipo)}
                              disabled={isSubmitting}
                              title="Editar tipo"
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-[#fecaca] text-[#b91c1c] hover:bg-[#fee2e2]"
                              onClick={() => setDeletingTipo(tipo)}
                              disabled={isSubmitting}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Confirmación de eliminación */}
      <AlertDialog
        open={!!deletingTipo}
        onOpenChange={(o) => !o && setDeletingTipo(null)}
      >
        <AlertDialogContent className="sm:max-w-[425px] p-0">
          <AlertDialogHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6" />
              <AlertDialogTitle className="text-white">
                ¿Eliminar tipo de acta?
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          <div className="p-6 space-y-4">
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-md">
              <AlertDialogDescription className="text-sm">
                {deletingTipo && (
                  <>
                    Se eliminará{" "}
                    <span className="font-semibold">
                      {deletingTipo.nombre_tipo}
                    </span>
                    . Si ya está asignado a actas, el sistema no permitirá
                    eliminarlo.
                  </>
                )}
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="bg-gray-50 p-4 flex justify-end gap-2 rounded-b-lg">
            <AlertDialogCancel
              className="border-gray-300"
              disabled={isSubmitting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default NewTipoActaModal;
