import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportToExcel = async (
  data = [],
  columns = [],
  baseFilename = "Reporte",
  options = {}
) => {
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

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveAs(blob, `${baseFilename}_${formattedDate}.xlsx`);
};
