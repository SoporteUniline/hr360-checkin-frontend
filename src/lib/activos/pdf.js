export async function downloadReceipt(delivery, companyName) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("ADAMIA · DEMOSTRACIÓN · SIN VALIDEZ DE ENTREGA REAL", 15, 15);
  doc.setFontSize(17);
  doc.setTextColor(30, 64, 130);
  doc.text("Resguardo de activos y uniformes", 15, 27);
  autoTable(doc, {
    startY: 34,
    head: [["Empresa", "Resguardo", "Fecha"]],
    body: [[companyName, delivery.folio, delivery.date]],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [236, 243, 253], textColor: [40, 70, 120] },
  });
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 5,
    body: [
      ["Recibe", delivery.employee.name],
      ["Puesto", delivery.employee.role],
      ["Entrega", delivery.actor],
      ["Devolución prevista", delivery.due || "Al terminar la asignación"],
    ],
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
  });
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 7,
    head: [["Artículo / variante", "Código / serie", "Cantidad"]],
    body: delivery.lines.map((l) => [
      `${l.snapshot.name}\n${l.snapshot.variant}`,
      `${l.snapshot.code}\n${l.snapshot.serial || ""}`,
      l.qty,
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [236, 243, 253], textColor: [40, 70, 120] },
    columnStyles: { 2: { halign: "right" } },
  });
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [["Condición y observaciones"]],
    body: [
      [delivery.note || "Sin observaciones"],
      [
        `Estado: ${
          delivery.status === "cancelled"
            ? "Entrega revertida"
            : delivery.acknowledgement === "accepted"
            ? "Acuse simulado registrado"
            : delivery.acknowledgement === "difference"
            ? "Diferencia reportada"
            : "Pendiente de acuse"
        }`,
      ],
      [
        delivery.ackNote ||
          delivery.cancelReason ||
          "Documento de ejemplo para revisión del módulo.",
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [236, 243, 253], textColor: [40, 70, 120] },
    theme: "grid",
  });
  let y = doc.lastAutoTable.finalY + 24;
  if (y > 245) {
    doc.addPage();
    y = 40;
  }
  doc.setDrawColor(180);
  doc.line(20, y, 90, y);
  doc.line(120, y, 195, y);
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Entrega · Recursos Humanos", 22, y + 6);
  doc.text("Recibe · Empleado", 122, y + 6);
  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(`${delivery.folio} · Demostración · ${n} / ${pages}`, 15, 270);
  }
  doc.save(`${delivery.folio}-demo.pdf`);
}
