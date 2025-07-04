"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useSnackbar } from "notistack";
import useSWR, { mutate } from "swr";
import { useAuth } from "@/context/AuthContext";
import { twMerge } from "tailwind-merge";
import ImageUpload from "./ImageUpload";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { Icon } from "@iconify/react";
import ErrorPage from "@/components/ErrorPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BriefcaseBusiness, Hammer, User } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ComboboxSucursal } from "@/components/ComboboxSucursal";
import { zodResolver } from "@hookform/resolvers/zod";
import { schemaEmpleado } from "@/schemas/schemaEmpleado";

export default function FormularioEmpleado({
  modoFormulario,
  setModoFormulario,
  editar = false,
  values = null,
  page,
  limit,
  soloLectura = false,
  setEditar,
  setSoloLectura,
}) {
  const [tab, setTab] = useState("personales");
  const fueDesdeLectura = useRef(false);

  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth();
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if ((editar || soloLectura) && values?.foto_perfil) {
      setImagePreview(values.foto_perfil);
    }
  }, [editar, soloLectura, values]);

  const form = useForm({
    resolver: zodResolver(schemaEmpleado),
    defaultValues:
      editar || soloLectura
        ? values
        : {
            apellido_materno: "",
            apellido_paterno: "",
            correo: "",
            curp: "",
            departamento: "",
            dias_trabajo: "Lunes,Martes,Miércoles,Jueves,Viernes",
            direccion: "",
            estado_civil: "Soltero",
            fecha_ingreso: "",
            fecha_nacimiento: "",
            hrs_de_comida: "",
            hrs_por_dia: "",
            id_empresa: "",
            nip: "",
            nombre: "",
            nss: "",
            puesto: "",
            rfc: "",
            sexo: "Masculino",
            sucursal: "",
            telefono: "",
            periodo_pago: "Semanal",
            forma_pago: "Fijo",
            forma_calculo: "$",
          },
  });

  useEffect(() => {
    if (editar && values) {
      form.reset({
        ...values,
        hrs_por_dia: Number(values.hrs_por_dia) || 0,
        hrs_de_comida: Number(values.hrs_de_comida) || 0,
      });

      // Solo cambiar el tab si NO viene desde lectura
      if (!fueDesdeLectura.current) {
        setTab("personales");
      }

      // Resetear la bandera
      fueDesdeLectura.current = false;
    }
  }, [editar, values]);

  useEffect(() => {
    const forma = form.watch("forma_calculo");
    if (forma === "$") {
      form.setValue("porcentaje", null);
    } else if (forma === "%") {
      form.setValue("sueldo_por_hora", null);
    }
  }, [form.watch("forma_calculo")]);

  const onInvalidSubmit = (errors) => {
    console.log(errors);
    enqueueSnackbar(
      "Tienes campos obligatorios vacíos, por favor llena los campos requeridos",
      { variant: "warning" }
    );

    const erroresPersonales = [
      "apellido_paterno",
      "apellido_materno",
      "fecha_nacimiento",
      "telefono",
      "correo",
      "curp",
      "rfc",
      "nss",
      "sexo",
      "estado_civil",
      "direccion",
    ];
    const erroresLaborales = [
      "nombre_empresa",
      "sucursal",
      "departamento",
      "fecha_ingreso",
      "nip",
    ];
    const erroresJornada = ["dias_trabajo", "hrs_por_dia", "hrs_de_comida"];

    const erroresNomina = ["periodo_pago", "forma_pago", "forma_calculo"];

    const errorKeys = Object.keys(errors);

    if (errorKeys.some((e) => erroresPersonales.includes(e))) {
      setTab("personales");
    } else if (errorKeys.some((e) => erroresLaborales.includes(e))) {
      setTab("laborales");
    } else if (errorKeys.some((e) => erroresJornada.includes(e))) {
      setTab("jornada");
    } else if (errorKeys.some((e) => erroresNomina.includes(e))) {
      setTab("nomina");
    }
  };

  const onValidSubmit = async (data) => {
    data.id_empresa = dataUser?.id_empresa;

    try {
      // Validar CURP y correo solo si NO estás editando
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/validar`,
        {
          params: {
            correo: data.correo,
            curp: data.curp,
            nss: data.nss,
            rfc: data.rfc,
            id_empresa: data.id_empresa,
            id_empleado: editar ? values.id_empleado : null,
          },
        }
      );

      const { existeCorreo, existeCurp, existeRfc, existeNss } = response.data;

      if (existeCorreo) {
        enqueueSnackbar("Ya existe un empleado con ese correo", {
          variant: "warning",
        });
        return;
      }

      if (existeCurp) {
        enqueueSnackbar("Ya existe un empleado con esa CURP", {
          variant: "warning",
        });
        return;
      }
      if (existeRfc) {
        enqueueSnackbar("Ya existe un empleado con ese RFC", {
          variant: "warning",
        });
        return;
      }
      if (existeNss) {
        enqueueSnackbar("Ya existe un empleado con ese NSS", {
          variant: "warning",
        });
        return;
      }

      const formData = new FormData();

      delete data.nombre_empresa;

      // Adjuntar todos los campos del formulario
      Object.keys(data).forEach((key) => {
        formData.append(key, data[key]);
      });

      // Adjuntar imagen si existe
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      if (editar) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/${values.id_empleado}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        enqueueSnackbar("Empleado actualizado", { variant: "success" });
        setTab("personales");
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados`,
          formData, // <- aquí también
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        enqueueSnackbar("Empleado registrado", { variant: "success" });
        setTab("personales");
      }

      mutate(
        `/checador/empleados?empresa=${data.id_empresa}&page=${page}&limit=${limit}`
      );

      setModoFormulario(false); // 👈 regresar a la lista
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error al guardar empleado", { variant: "error" });
    }
  };

  const { data, isLoading, error } = useSWR(
    `/users/${dataUser?.id_usuario}`,
    fetcherWithToken,
    swr_config
  );

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center gap-3 h-100">
        <Icon icon="line-md:loading-loop" width="40" height="40" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) return <ErrorPage message={error?.message} />;

  return (
    <Form {...form}>
      <div className="flex justify-between items-center mb-4">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            setModoFormulario(false);
            setTab("personales");
          }}
        >
          <Icon icon="material-symbols:arrow-back" width={24} height={24} />
          <span className="text-sm sm:text-base text-blue-600">
            Regresar a la tabla
          </span>
        </div>

        {soloLectura && (
          <Button
            variant="outline"
            onClick={() => {
              fueDesdeLectura.current = true;
              setEditar(true);
              setSoloLectura(false);
            }}
          >
            Editar
          </Button>
        )}

        {soloLectura ? null : (
          <Button type="submit" form="formulario-empleado" variant="outline">
            {editar ? "Actualizar" : "Registrar"}
          </Button>
        )}
      </div>

      <form
        id="formulario-empleado"
        onSubmit={form.handleSubmit(onValidSubmit, onInvalidSubmit)}
        className="space-y-4"
      >
        <div className="flex flex-col gap-4">
          <section className="w-full flex flex-row gap-4">
            <ImageUpload
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              setSelectedFile={setSelectedFile}
              soloLectura={soloLectura}
            />

            <article className="w-full">
              <FormField
                name="nombre"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={soloLectura}
                        placeholder="Ingrese el nombre del empleado"
                        className="w-full text-lg sm:text-xl md:text-2xl lg:text-3xl h-12 border-0 border-white focus:border-b-blue-600 focus:ring-0 rounded-none"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="puesto"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <section className="flex mt-3 items-center">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 "></span>
                        <Input
                          {...field}
                          disabled={soloLectura}
                          placeholder="Nombre del puesto"
                          className="w-full text-xs sm:text-sm md:text-md lg:text-xl border-0 border-white focus:border-b-blue-600 focus:ring-0 rounded-none"
                        />
                      </section>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </article>
          </section>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 ">
            <TabsTrigger value="personales">
              <User className="mr-2 h-4 w-4" />
              Datos personales
            </TabsTrigger>
            <TabsTrigger value="laborales">
              <BriefcaseBusiness className="mr-2 h-4 w-4" />
              Datos laborales
            </TabsTrigger>
            <TabsTrigger value="jornada">
              <Hammer className="mr-2 h-4 w-4" /> Jornada laboral
            </TabsTrigger>
            <TabsTrigger value="nomina">
              <Icon icon="mdi:cash" className="mr-2 h-4 w-4" />
              Datos de nómina
            </TabsTrigger>
          </TabsList>

          <motion.div layout className="w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="relative w-full overflow-hidden"
              >
                {tab === "personales" && (
                  <section className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mx-1 my-3">
                      {[
                        { name: "apellido_paterno", label: "Apellido Paterno" },
                        { name: "apellido_materno", label: "Apellido Materno" },
                        {
                          name: "fecha_nacimiento",
                          label: "Fecha de nacimiento",
                          type: "date",
                        },
                        { name: "telefono", label: "Teléfono" },
                        { name: "correo", label: "Correo", type: "email" },
                      ].map(({ name, label, type = "text" }) => (
                        <FormField
                          key={name}
                          name={name}
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{label}</FormLabel>
                              <FormControl>
                                <Input
                                  type={type}
                                  disabled={soloLectura}
                                  {...field}
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
                              defaultValue={field.value}
                              disabled={soloLectura}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona el sexo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Masculino">
                                  Masculino
                                </SelectItem>
                                <SelectItem value="Femenino">
                                  Femenino
                                </SelectItem>
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
                            <FormLabel>Estado Civil</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={soloLectura}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona el estado civil" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Soltero">Soltero</SelectItem>
                                <SelectItem value="Casado">Casado</SelectItem>
                                <SelectItem value="Divorciado">
                                  Divorciado
                                </SelectItem>
                                <SelectItem value="Viudo">Viudo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name="direccion"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem className="col-span-full">
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={soloLectura} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>
                )}

                {tab === "laborales" && (
                  <section className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mx-1 my-3">
                      <FormField
                        name="nombre_empresa"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Empresa</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={dataUser?.nombre_empresa || ""}
                                disabled
                                readOnly
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        name="sucursal"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unidad de negocio o sucursal</FormLabel>
                            <ComboboxSucursal
                              value={field.value}
                              onChange={(val) => field.onChange(val)}
                              disabled={soloLectura}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {[
                        { name: "departamento", label: "Departamento" },

                        {
                          name: "fecha_ingreso",
                          label: "Fecha de ingreso",
                          type: "date",
                        },
                        { name: "nip", label: "Código de empleado" },
                      ].map(({ name, label, type = "text" }) => (
                        <FormField
                          key={name}
                          name={name}
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{label}</FormLabel>
                              <FormControl>
                                <Input
                                  type={type}
                                  disabled={soloLectura}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {tab === "jornada" && (
                  <section className="space-y-6 px-4 py-2">
                    {/* Días de trabajo */}
                    <FormField
                      name="dias_trabajo"
                      control={form.control}
                      render={({ field }) => {
                        const dias = [
                          { label: "L", value: "Lunes" },
                          { label: "M", value: "Martes" },
                          { label: "I", value: "Miércoles" },
                          { label: "J", value: "Jueves" },
                          { label: "V", value: "Viernes" },
                          { label: "S", value: "Sábado" },
                          { label: "D", value: "Domingo" },
                        ];

                        const diasSeleccionados = field.value
                          ? field.value.split(",")
                          : [];

                        const toggleDia = (diaValue) => {
                          const nuevosDias = diasSeleccionados.includes(
                            diaValue
                          )
                            ? diasSeleccionados.filter((d) => d !== diaValue)
                            : [...diasSeleccionados, diaValue];
                          field.onChange(nuevosDias.join(","));
                        };

                        return (
                          <FormItem>
                            <FormLabel className="text-base font-medium mb-2 block">
                              Días de trabajo
                            </FormLabel>
                            <div className="flex flex-wrap gap-3">
                              {dias.map(({ label, value }) => {
                                const activo =
                                  diasSeleccionados.includes(value);
                                return (
                                  <button
                                    disabled={soloLectura}
                                    key={value}
                                    type="button"
                                    title={value}
                                    onClick={() => toggleDia(value)}
                                    className={twMerge(
                                      "w-10 h-10 rounded-full border text-sm font-bold shadow-sm transition-all",
                                      activo
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                    )}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Horarios */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[
                        { name: "hrs_por_dia", label: "Horas por día" },
                        { name: "hrs_de_comida", label: "Horas de comida" },
                      ].map(({ name, label }) => (
                        <FormField
                          key={name}
                          name={name}
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">
                                {label}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  disabled={soloLectura}
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {tab === "nomina" && (
                  <section className="space-y-6 px-4 py-2">
                    <FormField
                      name="periodo_pago"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Periodo de pago</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={soloLectura}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un periodo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[
                                "Diario",
                                "Semanal",
                                "Catorcenal",
                                "Quincenal",
                                "Mensual",
                                "Por hora",
                              ].map((op) => (
                                <SelectItem key={op} value={op}>
                                  {op}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="forma_pago"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forma de pago</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={soloLectura}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona la forma de pago" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["Fijo", "Comisiones", "Fijo + Comisiones"].map(
                                (op) => (
                                  <SelectItem key={op} value={op}>
                                    {op}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="forma_calculo"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forma de cálculo</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={soloLectura}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona la forma de cálculo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["$", "%", "Ambos"].map((op) => (
                                <SelectItem key={op} value={op}>
                                  {op}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {["$", "Ambos"].includes(form.watch("forma_calculo")) && (
                      <FormField
                        name="sueldo_por_hora"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sueldo por hora ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                disabled={soloLectura}
                                {...field}
                                value={field.value ?? ""} // clave para evitar null
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value ? parseFloat(value) : null
                                  );

                                  // Si sólo seleccionó $, limpia porcentaje
                                  if (form.getValues("forma_calculo") === "$") {
                                    form.setValue("porcentaje", null);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {["%", "Ambos"].includes(form.watch("forma_calculo")) && (
                      <FormField
                        name="porcentaje"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Porcentaje (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                disabled={soloLectura}
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value ? parseFloat(value) : null
                                  );

                                  // Si sólo seleccionó %, limpia sueldo_por_hora
                                  if (form.getValues("forma_calculo") === "%") {
                                    form.setValue("sueldo_por_hora", null);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </Tabs>
      </form>
    </Form>
  );
}
