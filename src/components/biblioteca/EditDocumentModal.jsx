import { X } from "lucide-react";

export default function EditDocumentModal({
  open,
  categorias,
  editForm,
  setEditForm,
  savingEdit,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Editar documento</h2>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Categoría</label>

            <select
              value={editForm.id_categoria}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  id_categoria: e.target.value,
                }))
              }
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="">Selecciona una categoría</option>

              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Título</label>

            <input
              value={editForm.titulo}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  titulo: e.target.value,
                }))
              }
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>

            <textarea
              rows={3}
              value={editForm.descripcion}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  descripcion: e.target.value,
                }))
              }
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-[#2563EB] hover:bg-gray-100 bg-white border-2 border-[#2563EB] px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={savingEdit}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-lg disabled:opacity-60 cursor-pointer"
            >
              {savingEdit ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
