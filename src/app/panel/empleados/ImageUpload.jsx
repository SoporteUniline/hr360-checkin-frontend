"use client";

import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CALIDAD_WEBP, nombreConvertido } from "@/lib/imagenes/aWeb.mjs";
import { soportaWebp } from "@/lib/imagenes/lienzo.mjs";
import { TEXTO_PREPARANDO, usePrepararFoto } from "@/lib/imagenes/usePrepararFoto";

// Recorta el pixelCrop del imageSrc y lo devuelve como File (27/11/2026: WebP 0.82; JPEG si el navegador no codifica WebP).
// La foto del empleado es solo para verla (ficha, credencial): el rostro del checador se registra aparte con la cámara.
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

  const mime = (await soportaWebp()) ? "image/webp" : "image/jpeg";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], nombreConvertido(fileName, blob.type || mime), { type: blob.type || mime })) : reject(new Error("No se pudo recortar la foto."))),
      mime,
      mime === "image/webp" ? CALIDAD_WEBP : 0.8,
    );
  });
}

export default function ImageUpload({
  imagePreview,
  setImagePreview,
  setSelectedFile,
  soloLectura = false,
  iniciales = "",
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
  // La foto elegida se abre y endereza primero (HEIC que el navegador no abre: aviso claro) y el recorte sale de ella.
  const { preparando, preparar } = usePrepararFoto("publicacion");
  const [errorFoto, setErrorFoto] = useState("");

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleImageChange = async (e) => {
    if (soloLectura) return;
    const elegido = e.target.files[0];
    if (!elegido) return;
    e.target.value = ""; // permite volver a seleccionar el mismo archivo
    setErrorFoto("");
    const foto = await preparar(elegido);
    if (foto.error) { setErrorFoto(foto.error); return; }
    const url = URL.createObjectURL(foto.archivo);
    setCropSrc(url);
    setCropFileName(elegido.name || "foto");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleConfirmarRecorte = async () => {
    if (!croppedAreaPixels) return;
    let file;
    try { file = await getCroppedFile(cropSrc, croppedAreaPixels, cropFileName); }
    catch (e) { setErrorFoto(e.message); return; }
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

  const elegirFoto = () => {
    if (!soloLectura) inputRef.current?.click();
  };
  // Avatar de 48 px del encabezado de la ficha: tocarlo cambia la foto; con foto, un menú ofrece cambiarla o quitarla.
  const avatar = (
    <span className="relative block size-12">
      <Avatar className="size-12 cursor-[inherit] bg-slate-300">
        <AvatarImage src={tieneImagenValida ? imagePreview : undefined} alt="" className="object-cover" />
        <AvatarFallback data-chico className="bg-slate-300 text-[15px] font-bold text-slate-700">{iniciales || "?"}</AvatarFallback>
      </Avatar>
      {!soloLectura && (
        <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-white">
          <Camera className="size-2.5" />
        </span>
      )}
    </span>
  );

  return (
    <section className="shrink-0">
      {soloLectura ? (
        avatar
      ) : tieneImagenValida ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Foto: cambiar o quitar" data-foto-empleado className="block cursor-pointer rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-blue-500/50">
              {avatar}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            <DropdownMenuItem className="min-h-11 text-sm" onSelect={elegirFoto}>
              <Camera className="size-4" aria-hidden="true" /> Cambiar foto
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 text-sm text-rose-700 focus:text-rose-800" onSelect={removeImage}>
              <Trash2 className="size-4" aria-hidden="true" /> Quitar foto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button type="button" aria-label="Agregar foto" data-foto-empleado onClick={elegirFoto} className="block cursor-pointer rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-blue-500/50">
          {avatar}
        </button>
      )}

      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={preparando}
        onChange={handleImageChange}
      />
      {preparando ? <p role="status" className="mt-1 text-[13px] text-slate-600">{TEXTO_PREPARANDO}</p> : null}
      {errorFoto ? <p role="alert" className="mt-1 max-w-48 text-[13px] text-red-700">{errorFoto}</p> : null}

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
