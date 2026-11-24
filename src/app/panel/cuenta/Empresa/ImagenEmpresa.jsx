"use client";

// Logo de la empresa: logo grande en cuadro, «Cambiar logo» y vista previa antes de guardar.
// Mismo guardado de siempre: PUT /empresas/:id/upload-image (campo «imagen»). También se usa en el alta de empresas del
// dashboard (keepData): ahí la guardia de Mi cuenta no aplica.
import { useEffect, useRef, useState } from "react";
import { ImageUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { obtenerIniciales } from "@/lib/utils";
import Cookies from "js-cookie";
import { useSnackbar } from "notistack";
import { mutate } from "swr";
import axiosInstance from "@/lib/axios";
import { useCambiosCuenta } from "../GuardiaCuenta";

export default function ImageEmpresa({ empresa, keepData = false }) {
  const token = Cookies.get("token");
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) {
      const imageURL = URL.createObjectURL(file);
      setImagePreview(imageURL);
      setSelectedFile(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
  };

  const onSubmit = async () => {
    if (!selectedFile) return true;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("imagen", selectedFile);

      await axiosInstance.put(
        `/empresas/${empresa.id_empresa}/upload-image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      enqueueSnackbar("Se actualizó tus imágen exitosamente!", {
        variant: "success",
      });
      await mutate(`/empresas/${empresa.id_empresa}`);
      if (!keepData) removeImage();
      setLoading(false);
      return true;
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al actualizar tu imágen";
      enqueueSnackbar(errorMessage, { variant: "error" });
      return false;
    }
  };

  useCambiosCuenta("logo-empresa", { hayCambios: Boolean(selectedFile) && !keepData, guardar: onSubmit });

  return (
    <section className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left lg:flex-col lg:text-center" data-logo-empresa>
      <Avatar className={`size-28 shrink-0 rounded-xl border bg-white ${imagePreview ? "border-amber-300" : "border-slate-200"}`}>
        <AvatarImage
          src={imagePreview || empresa?.url_imagen || ""}
          alt={`Logo de ${empresa?.nombre_empresa ?? "la empresa"}`}
          className="object-contain p-2"
        />
        <AvatarFallback className="rounded-xl bg-blue-50 text-2xl font-semibold text-brand">
          {obtenerIniciales(empresa?.nombre_empresa)}
        </AvatarFallback>
      </Avatar>
      <div className="w-full min-w-0 space-y-3">
        {imagePreview ? (
          <>
            <p className="text-[12.5px] text-amber-700">Vista previa. El logo aún no se guarda.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="min-h-11 sm:min-h-9" disabled={loading} onClick={removeImage}>
                Cancelar
              </Button>
              <Button type="button" className="min-h-11 bg-[#2563EB] font-semibold text-white hover:bg-[#1d4ed8] sm:min-h-9" disabled={loading} onClick={onSubmit}>
                {loading ? "Guardando…" : "Guardar logo"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[12.5px] text-slate-500">Aparece en tus documentos y reportes.</p>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="min-h-11 w-full font-semibold text-slate-700 sm:min-h-9">
              <ImageUp className="size-4" aria-hidden="true" />
              Cambiar logo
            </Button>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" tabIndex={-1} aria-hidden="true" onChange={handleImageChange} data-input-logo />
      </div>
    </section>
  );
}
