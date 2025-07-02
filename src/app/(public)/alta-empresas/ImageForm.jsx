"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ImageForm({
  form,
  imagePreview,
  setImagePreview,
  setSelectedFile,
}) {
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      setImagePreview(imageURL);
      setSelectedFile(file);
      form.setValue("imagen", file);
      form.clearErrors("imagen");
    }
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
            <span className="text-sm text-blue-600">Subir imagen</span>
            <Input
              type="file"
              accept="image/*"
              className="hidden"
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
