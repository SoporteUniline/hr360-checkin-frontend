import React from "react";
import { Upload, Settings2 } from "lucide-react";

export default function DocumentHeader({ onOpenCategory, onOpenUpload }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold">Gestión Documental</h1>
        <p className="text-gray-500 mt-1">Biblioteca interna de documentos</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-5 w-full sm:w-auto">
        <button
          type="button"
          onClick={onOpenCategory}
          className="w-full sm:w-auto justify-center text-[#2563EB] hover:bg-gray-100 bg-white border-2 border-[#2563EB] px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer"
        >
          <Settings2 size={16} />
          Nueva categoría
        </button>

        <button
          onClick={onOpenUpload}
          className="w-full sm:w-auto justify-center bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer"
        >
          <Upload size={16} />
          Subir documento
        </button>
      </div>
    </div>
  );
}
