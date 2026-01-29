"use client";

import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ImageUpload({
  imagePreview,
  setImagePreview,
  setSelectedFile,
  soloLectura = false, // 👈 NUEVO
}) {
  const inputRef = useRef(null);
  const tieneImagenValida =
    imagePreview && imagePreview !== "null" && imagePreview !== "undefined";

  const handleImageChange = (e) => {
    if (soloLectura) return; // 👈 Bloquea cambios
    const file = e.target.files[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      setImagePreview(imageURL);
      setSelectedFile(file);
    }
  };

  const removeImage = () => {
    if (soloLectura) return; // 👈 Bloquea borrado
    setImagePreview(null);
    setSelectedFile(null);
  };

  return (
    <section>
      <div className="flex gap-3 flex-col justify-center">
        <div
          onClick={() => {
            if (!soloLectura) inputRef.current?.click();
          }}
          className={
            soloLectura
              ? "cursor-default flex justify-center"
              : "cursor-pointer flex justify-center"
          }
        >
          <Avatar className="w-48 h-48">
            <AvatarImage src={tieneImagenValida ? imagePreview : undefined} />
            <AvatarFallback>👤</AvatarFallback>
          </Avatar>
        </div>

        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />

        {tieneImagenValida && !soloLectura && (
          <div className="flex flex-col justify-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={removeImage}
            >
              Quitar imagen
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
