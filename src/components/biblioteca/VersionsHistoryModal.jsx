import { X, ExternalLink } from "lucide-react";

export default function VersionsHistoryModal({
  open,
  versionDocument,
  versionsLoading,
  versions,
  getDocumentoUrl,
  onClose,
}) {
  if (!open || !versionDocument) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Historial de versiones</h2>
            <p className="text-sm text-gray-500">{versionDocument.titulo}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {versionsLoading ? (
            <p className="text-gray-500">Cargando versiones...</p>
          ) : versions.length === 0 ? (
            <p className="text-gray-500">No hay versiones registradas</p>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => {
                const versionUrl = getDocumentoUrl(version);

                return (
                  <div
                    key={version.id_version || version.id_documento_version}
                    className="border rounded-xl p-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="font-semibold">
                        v{version.version || version.numero_version}
                      </p>

                      {version.comentario && (
                        <p className="text-sm text-gray-500 mt-1">
                          {version.comentario}
                        </p>
                      )}

                      {version.nombre_archivo && (
                        <p className="text-xs text-gray-400 mt-2 break-all">
                          Archivo: {version.nombre_archivo}
                        </p>
                      )}

                      <p className="text-xs text-gray-400 mt-1">
                        {version.createdAt || version.created_at || ""}
                      </p>
                    </div>

                    {versionUrl && (
                      <a
                        href={versionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline whitespace-nowrap flex items-center gap-1"
                      >
                        Ver
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
