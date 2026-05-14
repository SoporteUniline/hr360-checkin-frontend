import { X } from "lucide-react";

export default function CategoryModal({
  open,
  savingCategory,
  categoryForm,
  setCategoryForm,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={() => {
        if (!savingCategory) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Nueva categoría</h2>

          <button
            type="button"
            disabled={savingCategory}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>

            <input
              value={categoryForm.nombre}
              onChange={(e) =>
                setCategoryForm((prev) => ({
                  ...prev,
                  nombre: e.target.value,
                }))
              }
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="Ej. Políticas internas"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              disabled={savingCategory}
              onClick={onClose}
              className="text-[#2563EB] hover:bg-gray-100 bg-white border-2 border-[#2563EB] px-4 py-2 rounded-xl disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={savingCategory}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl disabled:opacity-50 cursor-pointer"
            >
              {savingCategory ? "Guardando..." : "Crear categoría"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
