import { Trash2 } from "lucide-react";

export default function DeleteDocumentModal({
  open,
  documentToDelete,
  deletingId,
  onClose,
  onConfirm,
}) {
  if (!open || !documentToDelete) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Trash2 className="text-red-600" size={22} />
          </div>

          <h2 className="text-xl font-semibold">Eliminar documento</h2>

          <p className="text-gray-500 mt-2">
            ¿Seguro que deseas eliminar:{" "}
            <span className="font-medium text-black">
              {documentToDelete.titulo}?
            </span>
          </p>

          <p className="text-sm text-gray-400 mt-3">
            Esta acción ocultará el documento del sistema.
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl cursor-pointer hover:bg-gray-100"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={deletingId}
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              {deletingId ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
