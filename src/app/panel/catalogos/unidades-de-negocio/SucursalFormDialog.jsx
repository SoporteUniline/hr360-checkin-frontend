import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import axios from "axios";
import { mutate } from "swr";
import { enqueueSnackbar } from "notistack";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Camera } from "lucide-react";

export default function SucursalFormDialog({
  open,
  setOpen,
  editSuc,
  id_empresa_defecto,
  empresas = [],
  mutateKey,
}) {
  const [idEmpresaSeleccionada, setIdEmpresaSeleccionada] = useState("");
  const [logotipo, setLogotipo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    razonSocialEmpleador: "",
    rfcEmpleador: "",
    domicilioEmpleador: "",
    representanteLegal: "",
    telefono: "",
    correo: "",
  });

  useEffect(() => {
    if (open) {
      if (editSuc) {
        setForm({
          nombre: editSuc.nombre || "",
          razonSocialEmpleador: editSuc.razonSocialEmpleador || "",
          rfcEmpleador: editSuc.rfcEmpleador || "",
          domicilioEmpleador: editSuc.domicilioEmpleador || "",
          representanteLegal: editSuc.representanteLegal || "",
          telefono: editSuc.telefono || "",
          correo: editSuc.correo || "",
        });
        setIdEmpresaSeleccionada(editSuc.id_empresa);
        setPreviewUrl(editSuc.logotipo || "");
      } else {
        setForm({
          nombre: "",
          razonSocialEmpleador: "",
          rfcEmpleador: "",
          domicilioEmpleador: "",
          representanteLegal: "",
          telefono: "",
          correo: "",
        });
        setIdEmpresaSeleccionada(
          id_empresa_defecto === "all" ? "" : id_empresa_defecto,
        );
        setPreviewUrl("");
      }
      setLogotipo(null);
      setError("");
    }
  }, [editSuc, open, id_empresa_defecto]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogotipo(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const val = name === "rfcEmpleador" ? value.toUpperCase() : value;
    setForm((prev) => ({ ...prev, [name]: val }));
    setError("");
  };

  const handleSubmit = async () => {
    // 1. Validación de Empresa
    if (!idEmpresaSeleccionada) {
      const msg = "Seleccione una empresa.";
      setError(msg); // Mantienes el error visual en el form si gustas
      enqueueSnackbar(msg, { variant: "warning" }); // Notificación flotante
      return;
    }

    // 2. Validación de Nombre
    if (!form.nombre.trim()) {
      const msg = "El nombre es requerido.";
      setError(msg);
      enqueueSnackbar(msg, { variant: "warning" });
      return;
    }

    // (Opcional) Validación de RFC u otros campos obligatorios
    if (!form.rfcEmpleador.trim()) {
      const msg = "El RFC es obligatorio.";
      setError(msg);
      enqueueSnackbar(msg, { variant: "warning" });
      return;
    }

    const formData = new FormData();
    Object.keys(form).forEach((key) => formData.append(key, form[key]));
    formData.append("id_empresa", idEmpresaSeleccionada);
    if (logotipo) formData.append("logotipo", logotipo);

    setLoading(true);

    try {
      const url = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/sucursales`;
      const config = { headers: { "Content-Type": "multipart/form-data" } };

      if (editSuc)
        await axios.put(`${url}/${editSuc.id_sucursal}`, formData, config);
      else await axios.post(url, formData, config);

      enqueueSnackbar("Guardado correctamente", { variant: "success" });

      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey),
      );
      setOpen(false);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Error al guardar";
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: "error" }); // También para errores de servidor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] h-[90vh] md:h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="flex-none p-6 pb-4 border-b bg-white">
          <div className="flex items-start gap-4">
            <div className="relative group flex-shrink-0">
              <div className="w-14 h-14 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 flex items-center justify-center overflow-hidden shadow-sm">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    className="w-full h-full object-contain p-1"
                    alt="Logo"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-emerald-300" />
                )}
              </div>
              <label
                htmlFor="logo-sub"
                className="absolute -bottom-1 -right-1 bg-emerald-600 p-1 rounded-full text-white cursor-pointer shadow-lg hover:scale-110 transition-transform"
              >
                <Camera className="w-3 h-3" />
                <input
                  id="logo-sub"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold text-gray-900 leading-tight truncate">
                {editSuc ? "Editar Unidad" : "Nueva Unidad de Negocio"}
              </DialogTitle>
              <DialogDescription className="text-[11px] mt-1">
                Datos de identificación y contacto.
              </DialogDescription>
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0 w-full">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 pb-2">
              {!editSuc && id_empresa_defecto === "all" && (
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                    Empresa *
                  </Label>
                  <Combobox
                    options={empresas.map((e) => ({
                      value: e.id_empresa,
                      label: e.nombre,
                    }))}
                    value={idEmpresaSeleccionada}
                    onChange={setIdEmpresaSeleccionada}
                  />
                </div>
              )}

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                  Nombre de la Unidad *
                </Label>
                <Input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej. Matriz"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                  RFC *
                </Label>
                <Input
                  name="rfcEmpleador"
                  value={form.rfcEmpleador}
                  onChange={handleInputChange}
                  placeholder="ABC123456789"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                  Teléfono
                </Label>
                <Input
                  name="telefono"
                  value={form.telefono}
                  onChange={handleInputChange}
                  placeholder="5512345678"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                  Razón Social Empleador *
                </Label>
                <Input
                  name="razonSocialEmpleador"
                  value={form.razonSocialEmpleador}
                  onChange={handleInputChange}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                  Representante Legal
                </Label>
                <Input
                  name="representanteLegal"
                  value={form.representanteLegal}
                  onChange={handleInputChange}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                  Correo Electrónico
                </Label>
                <Input
                  name="correo"
                  type="email"
                  value={form.correo}
                  onChange={handleInputChange}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                  Domicilio Completo
                </Label>
                <Input
                  name="domicilioEmpleador"
                  value={form.domicilioEmpleador}
                  onChange={handleInputChange}
                  className="h-9 text-sm"
                />
              </div>

              {error && (
                <div className="md:col-span-2 bg-red-50 border border-red-100 rounded-md p-2 text-[11px] text-red-600 font-medium">
                  ⚠️ {error}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex-none p-4 bg-gray-50 border-t flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-gray-500 h-9 text-sm"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#2563EB] hover:bg-blue-700 text-white h-9 px-6 text-sm font-medium"
          >
            {editSuc ? "Actualizar" : "Guardar Unidad"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
