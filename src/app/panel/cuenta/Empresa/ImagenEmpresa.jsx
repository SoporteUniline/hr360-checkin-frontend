"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { obtenerIniciales } from "@/lib/utils";
import Cookies from "js-cookie";
import { useSnackbar } from "notistack";
import { mutate } from "swr";
import axiosInstance from "@/lib/axios";

export default function ImageEmpresa({ empresa, keepData = false }) {
  const token = Cookies.get("token");
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
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
    if (!selectedFile) return;
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
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al actualizar tu imágen";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  return (
    <section>
      <div className="flex gap-3 space-y-2">
        <Avatar className="w-24 h-24">
          <AvatarImage
            src={imagePreview || empresa?.url_imagen || ""}
            alt="Avatar"
          />
          <AvatarFallback>
            {obtenerIniciales(empresa?.nombre_empresa)}
          </AvatarFallback>
        </Avatar>
        {imagePreview ? (
          <div className="flex flex-col gap-3 justify-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={loading}
              onClick={removeImage}
            >
              Quitar imagen
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-slate-700"
              loading={loading}
              onClick={onSubmit}
            >
              Guardar cambios
            </Button>
          </div>
        ) : (
          <Label className="cursor-pointer">
            <span className="text-sm text-blue-600">Cambiar imagen</span>
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </Label>
        )}
      </div>
    </section>
  );
}
