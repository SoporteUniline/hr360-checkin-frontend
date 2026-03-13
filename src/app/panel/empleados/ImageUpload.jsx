"use client";

import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Recorta el pixelCrop del imageSrc y lo devuelve como File
async function getCroppedFile(imageSrc, pixelCrop, fileName) {
  const img = await new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const maxDim = 800;
  const scale = Math.min(1, maxDim / pixelCrop.width, maxDim / pixelCrop.height);
  canvas.width = pixelCrop.width * scale;
  canvas.height = pixelCrop.height * scale;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(new File([blob], fileName, { type: "image/jpeg" })),
      "image/jpeg",
      0.8,
    );
  });
}

export default function ImageUpload({
  imagePreview,
  setImagePreview,
  setSelectedFile,
  soloLectura = false,
}) {
  const inputRef = useRef(null);
  const tieneImagenValida =
    imagePreview && imagePreview !== "null" && imagePreview !== "undefined";

  // Estado del cropper
  const [cropSrc, setCropSrc] = useState(null);
  const [cropFileName, setCropFileName] = useState("foto.jpg");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleImageChange = (e) => {
    if (soloLectura) return;
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ""; // permite volver a seleccionar el mismo archivo
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropFileName(file.name);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleConfirmarRecorte = async () => {
    if (!croppedAreaPixels) return;
    const file = await getCroppedFile(cropSrc, croppedAreaPixels, cropFileName);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setSelectedFile(file);
    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleCancelarRecorte = () => {
    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const removeImage = () => {
    if (soloLectura) return;
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

      {/* Modal de recorte */}
      <Dialog open={!!cropSrc} onOpenChange={(open) => { if (!open) handleCancelarRecorte(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recortar imagen</DialogTitle>
          </DialogHeader>

          <div className="relative w-full h-72 bg-gray-900 rounded-lg overflow-hidden">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="flex items-center gap-3 px-1">
            <span className="text-sm text-gray-500 shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleCancelarRecorte}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmarRecorte}>
              Aplicar recorte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
