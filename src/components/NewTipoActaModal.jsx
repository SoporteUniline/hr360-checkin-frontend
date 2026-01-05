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
  } = useTiposActa(idEmpresa, 1, 200, "");

  /**
   * Estado de edición:
   * - Si `editingTipo` es distinto de null, el formulario entra en modo "Editar".
   * - Esto evita crear un segundo modal y mantiene el flujo simple.
   */
  const [editingTipo, setEditingTipo] = useState(null);
  const [deletingTipo, setDeletingTipo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // Al cerrar, limpiamos el modo edición para que al reabrir siempre esté en "Crear".
    setEditingTipo(null);
    setDeletingTipo(null);
    setIsSubmitting(false);
    form.reset();
    onClose(false);
  };

  const onSubmit = async (values) => {
    try {
      if (!idEmpresa) {
        enqueueSnackbar("No se encontró la empresa en sesión (id_empresa).", { variant: "error" });
        return;
      }

      setIsSubmitting(true);

      if (editingTipo?.id_tipo_acta) {
        // Editar (PUT)
        await axios.put(`/checador/tipos-actas/${editingTipo.id_tipo_acta}`, {
          id_empresa: idEmpresa,
          ...values,
        });
        enqueueSnackbar("Tipo de acta actualizado correctamente", { variant: "success" });
      } else {
        // Crear (POST)
        await axios.post("/checador/tipos-actas/create", {
          id_empresa: idEmpresa,
          ...values,
        });
        enqueueSnackbar("Tipo de acta creado correctamente", { variant: "success" });
      }

      form.reset();
      setEditingTipo(null);

      // Refrescamos listas (local y padre) para que el nuevo tipo aparezca al instante en "Nueva Acta".
      await mutateTiposActaList?.();
      await mutateTiposActa?.();
      await refetch?.();
    } catch (err) {
      console.error("Error al guardar tipo de acta:", err);
      enqueueSnackbar(err?.response?.data?.message || "Error al guardar el tipo de acta", {
        variant: "error",
      });
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
      if (!idEmpresa) {
        enqueueSnackbar("No se encontró la empresa en sesión (id_empresa).", { variant: "error" });
        return;
      }
      if (!deletingTipo?.id_tipo_acta) return;

      setIsSubmitting(true);
      await axios.delete(`/checador/tipos-actas/${deletingTipo.id_tipo_acta}`, {
        params: { id_empresa: idEmpresa },
      });

      enqueueSnackbar("Tipo de acta eliminado correctamente", { variant: "success" });
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
        { variant: "error" }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const tiposOrdenados = useMemo(() => {
    return [...(tiposActaList || [])].sort((a, b) => (b.id_tipo_acta || 0) - (a.id_tipo_acta || 0));
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
          "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-xl md:max-w-2xl"
        )}
      >
        <DialogHeader className="border-b-2 pb-2">
          <DialogTitle className="pb-2">
            {editingTipo ? "✏️ Editar Tipo de Acta" : "➕ Nuevo Tipo de Acta"}
          </DialogTitle>
        </DialogHeader>

        {/*
          Contenedor con scroll interno:
          - Evita que el modal se salga de la pantalla en móviles.
        */}
        <div className="max-h-[75vh] overflow-y-auto pr-1">
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
              {editingTipo ? (
                <Button
                  variant="outline"
                  type="button"
                  onClick={cancelEdit}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancelar edición
                </Button>
              ) : (
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              )}

              <Button
                type="submit"
                className="bg-slate-700 hover:bg-slate-800 w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando..." : "💾 Guardar Tipo"}
              </Button>
            </div>
          </form>
        </Form>

        {/* Administración: listado + acciones.
            Relación:
            - Se usa desde `src/components/NewActaModal.jsx` (botón + al lado de Tipo de Acta).
            - Cualquier cambio aquí debe reflejarse en el Select de Tipo de Acta al crear acta. */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between gap-2 pb-2">
            <p className="font-semibold text-sm text-gray-700">📚 Tipos existentes</p>
            {loadingTiposActaList ? (
              <span className="text-xs text-gray-500">Cargando...</span>
            ) : (
              <span className="text-xs text-gray-500">{tiposOrdenados.length} registros</span>
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
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Clasificación</TableHead>
                  <TableHead>Gravedad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposOrdenados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No hay tipos de acta.
                    </TableCell>
                  </TableRow>
                ) : (
                  tiposOrdenados.map((tipo) => (
                    <TableRow key={tipo.id_tipo_acta}>
                      <TableCell className="font-medium">{tipo.nombre_tipo}</TableCell>
                      <TableCell className="capitalize">{tipo.clasificacion}</TableCell>
                      <TableCell className="capitalize">{tipo.gravedad}</TableCell>
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
                            title="Eliminar tipo"
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
      <AlertDialog open={!!deletingTipo} onOpenChange={(o) => !o && setDeletingTipo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de acta?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTipo ? (
                <>
                  Se eliminará <span className="font-semibold">{deletingTipo.nombre_tipo}</span>.{" "}
                  Si ya está asignado a actas, el sistema no permitirá eliminarlo.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
              disabled={isSubmitting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
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
