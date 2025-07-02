// components/FileDropzone.js
"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils"; // Este viene con shadcn boilerplate

export default function UploadFiles({
  onDrop,
  className,
  text = "Arrastra archivos aquí o haz clic para subir",
}) {
  const handleDrop = useCallback(
    (acceptedFiles) => {
      onDrop(acceptedFiles);
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      "image/*": [],
      "application/pdf": [],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center cursor-pointer transition-colors hover:border-primary",
        isDragActive && "border-primary bg-muted",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <UploadCloud className="w-8 h-8" />
        <p>{text}</p>
      </div>
    </div>
  );
}
