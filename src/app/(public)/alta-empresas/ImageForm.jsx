"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TEXTO_PREPARANDO, usePrepararFoto } from "@/lib/imagenes/usePrepararFoto";

export default function ImageForm({
  form,
  imagePreview,
  setImagePreview,
  setSelectedFile,
}) {
  // (27/11/2026) El logo se ajusta al elegirlo (1200 px, < 900 KB) en JPEG, o PNG si tiene transparencia —nunca WebP—
  // porque va dentro de los PDF de jsPDF (lib/pdfCompanyLogo.js).
  const { preparando, preparar } = usePrepararFoto("logo");
  const handleImageChange = async (e) => {
    const elegido = e.target.files[0];
    e.target.value = "";
    if (!elegido) return;
    const foto = await preparar(elegido);
    if (foto.error) { form.setError?.("imagen", { type: "manual", message: foto.error }); return; }
    setImagePreview(URL.createObjectURL(foto.archivo));
    setSelectedFile(foto.archivo);
    form.setValue("imagen", foto.archivo);
    form.clearErrors("imagen");
  };

  const removeImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    form.setValue("imagen", null);
  };

  return (
    <section>
      <div className="my-5 border-b-1 border-gray-200">
        <p className="font-semibold">Logo de tu empresa</p>
      </div>
      <div className="flex gap-3 space-y-2">
        <Avatar className="w-24 h-24">
          <AvatarImage
            src={imagePreview || "/assets/no-image.png"}
            alt="Avatar"
          />
          <AvatarFallback>EM</AvatarFallback>
        </Avatar>
        {imagePreview ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={removeImage}
          >
            Quitar imagen
          </Button>
        ) : (
          <Label className="cursor-pointer">
            <span className="text-sm text-[var(--adamia-blue)]" role={preparando ? "status" : undefined}>{preparando ? TEXTO_PREPARANDO : "Subir imagen"}</span>
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={preparando}
              onChange={handleImageChange}
            />
          </Label>
        )}
      </div>
      {form?.formState.errors.imagen && (
        <p className="text-sm text-red-500 mt-1">
          {form?.formState.errors.imagen.message}
        </p>
      )}
    </section>
  );
}
