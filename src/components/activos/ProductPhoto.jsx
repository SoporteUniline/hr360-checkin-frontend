"use client";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivos } from "./ActivosProvider";
import { rutaDeInstancia } from "@/lib/demo-base-path.mjs";
import { ErrorFoto, prepararFoto } from "@/lib/imagenes/aWeb.mjs";

const aDataUrl = (blob) => new Promise((resolve, reject) => {
  const lector = new FileReader();
  lector.onload = () => resolve(String(lector.result));
  lector.onerror = () => reject(new Error("No se pudo leer la imagen."));
  lector.readAsDataURL(blob);
});
export function photoUrl(product, companyId) {
  return product?.photoVersion
    ? rutaDeInstancia(`/internal/control-activos/fotos/${product.id}?empresa=${companyId}&v=${product.photoVersion}`)
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
    try {
      // (27/11/2026) La conversión única de fotos (lib/imagenes/aWeb.mjs, uso «activo»): enderezada, 1000 px, WebP
      // (JPEG en Safari) y < 500 KB para que el data URL quepa en el JSON. El servidor la vuelve a optimizar (sharp).
      const foto = await prepararFoto(file, "activo");
      const data = await aDataUrl(foto.archivo);
      if (data.length > 690000)
        throw new Error(
          "La imagen sigue siendo muy grande. Elige una fotografía más sencilla."
        );
      onChange(data);
    } catch (e) {
      if (!(e instanceof ErrorFoto)) console.error("[activos] foto", e);
      setError(e.message || "No se pudo abrir la imagen.");
    } finally {
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
              accept="image/*"
              disabled={!state.catalogReady}
              onChange={choose}
              className="max-w-full text-sm"
            />
          </label>
          <p className="text-xs text-slate-500">
            {state.catalogReady
              ? "Cualquier foto (JPG, PNG, WebP o HEIC). Se optimiza sola."
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
