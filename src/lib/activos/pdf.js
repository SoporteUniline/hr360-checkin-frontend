// Descarga del resguardo en PDF. El dibujo vive en ./pdfResguardo.mjs (puro, con pruebas).
import { dibujarResguardo, nombreArchivoResguardo } from "./pdfResguardo.mjs";

export async function downloadReceipt(delivery, company) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const { prepararMarcaAdamia } = await import("@/lib/pdfAdamiaTheme");
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const { font, logo } = await prepararMarcaAdamia(doc);
  let logoEmpresa = null;
  if (company.logo) {
    const { fetchImageAsDataUrl } = await import("@/lib/pdfCompanyLogo");
    logoEmpresa = await fetchImageAsDataUrl(company.logo);
  }
  dibujarResguardo(doc, autoTable, delivery, company, { font, logo, logoEmpresa });
  doc.save(nombreArchivoResguardo(delivery));
}
