import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Capacitor } from "@capacitor/core";
import { FileSystem, Directory, Encoding } from "@capacitor/filesystem";
import { useSnackbar } from "notistack";

export const exportToExcel = async (
  data = [],
  columns = [],
  baseFilename = "Reporte",
  options = {}
) => {
  const { enqueueSnackbar } = useSnackbar();

  if (!data.length) {
    console.warn("No hay datos para exportar");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName || "Hoja1");

  worksheet.columns = columns.map((col) => ({
    ...col,
    width: col.width || 20,
  }));

  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: options.headerColor || "FF1E40AF" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  data.forEach((item) => worksheet.addRow(item));

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber !== 1) {
      row.eachCell((cell) => {
        cell.alignment = { horizontal: "center" };
      });
    }
  });

  const now = new Date();
  const formattedDate = now
    .toLocaleString("sv-SE")
    .replace(" ", "_")
    .replace(/:/g, "-");

  const filename = `${baseFilename}_${formattedDate}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const isNative = Capacitor.isNativePlatform();

  if (!isNative) {
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, filename);
    return;
  }

  try {
    const base64Data = bufferToBase64(buffer);

    await FileSystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Documents,
    });
    enqueueSnackbar(`Archivo guardado en Documentos: ${filename}`, {
      variant: "success",
    });
  } catch (error) {
    console.error("Error guardando archivo en dispositivo:", err);
    enqueueSnackbar(`No se pudo guardar el archivo`, {
      variant: "error",
    });
  }

  const bufferToBase64 = (buffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const length = bytes.byteLength;
    for (let i = 0; i < length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };
};
