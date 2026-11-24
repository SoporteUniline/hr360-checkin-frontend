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
import { BookOpen, Info } from "lucide-react";
import { ALCANCES, ALCANCE_TXT, GOCES, HORAS, claveDesdeNombre, normalizarTipo } from "@/lib/asistencia/tiposGoce.mjs";

export default function TipoRegistroFormDialog({
  open,
  setOpen,
  editRegistro,
  registros = [],
  mutateKey,
  empresas = [],
  id_empresa_defecto,
  empresaConfig = "",
  nombreEmpresaConfig = "",
  variasEmpresas = false,
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
    alcance: "dia",
    horas_no_trabajadas: null,
    cambia_al_aplicar: 1,
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (editRegistro) {
      const t = normalizarTipo(editRegistro);
      setForm({
        ...editRegistro,
        alcance: t.alcance,
        horas_no_trabajadas: t.horas,
        goce_sueldo: t.goce === "con" ? 1 : 0,
        cambia_al_aplicar: t.cambia ? 1 : 0,
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
        alcance: "dia",
        horas_no_trabajadas: null,
        cambia_al_aplicar: 1,
      });
    }
    setError("");
  }, [editRegistro, open, id_empresa_defecto]);

  // Tipos base (del sistema, compartidos por todas las empresas): nombre, clave y alcance en solo lectura; goce, horas y
  // «se cambia al aplicar» se guardan como configuración de la empresa (PUT solo con esos campos).
  const delSistema = Boolean(editRegistro && (editRegistro.es_base != null ? editRegistro.es_base : editRegistro.id <= 18));
  const parcial = form.alcance !== "dia";
  const cambiarAlcance = (v) => setForm((prev) => ({ ...prev, alcance: v,
    horas_no_trabajadas: v === "dia" ? null : prev.horas_no_trabajadas || "reponen" }));

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    // Un tipo del sistema es global (sin empresa): solo se configura cómo se paga.
    if (!String(form.nombre ?? "").trim() || (!form.id_empresa && !delSistema)) {
      setError("Nombre y empresa son obligatorios.");
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

      const config = {
        goce_sueldo: Number(form.goce_sueldo) ? 1 : 0,
        horas_no_trabajadas: parcial ? form.horas_no_trabajadas || "reponen" : null,
        cambia_al_aplicar: Number(form.cambia_al_aplicar) ? 1 : 0,
      };
      const { clave: _clave, aplica_a_empresa: _aplica, ...sinClave } = form;
      await axios[method](url, delSistema ? { ...config, ...(variasEmpresas && empresaConfig ? { id_empresa: Number(empresaConfig) } : {}) } : {
        ...sinClave,
        goce_sueldo: Number(form.goce_sueldo) ? 1 : 0,
        alcance: form.alcance,
        horas_no_trabajadas: parcial ? form.horas_no_trabajadas || "reponen" : null,
        cambia_al_aplicar: Number(form.cambia_al_aplicar) ? 1 : 0,
      });

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
      <DialogContent className="p-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="p-5 bg-brand text-white">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-white/15">
              <BookOpen className="size-5 text-white" />
            </span>
            {editRegistro
              ? "Editar tipo de registro"
              : "Nuevo tipo de registro"}
          </DialogTitle>
          <p className="text-sm text-white/80">
            Configura cómo se comporta este registro en asistencias/permisos.
          </p>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 flex gap-2">
            <Info className="h-4 w-4 mt-0.5 text-blue-700" />
            <div>
              Cambios en este catálogo impactan filtros y cálculos en módulos
              como <b>Asistencias</b>, <b>Permisos</b> y <b>Vacaciones</b>.
            </div>
          </div>
          {/* SECCIÓN 1: IDENTIFICACIÓN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="clave">Clave del Registro</Label>
              {/* La genera el sistema a partir del nombre (backend services/claveTipo.js) y no se edita. */}
              <Input
                id="clave"
                readOnly
                disabled
                value={editRegistro ? form.clave : claveDesdeNombre(form.nombre) || "Se genera con el nombre"}
              />
              <p className="text-[12px] text-slate-500">{editRegistro ? "La clave no se edita." : "Se genera sola con el nombre."}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                disabled={delSistema}
                placeholder="Ingrese nombre"
                value={form.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="desc">Descripción</Label>
              <Input
                id="desc"
                disabled={delSistema}
                placeholder="Ingrese la descripción (Opcional)"
                value={form.descripcion}
                onChange={(e) => handleChange("descripcion", e.target.value)}
              />
            </div>
          </div>

          {/* SECCIÓN 2: ASIGNACIÓN (un tipo del sistema no tiene empresa propietaria) */}
          {delSistema ? null : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>}

          {/* SECCIÓN 3: QUÉ ABARCA Y CUÁNTO SE PAGA (mockup Tipos.dc.html) */}
          <div data-seccion-goce className="space-y-3 rounded-lg border border-slate-200 p-4">
            <p className="text-[13.5px] font-semibold text-slate-800">Qué abarca y cuánto se paga</p>
            {delSistema ? (
              <p data-config-empresa className="rounded-md bg-blue-50 px-3 py-2 text-[12.5px] text-blue-900">
                Configuración de tu empresa{nombreEmpresaConfig ? ` (${nombreEmpresaConfig})` : ""} (el tipo es del sistema).
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoSelect id="alcance" etiqueta="Abarca" value={form.alcance} onChange={cambiarAlcance} disabled={delSistema}
                opciones={ALCANCES.map((a) => [a, ALCANCE_TXT[a]])} />
              <CampoSelect id="goce" etiqueta="Goce del día" value={Number(form.goce_sueldo) ? "con" : "sin"}
                onChange={(v) => handleChange("goce_sueldo", v === "con" ? 1 : 0)} opciones={GOCES} />
              {parcial ? (
                <CampoSelect id="horas" etiqueta="Horas no trabajadas" value={form.horas_no_trabajadas || "reponen"}
                  onChange={(v) => handleChange("horas_no_trabajadas", v)} opciones={HORAS} />
              ) : null}
              <label className="flex items-center gap-2 self-end pb-2 text-[13.5px] text-slate-800">
                <Checkbox id="cambia" checked={!!Number(form.cambia_al_aplicar)}
                  onCheckedChange={(v) => handleChange("cambia_al_aplicar", v ? 1 : 0)} />
                Se cambia al aplicar
              </label>
            </div>
            <p className="text-[12px] text-slate-500">
              «Se cambia al aplicar»: RH puede elegir otro goce {parcial ? "u otro trato de las horas " : ""}en cada caso.
              «Entrada antes de tiempo» y «salida después» no son permisos: los calcula el reloj.
            </p>
          </div>

          {/* SECCIÓN 4: CONFIGURACIÓN Y REGLAS (las de un tipo del sistema no se cambian) */}
          {delSistema ? null : <div>
            <Label className="text-[#37495E] font-semibold mb-3 block">
              Reglas y Comportamiento
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
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
          </div>}

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

function CampoSelect({ id, etiqueta, value, onChange, opciones, disabled = false }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        className="h-9 disabled:bg-slate-50 disabled:text-slate-500 w-full rounded-md border border-input bg-white px-2.5 text-[13.5px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </div>
  );
}
