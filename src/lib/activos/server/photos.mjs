import sharp from "sharp";
import { ensure } from "./validation.mjs";

export async function normalizePhoto(value) {
  if (value === undefined || value === null) return value;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
    value
  );
  ensure(match, "Selecciona una fotografía JPG, PNG o WebP.");
  const input = Buffer.from(match[2], "base64");
  ensure(input.length <= 524288, "La fotografía supera 512 KB.");
  let output;
  try {
    const image = sharp(input, { limitInputPixels: 16000000, animated: false });
    const metadata = await image.metadata();
    ensure(
      ["jpeg", "png", "webp"].includes(metadata.format),
      "Formato de fotografía no permitido."
    );
    ensure(
      !metadata.pages || metadata.pages === 1,
      "Selecciona una fotografía sin animación."
    );
    output = await image
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    ensure(false, "No se pudo leer la fotografía. Selecciona otra imagen.");
  }
  ensure(output.length <= 524288, "Usa una fotografía de menor tamaño.");
  return output;
}
