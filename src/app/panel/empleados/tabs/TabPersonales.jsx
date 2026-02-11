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
        }
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
    <section className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mx-1 my-3">
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
              <FormLabel>Sexo</FormLabel>
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
                disabled={soloLectura || !idEmpresa}
                placeholder="Selecciona o crea estado civil..."
                searchPlaceholder="Buscar estado civil..."
                fetchOptions={(q) =>
                  axios
                    .get(
                      `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/estados-civiles`,
                      { params: { id_empresa: idEmpresa, nombre: q } }
                    )
                    .then((r) => r.data.estados_civiles || [])
                }
                createOption={(nombre) =>
                  axios
                    .post(
                      `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/estados-civiles`,
                      { nombre, id_empresa: idEmpresa }
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
            <FormItem>
              <FormLabel>Dirección</FormLabel>
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
    </section>
  );
}
