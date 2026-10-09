"use client";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivos } from "./ActivosProvider";
export function photoUrl(product, companyId) {
  return product?.photoVersion
    ? `/internal/control-activos/fotos/${product.id}?empresa=${companyId}&v=${product.photoVersion}`
    : "";
}
export function ProductPhoto({ product, className = "h-12 w-12" }) {
  const { company } = useActivos();
  const src = photoUrl(product, company.id);
  return src ? (
    <img
      src={src}
      alt={product.name}
      loading="lazy"
      className={`${className} rounded-lg border border-slate-100 bg-white object-contain`}
    />
  ) : (
    <span
      aria-label="Sin fotografía"
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-300`}
    >
      <ImageIcon size={20} />
    </span>
  );
}
export function PhotoField({ form, onChange, onBusy }) {
  const { company, state } = useActivos();
  const [error, setError] = useState("");
  const src =
    form.photo === null ? "" : form.photo || photoUrl(form, company.id);
  async function choose(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    onBusy(true);
    let bitmap;
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      )
        throw new Error(
          "Selecciona una imagen JPG, PNG o WebP de hasta 10 MB."
        );
      bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1000 / bitmap.width, 1000 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext("2d")
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL("image/webp", 0.82);
      if (data.length > 690000) data = canvas.toDataURL("image/webp", 0.6);
      if (data.length > 690000)
        throw new Error(
          "La imagen sigue siendo muy grande. Elige una fotografía más sencilla."
        );
      onChange(data);
    } catch (e) {
      setError(e.message || "No se pudo abrir la imagen.");
    } finally {
      bitmap?.close();
      onBusy(false);
    }
  }
  return (
    <div className="sm:col-span-2 rounded-lg border border-slate-200 p-4">
      <p className="mb-3 text-sm font-medium">Fotografía del artículo</p>
      <div className="flex flex-wrap items-center gap-4">
        {src ? (
          <img
            src={src}
            alt="Vista previa del artículo"
            className="h-28 w-28 rounded-lg border object-contain"
          />
        ) : (
          <span className="flex h-28 w-28 items-center justify-center rounded-lg bg-slate-50 text-slate-300">
            <ImageIcon size={32} />
          </span>
        )}
        <div className="space-y-2">
          <label className="block text-sm">
            <span className="mb-2 block">Seleccionar fotografía</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!state.catalogReady}
              onChange={choose}
              className="max-w-full text-sm"
            />
          </label>
          <p className="text-xs text-slate-500">
            {state.catalogReady
              ? "JPG, PNG o WebP. Se optimiza al guardar."
              : "Fotografías pendientes de activación."}
          </p>
          {src && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!state.catalogReady}
              onClick={() => onChange(null)}
            >
              Quitar fotografía
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
