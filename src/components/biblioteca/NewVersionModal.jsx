import { X } from "lucide-react";

export default function NewVersionModal({
  open,
  versionDocument,
  versionForm,
  uploadingVersion,
  onClose,
  onSubmit,
  onChange,
}) {
  if (!open || !versionDocument) return null;

  const current = versionDocument.version || "1.0";
  const [major, minor] = current.split(".").map(Number);
  const nextVersion = `${major}.${(minor || 0) + 1}`;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={() => {
        if (!uploadingVersion) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Nueva versión</h2>

          <button
            type="button"
            disabled={uploadingVersion}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="rounded-xl bg-gray-50 border p-3">
            <p className="text-sm text-gray-500">Documento</p>
            <p className="font-medium">{versionDocument.titulo}</p>
            <p className="text-xs text-gray-400 mt-1">
              Versión actual: v{current}
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-sm text-blue-600 font-medium">
              Nueva versión automática
            </p>

            <p className="text-lg font-semibold text-blue-900 mt-1">
              v{current} → v{nextVersion}
            </p>

            <p className="text-xs text-blue-500 mt-2">
              El sistema generará automáticamente la siguiente versión.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Comentario</label>

            <textarea
              name="comentario"
              value={versionForm.comentario}
              onChange={onChange}
              rows={3}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="Ej. Se actualizó el documento con nuevos lineamientos"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Archivo</label>

            <input
              name="file"
              type="file"
              onChange={onChange}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
            />

            {versionForm.file && (
              <p className="text-xs text-gray-500 mt-1">
                Archivo seleccionado: {versionForm.file.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              disabled={uploadingVersion}
              onClick={onClose}
              className="text-[#2563EB] hover:bg-gray-100 bg-white border-2 border-[#2563EB] px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={uploadingVersion}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-lg disabled:opacity-60 cursor-pointer"
            >
              {uploadingVersion ? "Subiendo..." : "Subir versión"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
