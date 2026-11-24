import { Fragment } from "react";
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

export default function TabPersonales({ renderCampos = () => null, form, soloLectura }) {
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
      <div className="border border-slate-200 bg-white rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-brand p-3 rounded-lg shadow-md">
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
        <div className="employee-fields">
          {renderCampos("inicio")}
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
          {renderCampos("nombre")}

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
            <Fragment key={name}><FormField
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
            />{renderCampos(name)}</Fragment>
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
          {renderCampos("curp")}
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
          {renderCampos("rfc")}

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
          {renderCampos("nss")}
          {/* CURP, RFC y NSS van solo aquí (no en «Documentos oficiales»); los campos personalizados de aquella
              sección se muestran aquí. */}
          {renderCampos("documento_curp")}
          {renderCampos("documento_rfc")}
          {renderCampos("documento_nss")}

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
                  value={field.value ? String(field.value) : "sin-seleccion"}
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
                    {/* Dato guardado con otro texto (p. ej. «F»): se muestra tal cual para no perderlo. */}
                    {field.value && !["sin-seleccion", "Masculino", "Femenino", "Otro"].includes(field.value) ? (
                      <SelectItem value={String(field.value)}>{String(field.value)}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {renderCampos("sexo")}

          <FormField
            name="estado_civil"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado civil</FormLabel>

                <CreatableCombobox
                  value={field.value === "sin-seleccion" ? "" : field.value ?? ""}
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
          {renderCampos("estado_civil")}

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
          {renderCampos("direccion")}
        </div>
      </div>
      <div className="employee-fields">{renderCampos("fin")}</div>
    </section>
  );
}
