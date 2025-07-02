"use client";
import React from "react";
import UploadFiles from "@/components/UploadFiles";
import { Button } from "@/components/ui/button";

export default function CargaCV({ files, setFiles }) {
  const handleDrop = (acceptedFiles) => {
    const withPreview = acceptedFiles.map((file) => {
      const preview = URL.createObjectURL(file);
      return { file, preview };
    });
    setFiles(withPreview);
  };

  return (
    <div className="pb-5">
      <h3 className="text-lg font-bold text-slate-700 mb-2">
        Curriculum Vitae
      </h3>

      {files.length > 0 ? (
        <div className="space-y-4">
          <ul className="space-y-4">
            {files.map(({ file, preview }, idx) => (
              <li key={idx}>
                <span className="flex gap-3 items-center">
                  <strong>{file.name}</strong>
                  <Button onClick={() => setFiles([])}>
                    Cargar nuevamente
                  </Button>
                </span>
                <div className="mt-2">
                  {file.type.startsWith("image/") ? (
                    <img
                      src={preview}
                      alt={file.name}
                      className="max-w-full max-h-64 rounded-lg border"
                    />
                  ) : file.type === "application/pdf" ? (
                    <iframe
                      src={preview}
                      className="w-full h-64 border rounded-lg"
                      title={file.name}
                    />
                  ) : (
                    <a
                      href={preview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Ver archivo
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <UploadFiles onDrop={handleDrop} />
      )}
    </div>
  );
}
