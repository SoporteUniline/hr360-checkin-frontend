import { X } from "lucide-react";
import { CreatableCombobox } from "@/components/CreatableCombobox";

export default function UploadDocumentModal({
  open,
  uploading,
  uploadForm,
  setUploadForm,
  categorias,
  idEmpresa,
  categoryColors,
  enqueueSnackbar,
  axios,
  onClose,
  onSubmit,
  handleChange,
  setCategorias,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-lg">Subir documento</h2>

          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium">Categoría</label>

            <CreatableCombobox
              displayValueAsLabel
              value={uploadForm.id_categoria}
              onChange={(value) =>
                setUploadForm((prev) => ({
                  ...prev,
                  id_categoria: value,
                }))
              }
              placeholder="Selecciona o crea una categoría"
              searchPlaceholder="Buscar o crear categoría..."
              fetchOptions={async () => categorias}
              createOption={async (nombre) => {
                const nombreLimpio = nombre.trim();

                if (!nombreLimpio) return null;

                const categoriaExistente = categorias.find(
                  (cat) =>
                    cat.nombre.toLowerCase() === nombreLimpio.toLowerCase(),
                );

                if (categoriaExistente) {
                  enqueueSnackbar(
                    "La categoría ya existe, se seleccionó automáticamente",
                    {
                      variant: "info",
                    },
                  );

                  return {
                    ...categoriaExistente,
                    __existing: true,
                  };
                }

                const randomColor =
                  categoryColors[
                    Math.floor(Math.random() * categoryColors.length)
                  ];

                const res = await axios.post(
                  "/checador/gestion-documental/categorias",
                  {
                    id_empresa: idEmpresa,
                    nombre: nombreLimpio,
                    icono: "FolderOpen",
                    color: randomColor,
                    orden: 99,
                  },
                );

                const nuevaCategoria = {
                  id_categoria: res.data.id_categoria,
                  nombre: nombreLimpio,
                  icono: "FolderOpen",
                  color: randomColor,
                  orden: 99,
                };

                return nuevaCategoria;
              }}
              getOptionLabel={(cat) => cat.nombre}
              getOptionValue={(cat) => String(cat.id_categoria)}
              onCreated={(cat) => {
                setUploadForm((prev) => ({
                  ...prev,
                  id_categoria: String(cat.id_categoria),
                }));

                if (!cat.__existing) {
                  setCategorias((prev) => [...prev, cat]);

                  enqueueSnackbar("Categoría creada correctamente", {
                    variant: "success",
                  });
                }
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Título</label>

            <input
              name="titulo"
              value={uploadForm.titulo}
              onChange={handleChange}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="Ej. Manual de políticas internas"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>

            <textarea
              name="descripcion"
              value={uploadForm.descripcion}
              onChange={handleChange}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Descripción breve del documento"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Archivo</label>

            <input
              name="file"
              type="file"
              onChange={handleChange}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
            />

            {uploadForm.file && (
              <p className="text-xs text-gray-500 mt-1">
                Archivo seleccionado: {uploadForm.file.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="text-[#2563EB] hover:bg-gray-100 bg-white border-2 border-[#2563EB] px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-lg disabled:opacity-60 cursor-pointer"
            >
              {uploading ? "Subiendo..." : "Subir documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
