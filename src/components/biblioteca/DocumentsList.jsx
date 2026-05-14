import {
  FileText,
  ExternalLink,
  MoreVertical,
  Pencil,
  Trash2,
  History,
} from "lucide-react";

export default function DocumentsList({
  loading,
  documentos,
  totalDocumentos,
  openMenuId,
  setOpenMenuId,
  deletingId,
  getDocumentoUrl,
  openEditDocument,
  openNewVersionModal,
  openVersionsHistoryModal,
  onDeleteClick,
}) {
  return (
    <div className="bg-white border rounded-xl shadow-sm">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <h2 className="font-semibold">Documentos</h2>

        <span className="text-sm text-gray-500">
          {totalDocumentos} documento(s)
        </span>
      </div>

      {loading ? (
        <div className="p-6">Cargando...</div>
      ) : documentos.length === 0 ? (
        <div className="p-6 text-gray-500">No hay documentos</div>
      ) : (
        <div className="divide-y">
          {documentos.map((doc, index) => {
            const isLastItem = index === documentos.length - 1;
            const documentoUrl = getDocumentoUrl(doc);

            return (
              <div
                key={doc.id_documento_gd}
                className="p-4 hover:bg-gray-50 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex gap-3 min-w-0 flex-1">
                    <div className="bg-gray-100 p-3 rounded-lg h-fit">
                      <FileText size={22} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{doc.titulo}</h3>

                      {doc.descripcion && (
                        <p className="text-sm text-gray-500 mt-1">
                          {doc.descripcion}
                        </p>
                      )}

                      <div className="flex gap-2 mt-2 flex-wrap">
                        <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {doc.categoria ||
                            doc.nombre_categoria ||
                            "Sin categoría"}
                        </div>

                        <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                          v{doc.version || "1.0"}
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Subido por{" "}
                        {doc.subido_por_nombre ||
                          doc.nombre_usuario ||
                          "Usuario"}
                      </p>

                      {doc.nombre_archivo && (
                        <p className="text-xs text-gray-400 mt-1 break-all">
                          Archivo: {doc.nombre_archivo}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-start">
                    {documentoUrl ? (
                      <a
                        href={documentoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline whitespace-nowrap flex items-center gap-1"
                      >
                        Ver
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400 whitespace-nowrap">
                        Sin archivo
                      </span>
                    )}

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((prev) =>
                            prev === doc.id_documento_gd
                              ? null
                              : doc.id_documento_gd,
                          )
                        }
                        className="p-2 rounded-lg hover:bg-gray-100"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {openMenuId === doc.id_documento_gd && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />

                          <div
                            className={`absolute right-0 w-52 bg-white border rounded-xl shadow-xl z-50 overflow-hidden ${
                              isLastItem ? "bottom-10" : "top-10"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                openEditDocument(doc);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 text-left cursor-pointer"
                            >
                              <Pencil size={15} />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                openNewVersionModal(doc);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 text-left cursor-pointer"
                            >
                              <History size={15} />
                              Nueva versión
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                openVersionsHistoryModal(doc);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 text-left cursor-pointer"
                            >
                              <History size={15} />
                              Historial versiones
                            </button>

                            <button
                              type="button"
                              disabled={deletingId === doc.id_documento_gd}
                              onClick={() => onDeleteClick(doc)}
                              className="w-full px-4 py-3 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 text-left disabled:opacity-50 cursor-pointer"
                            >
                              <Trash2 size={15} />

                              {deletingId === doc.id_documento_gd
                                ? "Eliminando..."
                                : "Eliminar"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
