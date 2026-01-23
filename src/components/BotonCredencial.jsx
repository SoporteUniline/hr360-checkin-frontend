import React from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

const BotonCredencial = ({ empleado, imagePreview }) => {
  const generarCredencial = async () => {
    try {
      // Crear canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Dimensiones de la credencial (tamaño tarjeta estándar: 3.375" x 2.125" a 300dpi)
      canvas.width = 1012;
      canvas.height = 638;

      // Fondo blanco
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Encabezado con color
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(0, 0, canvas.width, 120);

      // Título
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillText("CREDENCIAL DE EMPLEADO", canvas.width / 2, 70);

      // Cargar código QR en la posición de la foto
      try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${
          empleado.nip || "000000"
        }&size=1000x1000`;
        const qrImg = await cargarImagen(qrUrl);

        const qrSize = 300;
        const qrX = 100;
        const qrY = 200;

        // Fondo blanco para el QR
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

        // Dibujar QR
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // Borde del QR
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 4;
        ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

        // Etiqueta "ID" debajo del QR
        ctx.fillStyle = "#1f2937";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
      } catch (error) {
        console.log("Error al cargar QR:", error);
      }

      // Información del empleado (lado derecho)
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 36px Arial";
      ctx.textAlign = "left";

      const infoX = 450;
      let infoY = 250;
      const lineHeight = 50;

      // Nombre completo
      const nombreCompleto = `${empleado.nombre || ""} ${
        empleado.apellido_paterno || ""
      } ${empleado.apellido_materno || ""}`.trim();

      // Dividir nombre si es muy largo
      const maxWidth = 650;
      const palabras = nombreCompleto.split(" ");
      let linea = "";
      let lineas = [];

      palabras.forEach((palabra) => {
        const testLinea = linea + palabra + " ";
        const metrics = ctx.measureText(testLinea);
        if (metrics.width > maxWidth && linea !== "") {
          lineas.push(linea.trim());
          linea = palabra + " ";
        } else {
          linea = testLinea;
        }
      });
      lineas.push(linea.trim());

      // Dibujar nombre
      lineas.forEach((linea) => {
        ctx.fillText(linea, infoX, infoY);
        infoY += lineHeight;
      });

      // infoY += 10;

      // Puesto
      ctx.font = "bold 26px Arial";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("PUESTO", infoX, infoY);
      infoY += 25;

      ctx.font = "24px Arial";
      ctx.fillStyle = "#4b5563";
      const puesto = empleado.puesto || "N/A";
      const puestoLines = wrapText(ctx, puesto, maxWidth);
      puestoLines.forEach((line) => {
        ctx.fillText(line, infoX, infoY);
        infoY += 45;
      });

      // Departamento
      if (empleado.departamento) {
        ctx.font = "bold 26px Arial";
        ctx.fillStyle = "#2563eb";
        ctx.fillText("DEPARTAMENTO", infoX, infoY);
        infoY += 25;

        ctx.font = "24px Arial";
        ctx.fillStyle = "#4b5563";
        ctx.fillText(empleado.departamento, infoX, infoY);
        infoY += 45;
      }

      // Correo
      if (empleado.correo) {
        ctx.font = "bold 26px Arial";
        ctx.fillStyle = "#2563eb";
        ctx.fillText("CORREO", infoX, infoY);
        infoY += 25;

        ctx.font = "20px Arial";
        ctx.fillStyle = "#4b5563";
        const correoLines = wrapText(ctx, empleado.correo, maxWidth);
        correoLines.forEach((line) => {
          ctx.fillText(line, infoX, infoY);
          infoY += 25;
        });
      }

      // Línea divisoria decorativa
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, canvas.height - 50);
      ctx.lineTo(canvas.width - 60, canvas.height - 50);
      ctx.stroke();

      // Footer con fecha
      ctx.fillStyle = "#9ca3af";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      const fecha = new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      ctx.fillText(
        `Credencial emitida el ${fecha}`,
        canvas.width / 2,
        canvas.height - 20,
      );

      // Descargar imagen
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `credencial_${empleado.nombre}_${empleado.apellido_paterno}.png`;
        link.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error("Error al generar credencial:", error);
      alert("Error al generar la credencial");
    }
  };

  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    words.forEach((word) => {
      const testLine = currentLine + word + " ";
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine !== "") {
        lines.push(currentLine.trim());
        currentLine = word + " ";
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine.trim());
    }

    return lines;
  };

  const cargarImagen = async (src) => {
    return new Promise(async (resolve, reject) => {
      try {
        const img = new Image();

        // Para imágenes de S3 u otros servicios externos
        if (src.startsWith("http")) {
          try {
            // Intentar cargar con fetch primero
            const response = await fetch(src);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            img.onload = () => {
              URL.revokeObjectURL(objectUrl);
              resolve(img);
            };
            img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error("Error al cargar imagen"));
            };
            img.src = objectUrl;
          } catch (fetchError) {
            // Si fetch falla, intentar carga directa
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          }
        } else {
          // Para imágenes locales o base64
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={generarCredencial}
      className="flex items-center gap-2"
    >
      <Icon icon="mdi:card-account-details" width={20} height={20} />
      Descargar Credencial
    </Button>
  );
};

export default BotonCredencial;
