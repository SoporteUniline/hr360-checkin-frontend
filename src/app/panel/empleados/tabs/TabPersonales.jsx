import { Combobox } from "@/components/Combobox";
import { ComboboxEstadoCivil } from "@/components/ComboboxEstadoCivil";
import { FormLabelWithAsterisk } from "@/components/FormLabelWithAsterisk";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { CreatableCombobox } from "@/components/CreatableCombobox";
import axios from "@/lib/axios";

export default function TabPersonales({ form, soloLectura }) {
  const idEmpresa = form.watch("id_empresa");
  const [estadosCiviles, setEstadosCiviles] = useState([]);
  const [loadingEstadosCiviles, setLoadingEstadosCiviles] = useState(false);

  const fetchEstadosCiviles = async () => {
    if (!idEmpresa) {
      setEstadosCiviles([]);
      return;
    }

    try {
      setLoadingEstadosCiviles(true);

      console.log("📡 Cargando estados civiles de empresa:", idEmpresa);

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/estados-civiles`,
        {
          params: { id_empresa: idEmpresa },
        },
      );

      const lista = Array.isArray(res.data.estados_civiles)
        ? res.data.estados_civiles
        : [];

      setEstadosCiviles([
        { value: "", label: "Selecciona un estado civil" },
        ...lista.map((e) => ({
          value: e.nombre,
          label: e.nombre,
        })),
      ]);
    } catch (error) {
      console.error("❌ Error estados civiles", error);
      setEstadosCiviles([]);
    } finally {
      setLoadingEstadosCiviles(false);
    }
  };

  useEffect(() => {
    fetchEstadosCiviles();
  }, [idEmpresa]);

  return (
    <section className="space-y-6">
      {/* Información personal */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] p-3 rounded-lg shadow-md">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            Información personal
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            name="nombre"
            control={form.control}
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabelWithAsterisk required>
                  Nombre(s)
                </FormLabelWithAsterisk>

                <FormControl>
                  <Input
                    {...field}
                    disabled={soloLectura}
                    placeholder="Ingrese el nombre del empleado"
                    className="h-12 text-base font-medium"
                    value={field.value ?? ""}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          {[
            {
              name: "apellido_paterno",
              label: "Apellido Paterno",
              required: true,
            },
            {
              name: "apellido_materno",
              label: "Apellido Materno",
              required: true,
            },
            {
              name: "fecha_nacimiento",
              label: "Fecha de nacimiento",
              type: "date",
              required: false,
            },
            { name: "telefono", label: "Teléfono", required: false },
            { name: "correo", label: "Correo", type: "email", required: true },
            {
              name: "correo_notificaciones",
              label: "Correo Notificaciones",
              type: "email",
              required: false,
            },
          ].map(({ name, label, type = "text", required = false }) => (
            <FormField
              key={name}
              name={name}
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabelWithAsterisk required={required}>
                    {label}
                  </FormLabelWithAsterisk>
                  <FormControl>
                    <Input
                      type={type}
                      disabled={soloLectura}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <FormField
            name="curp"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>CURP</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={soloLectura}
                    maxLength={18}
                    className="uppercase"
                    placeholder="Ej. GOLA850705HDFRRN09"
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="rfc"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>RFC</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={soloLectura}
                    maxLength={13}
                    className="uppercase"
                    placeholder="Ej. GOLA8507052A1"
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="nss"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>NSS</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={soloLectura}
                    maxLength={11}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="sexo"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Sexo
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value !== "" ? field.value : "sin-seleccion"}
                  disabled={soloLectura}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el sexo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sin-seleccion">
                      Selecciona una opción
                    </SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="estado_civil"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado civil</FormLabel>

                <CreatableCombobox
                  value={field.value ?? ""}
                  compareBy="label"
                  displayValueAsLabel
                  disabled={soloLectura || !idEmpresa}
                  placeholder="Selecciona o crea estado civil..."
                  searchPlaceholder="Buscar estado civil..."
                  fetchOptions={(q) =>
                    axios
                      .get(
                        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/estados-civiles`,
                        { params: { id_empresa: idEmpresa, nombre: q } },
                      )
                      .then((r) => r.data.estados_civiles || [])
                  }
                  createOption={(nombre) =>
                    axios
                      .post(
                        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/estados-civiles`,
                        { nombre, id_empresa: idEmpresa },
                      )
                      .then((r) => r.data)
                  }
                  getOptionLabel={(o) => o.nombre}
                  getOptionValue={(o) => o.nombre} // 🔥 CLAVE
                  onChange={(nombre) => field.onChange(nombre)}
                  onCreated={(nuevo) => field.onChange(nuevo.nombre)}
                />

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="direccion"
            control={form.control}
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-sm font-medium text-gray-700">
                  Dirección
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={soloLectura}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Documentos oficiales */}
      <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50 border-2 border-purple-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-[#7C3AED] to-[#6d28d9] p-3 rounded-lg shadow-md">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            Documentos oficiales
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            name="curp"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  CURP
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={soloLectura}
                    maxLength={18}
                    className="uppercase"
                    placeholder="Ej. GOLA850705HDFRRN09"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="rfc"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  RFC
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={soloLectura}
                    maxLength={13}
                    className="uppercase"
                    placeholder="Ej. GOLA8507052A1"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="nss"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  NSS
                </FormLabel>
                <FormControl>
                  <Input {...field} disabled={soloLectura} maxLength={11} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </section>
  );
}
