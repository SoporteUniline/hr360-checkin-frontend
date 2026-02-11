"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label"; // Importante para accesibilidad
import axios from "@/lib/axios";
import { mutate } from "swr";
import { useSnackbar } from "notistack";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/Combobox";

export default function TipoRegistroFormDialog({
  open,
  setOpen,
  editRegistro,
  registros = [],
  mutateKey,
  empresas = [],
  id_empresa_defecto,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    clave: "",
    nombre: "",
    descripcion: "",
    goce_sueldo: 0,
    cuenta_como_asistencia: 0,
    descuenta_vacaciones: 0,
    envia_asistencia_automatica: 0,
    es_permiso: 0,
    es_festivo: 0,
    aplica_a_empresa: "Todas",
    id_empresa: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (editRegistro) {
      setForm({
        ...editRegistro,
        id_empresa:
          editRegistro.id_empresa ||
          (id_empresa_defecto === "all" ? "" : id_empresa_defecto),
      });
    } else {
      setForm({
        clave: "",
        nombre: "",
        descripcion: "",
        goce_sueldo: 0,
        cuenta_como_asistencia: 0,
        descuenta_vacaciones: 0,
        envia_asistencia_automatica: 0,
        es_permiso: 0,
        es_festivo: 0,
        aplica_a_empresa: "Todas",
        id_empresa: id_empresa_defecto === "all" ? "" : id_empresa_defecto,
      });
    }
    setError("");
  }, [editRegistro, open, id_empresa_defecto]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.clave.trim() || !form.nombre.trim() || !form.id_empresa) {
      setError("Clave, nombre y empresa son obligatorios.");
      return;
    }

    const existe = registros.some(
      (reg) =>
        reg.nombre.toLowerCase() === form.nombre.toLowerCase() &&
        reg.id !== editRegistro?.id &&
        reg.id_empresa === form.id_empresa,
    );
    if (existe) {
      setError(
        "Ya existe un registro con este nombre en la empresa seleccionada.",
      );
      return;
    }

    setLoading(true);
    try {
      const url = editRegistro
        ? `/checador/tiposPermiso/${editRegistro.id}`
        : `/checador/tiposPermiso`;

      const method = editRegistro ? "put" : "post";

      await axios[method](url, form);

      enqueueSnackbar(
        `Registro ${editRegistro ? "actualizado" : "agregado"} con éxito`,
        { variant: "success" },
      );
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey),
      );
      setOpen(false);
    } catch (err) {
      // console.error(err);
      const mensajeError =
        err.response?.data?.error || "Error al procesar la solicitud";
      setError(mensajeError);
      enqueueSnackbar(mensajeError, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#2c3e50]">
            {editRegistro
              ? "Editar Tipo de Registro"
              : "Nuevo Tipo de Registro"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* SECCIÓN 1: IDENTIFICACIÓN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="clave">Clave del Registro</Label>
              <Input
                id="clave"
                placeholder="Ingrese clave"
                value={form.clave}
                onChange={(e) => handleChange("clave", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                placeholder="Ingrese nombre"
                value={form.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="desc">Descripción</Label>
              <Input
                id="desc"
                placeholder="Ingrese la descripción (Opcional)"
                value={form.descripcion}
                onChange={(e) => handleChange("descripcion", e.target.value)}
              />
            </div>
          </div>

          {/* SECCIÓN 2: ASIGNACIÓN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Empresa Propietaria</Label>
              <Combobox
                options={empresas.map((e) => ({
                  value: e.id_empresa,
                  label: e.nombre,
                }))}
                value={form.id_empresa}
                onChange={(val) => handleChange("id_empresa", Number(val))}
                disabled={!!editRegistro}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Aplica a Empresa (Visual)</Label>
              <Input
                value={form.aplica_a_empresa}
                onChange={(e) =>
                  handleChange("aplica_a_empresa", e.target.value)
                }
              />
            </div>
          </div>

          {/* SECCIÓN 3: CONFIGURACIÓN Y REGLAS */}
          <div>
            <Label className="text-[#37495E] font-semibold mb-3 block">
              Reglas y Comportamiento
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <CheckboxItem
                label="Goce de Sueldo"
                checked={form.goce_sueldo}
                onChecked={(v) => handleChange("goce_sueldo", v)}
              />
              <CheckboxItem
                label="Cuenta como Asistencia"
                checked={form.cuenta_como_asistencia}
                onChecked={(v) => handleChange("cuenta_como_asistencia", v)}
              />
              <CheckboxItem
                label="Descuenta Vacaciones"
                checked={form.descuenta_vacaciones}
                onChecked={(v) => handleChange("descuenta_vacaciones", v)}
              />
              <CheckboxItem
                label="Asistencia Automática"
                checked={form.envia_asistencia_automatica}
                onChecked={(v) =>
                  handleChange("envia_asistencia_automatica", v)
                }
              />
              <CheckboxItem
                label="Es un Permiso"
                checked={form.es_permiso}
                onChecked={(v) => handleChange("es_permiso", v)}
              />
              <CheckboxItem
                label="Día Festivo"
                checked={form.es_festivo}
                onChecked={(v) => handleChange("es_festivo", v)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3">
              <p className="text-red-700 text-xs font-medium">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#37495E] hover:bg-[#2c3a4a] min-w-30"
          >
            {loading
              ? "Guardando..."
              : editRegistro
              ? "Guardar Cambios"
              : "Crear Registro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sub-componente para limpiar el código principal
function CheckboxItem({ label, checked, onChecked }) {
  return (
    <div className="flex items-center space-x-2 bg-white p-2 rounded border border-gray-200 hover:border-blue-200 transition-colors">
      <Checkbox
        id={label}
        checked={!!checked}
        onCheckedChange={(val) => onChecked(val ? 1 : 0)}
      />
      <Label
        htmlFor={label}
        className="text-sm font-normal cursor-pointer flex-1"
      >
        {label}
      </Label>
    </div>
  );
}
