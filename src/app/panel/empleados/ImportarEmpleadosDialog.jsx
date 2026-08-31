"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileSpreadsheet,
  Images,
  Loader2,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import axios from "@/lib/axios";

export default function ImportarEmpleadosDialog({
  open,
  onOpenChange,
  idEmpresa,
  onImported,
}) {
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [descargando, setDescargando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");

  const descargarPlantilla = async () => {
    if (!idEmpresa || idEmpresa === "all") return;

    try {
      setDescargando(true);
      setError("");

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/importar/plantilla`,
        {
          params: {
            id_empresa: idEmpresa,
          },
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement("a");
      link.href = url;
      link.download = "plantilla_importacion_empleados_adamia.xlsx";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar plantilla:", err);

      setError("No se pudo descargar la plantilla.");
    } finally {
      setDescargando(false);
    }
  };

  const importarEmpleados = async () => {
    if (!excelFile) {
      setError("Selecciona primero el archivo Excel.");
      return;
    }

    if (!idEmpresa || idEmpresa === "all") {
      setError("Selecciona una empresa específica.");
      return;
    }

    try {
      setImportando(true);
      setError("");
      setResultado(null);

      const formData = new FormData();

      formData.append("id_empresa", idEmpresa);
      formData.append("file", excelFile);

      if (zipFile) {
        formData.append("fotos", zipFile);
      }

      console.log("=== DEBUG IMPORTACIÓN ===");
      console.log("idEmpresa:", idEmpresa);
      console.log("excelFile:", excelFile);
      console.log("excelFile instanceof File:", excelFile instanceof File);
      console.log("nombre:", excelFile?.name);
      console.log("tipo:", excelFile?.type);
      console.log("tamaño:", excelFile?.size);

      for (const [key, value] of formData.entries()) {
        console.log("FORMDATA:", key, value);
      }

      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/importar`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setResultado(data);

      await onImported?.();
    } catch (err) {
      console.error("Error al importar empleados:", err);
      console.log("RESPUESTA BACKEND:", err?.response?.data);

      const mensaje =
        err?.response?.data?.error ||
        err?.response?.data?.mensaje ||
        JSON.stringify(err?.response?.data) ||
        err?.message ||
        "No se pudo realizar la importación.";

      setError(mensaje);
    } finally {
      setImportando(false);
    }
  };

  const cerrar = () => {
    if (importando) return;

    setExcelFile(null);
    setZipFile(null);
    setResultado(null);
    setError("");

    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nuevoOpen) => {
        if (!nuevoOpen) {
          cerrar();
          return;
        }

        onOpenChange(nuevoOpen);
      }}
    >
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50">
            <Upload className="h-5 w-5 text-indigo-600" />
          </div>

          <DialogTitle>Importar empleados</DialogTitle>

          <DialogDescription className="text-left">
            Descarga la plantilla, complétala y vuelve a subirla para registrar
            varios empleados al mismo tiempo.
          </DialogDescription>
        </DialogHeader>

        {!resultado ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    1. Descargar plantilla
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    La plantilla incluye los catálogos y turnos disponibles de
                    la empresa.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={descargarPlantilla}
                  disabled={descargando}
                >
                  {descargando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Descargar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">
                2. Archivo Excel
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 hover:bg-gray-50">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {excelFile
                      ? excelFile.name
                      : "Seleccionar plantilla completada"}
                  </p>

                  <p className="text-xs text-gray-500">Archivo .xlsx</p>
                </div>

                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(event) =>
                    setExcelFile(event.target.files?.[0] || null)
                  }
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">
                3. Fotos de perfil
                <span className="ml-1 font-normal text-gray-500">
                  (opcional)
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 hover:bg-gray-50">
                <Images className="h-5 w-5 text-indigo-600" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {zipFile ? zipFile.name : "Seleccionar ZIP de fotografías"}
                  </p>

                  <p className="text-xs text-gray-500">
                    Archivo .zip · máximo 20 MB
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Nombra cada foto con el correo exacto del empleado. Ejemplo:
                    juan@empresa.com.jpg
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Para una mejor visualización, recomendamos usar fotografías
                    cuadradas (1:1).
                  </p>
                </div>

                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(event) =>
                    setZipFile(event.target.files?.[0] || null)
                  }
                />
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />

              <div>
                <p className="font-semibold text-emerald-900">
                  Importación terminada
                </p>

                <p className="text-sm text-emerald-700">
                  Se procesaron {resultado.totalFilas ?? 0} filas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Insertados</p>
                <p className="mt-1 text-xl font-bold">
                  {resultado.insertados ?? 0}
                </p>
              </div>

              <div className="rounded-lg border bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Omitidos</p>
                <p className="mt-1 text-xl font-bold">
                  {resultado.omitidos ?? 0}
                </p>
              </div>
            </div>

            {resultado.errores?.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-amber-100 bg-amber-50 p-3">
                <p className="mb-2 text-sm font-semibold text-amber-900">
                  Errores
                </p>

                {resultado.errores.map((item, index) => (
                  <p
                    key={`${item.fila}-${index}`}
                    className="text-xs text-amber-800"
                  >
                    Fila {item.fila}: {item.motivo}
                  </p>
                ))}
              </div>
            )}

            {resultado.fotosNoAsociadas?.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="mb-2 text-sm font-semibold text-blue-900">
                  Fotos no asociadas
                </p>

                {resultado.fotosNoAsociadas.map((item, index) => (
                  <p
                    key={`${item.archivo}-${index}`}
                    className="text-xs text-blue-800"
                  >
                    {item.archivo}: {item.motivo}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={cerrar}
            disabled={importando}
          >
            {resultado ? "Cerrar" : "Cancelar"}
          </Button>

          {!resultado && (
            <Button
              type="button"
              onClick={importarEmpleados}
              disabled={!excelFile || importando}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {importando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}

              {importando ? "Importando..." : "Importar empleados"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
