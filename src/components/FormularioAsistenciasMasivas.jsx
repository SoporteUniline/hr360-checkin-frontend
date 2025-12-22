"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Save, Calendar, User, FileText } from "lucide-react";
import axios from "axios";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import { Combobox } from "@/components/Combobox";
import { useSnackbar } from "notistack";
import useEmpleadosActivosData from "@/hooks/useEmpleadosActivos";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";

export default function FormularioAsistenciasMasivas({
  values,
  setModoFormulario,
  mutate,
  idEmpresa,
}) {
  const { dataUser } = useAuth();
  const userTimezone = dataUser?.zona_horaria || "America/Mexico_City";

  const hoy = dayjs().tz(userTimezone).format("YYYY-MM-DD");

  const [form, setForm] = useState({
    id_empleado: values?.id_empleado || "",
    id_tipo_permiso: values?.id_tipo_permiso || "",
    fecha_inicio: values?.fecha_inicio || hoy,
    fecha_fin: values?.fecha_fin || hoy,
    notas: values?.notas || "",
    autorizado_por: values?.autorizado_por || "",
  });

  const { enqueueSnackbar } = useSnackbar();

  const { data: empleados, loading: loadingEmpleados } =
    useEmpleadosActivosData(idEmpresa);
  const { data: tiposPermiso, loading: loadingPermisos } =
    useTiposPermisoData();

  console.log(empleados);
  console.log(tiposPermiso);
  const empleadosOptions =
    empleados?.data?.map((emp) => ({
      value: emp.id_empleado.toString(),
      label: `${emp.nombre} ${emp.apellido_paterno} ${emp.apellido_materno}`,
    })) || [];

  const tiposPermisoOptions =
    tiposPermiso?.tiposPermiso?.map((perm) => ({
      value: perm.id.toString(),
      label: perm.nombre,
    })) || [];

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/bulk-incident/register`,
        form
      );

      mutate(); // actualiza la lista si usas SWR

      enqueueSnackbar("Asistencias registradas correctamente", {
        variant: "success",
      });
      cerrarModal(); // cerrar modal al terminar
    } catch (error) {
      console.error(error);
      enqueueSnackbar("❌ Error al registrar asistencias", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const cerrarModal = () => setModoFormulario(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black-40 backdrop-blur-sm"
        onClick={cerrarModal}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Registrar Asistencia Masiva
              </h2>
              <p className="text-gray-500">
                Complete los datos de las asistencias
              </p>
            </div>
          </div>
          <button
            onClick={cerrarModal}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Empleado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Empleado
              </label>
              <Combobox
                options={empleadosOptions}
                value={form.id_empleado}
                onChange={(val) => setForm({ ...form, id_empleado: val })}
                placeholder={
                  loadingEmpleados ? "Cargando..." : "Seleccione un empleado"
                }
                emptyText="No se encontraron empleados"
                name="id_empleado"
              />
            </div>

            {/* Tipo de permiso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Tipo de Permiso
              </label>
              <Combobox
                options={tiposPermisoOptions}
                value={form.id_tipo_permiso}
                onChange={(val) => setForm({ ...form, id_tipo_permiso: val })}
                placeholder={
                  loadingPermisos ? "Cargando..." : "Seleccione un permiso"
                }
                emptyText="No se encontraron permisos"
                name="id_tipo_permiso"
              />
            </div>

            {/* Fechas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Período del Permiso
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    name="fecha_inicio"
                    value={form.fecha_inicio}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    name="fecha_fin"
                    value={form.fecha_fin}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Notas */}
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Notas (Opcional)
              </label>
              <textarea
                name="notas"
                placeholder="Observaciones adicionales..."
                value={form.notas}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div> */}
          </div>

          {/* Result Message */}
          {/* {result && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                result.error
                  ? "bg-red-50 border border-red-200"
                  : "bg-green-50 border border-green-200"
              }`}
            >
              <p
                className={`font-medium ${
                  result.error ? "text-red-800" : "text-green-800"
                }`}
              >
                {result.message}
              </p>
              {result.total && (
                <div className="mt-2 text-sm text-green-700">
                  <div className="flex flex-wrap gap-4">
                    <span>✅ Insertados: {result.insertados}</span>
                    <span>🔄 Actualizados: {result.actualizados}</span>
                    <span>📊 Total: {result.total}</span>
                  </div>
                </div>
              )}
            </div>
          )} */}

          {/* Actions */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-slate-700 hover:bg-slate-800 text-white py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />
                  Registrar Asistencia(s)
                </div>
              )}
            </Button>

            <Button
              type="button"
              onClick={cerrarModal}
              className="flex-1 bg-white hover:bg-gray-100 text-black py-3 rounded-lg font-medium transition-all duration-200"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
