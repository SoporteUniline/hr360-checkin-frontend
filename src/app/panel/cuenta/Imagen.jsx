"use client";

// Tarjeta de identidad de Mi cuenta: avatar circular grande, nombre, correo, rol y empresa, y el
// cambio de foto con vista previa antes de guardar. Mismo guardado de siempre: PUT /users/:id/upload-image (campo «imagen»).
import { useEffect, useRef, useState } from "react";
import { Building2, Camera, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { obtenerIniciales } from "@/lib/utils";
import Cookies from "js-cookie";
import { useSnackbar } from "notistack";
import { mutate } from "swr";
import axiosInstance from "@/lib/axios";
import { useCambiosCuenta } from "./GuardiaCuenta";
import { TEXTO_PREPARANDO, usePrepararFoto } from "@/lib/imagenes/usePrepararFoto";

export default function ImageUpload({ user, rol, empresa }) {
  const token = Cookies.get("token");
  const inputRef = useRef(null);
  const elegir = () => inputRef.current?.click();
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  // (27/11/2026) La foto se convierte a WebP (1024 px, < 900 KB) al elegirla y la vista previa es la convertida.
  const { preparando, preparar } = usePrepararFoto("perfil");

  // Libera la vista previa anterior al cambiarla o al salir.
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const handleImageChange = async (e) => {
    const elegido = e.target.files[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo después de cancelar
    if (!elegido) return;
    const foto = await preparar(elegido);
    if (foto.error) { enqueueSnackbar(foto.error, { variant: "error" }); return; }
    setImagePreview(URL.createObjectURL(foto.archivo));
    setSelectedFile(foto.archivo);
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
        `/users/${user.id_usuario}/upload-image`,
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
      await mutate(`/users/${user.id_usuario}`);
      setImagePreview(null);
      setSelectedFile(null);
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

  useCambiosCuenta("foto-perfil", { hayCambios: Boolean(selectedFile), guardar: onSubmit });

  return (
    <div className="flex flex-col items-center text-center" data-tarjeta-identidad>
      <div className="relative">
        <Avatar className={`size-28 rounded-full ring-4 ${imagePreview ? "ring-amber-200" : "ring-slate-100"}`}>
          <AvatarImage src={imagePreview || user?.url_imagen || ""} alt={`Foto de ${user?.nombre ?? "perfil"}`} className="object-cover" />
          <AvatarFallback className="bg-blue-50 text-2xl font-semibold text-brand">{obtenerIniciales(user?.nombre)}</AvatarFallback>
        </Avatar>
        {!imagePreview ? (
          <button
            type="button"
            onClick={elegir}
            title="Cambiar foto"
            aria-label="Cambiar foto de perfil"
            className="absolute -bottom-1 -right-1 grid size-11 cursor-pointer place-items-center rounded-full border-2 border-white bg-brand text-white shadow-sm outline-none hover:bg-[#1d4ed8] focus-visible:ring-[3px] focus-visible:ring-brand/40"
          >
            <Camera className="size-[18px]" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <h2 className="mt-4 max-w-full break-words text-lg font-semibold text-[#080d36]">{user?.nombre || "Sin nombre"}</h2>
      {user?.correo ? <p className="max-w-full break-all text-[13px] text-slate-500">{user.correo}</p> : null}

      {(rol || empresa) ? (
        <dl className="mt-4 w-full space-y-2 border-t border-slate-100 pt-4 text-left text-[13px]">
          {rol ? (
            <div className="flex items-center gap-2.5">
              <dt className="flex shrink-0 items-center gap-2 text-slate-500"><ShieldCheck className="size-4" aria-hidden="true" />Rol</dt>
              <dd className="ml-auto min-w-0 truncate font-medium text-slate-800">{rol}</dd>
            </div>
          ) : null}
          {empresa ? (
            <div className="flex items-center gap-2.5">
              <dt className="flex shrink-0 items-center gap-2 text-slate-500"><Building2 className="size-4" aria-hidden="true" />Empresa</dt>
              <dd className="ml-auto min-w-0 truncate font-medium text-slate-800" title={empresa}>{empresa}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-4 w-full border-t border-slate-100 pt-4">
        {imagePreview ? (
          <div className="space-y-3" data-foto-pendiente>
            <p className="text-[12.5px] text-amber-700">Vista previa. La foto aún no se guarda.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="min-h-11 sm:min-h-9" disabled={loading} onClick={removeImage}>
                Cancelar
              </Button>
              <Button type="button" className="min-h-11 bg-[#2563EB] font-semibold text-white hover:bg-[#1d4ed8] sm:min-h-9" disabled={loading} onClick={onSubmit}>
                {loading ? "Guardando…" : "Guardar foto"}
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={elegir} disabled={preparando} className="min-h-11 w-full font-semibold text-slate-700 sm:min-h-9">
            <Camera className="size-4" aria-hidden="true" />
            {preparando ? <span role="status">{TEXTO_PREPARANDO}</span> : "Cambiar foto"}
          </Button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" tabIndex={-1} aria-hidden="true" onChange={handleImageChange} data-input-foto />
      </div>
    </div>
  );
}
