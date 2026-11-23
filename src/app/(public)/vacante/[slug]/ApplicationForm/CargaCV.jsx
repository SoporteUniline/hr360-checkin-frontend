"use client";
/* eslint-disable @next/next/no-img-element -- vista previa local (blob:) del CV elegido */
import React from "react";
import { FileText } from "lucide-react";
import UploadFiles from "@/components/UploadFiles";

// CV obligatorio (PDF o imagen). La validación de «CV es obligatorio» sigue en el envío del formulario.
export default function CargaCV({ files, setFiles }) {
  const handleDrop = (acceptedFiles) => {
    const withPreview = acceptedFiles.map((file) => {
      const preview = URL.createObjectURL(file);
      return { file, preview };
    });
    setFiles(withPreview);
  };

  return (
    <div className="vc-cv">
      <h3>
        Tu CV <span className="vc-req-marca" aria-hidden="true">*</span>
      </h3>
      <p className="vc-nota">PDF o foto de tu solicitud o currículum.</p>

      {files.length > 0 ? (
        <ul className="vc-cv-lista">
          {files.map(({ file, preview }, idx) => (
            <li key={idx}>
              <div className="vc-cv-archivo">
                <FileText aria-hidden="true" />
                <strong>{file.name}</strong>
                <button type="button" className="vc-texto-btn" onClick={() => setFiles([])}>
                  Cambiar archivo
                </button>
              </div>
              {file.type.startsWith("image/") ? (
                <img src={preview} alt={`Vista previa de ${file.name}`} className="vc-cv-vista" />
              ) : file.type === "application/pdf" ? (
                <iframe src={preview} className="vc-cv-vista" title={`Vista previa de ${file.name}`} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <UploadFiles onDrop={handleDrop} className="vc-cv-zona" text="Toca para elegir tu CV o arrástralo aquí" />
      )}
    </div>
  );
}
