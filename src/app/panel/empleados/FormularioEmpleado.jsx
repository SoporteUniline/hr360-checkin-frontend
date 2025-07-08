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
import TabPersonales from "./tabs/TabPersonales";
import TabLaborales from "./tabs/TabLaborales";
import TabJornada from "./tabs/TabJornada";
import TabNomina from "./tabs/TabNomina";
import TabCuentasBancarias from "./tabs/TabCuentasBancarias";

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
  console.log(values);
  const [tab, setTab] = useState("personales");
  const fueDesdeLectura = useRef(false);
  const construirHorariosDesdeDatos = (data) => {
    const dias = data.dias_trabajo?.split(",") || [];

    // Si el objeto data ya tiene horarios, úsalos para cada día
    if (
      data.horarios &&
      Array.isArray(data.horarios) &&
      data.horarios.length > 0
    ) {
      // Aquí mapeamos los días para asegurarnos de que cada día de dias_trabajo tenga horario, o vacío si no está
      return dias.map((dia) => {
        const horarioExistente = data.horarios.find((h) => h.dia === dia);
        return horarioExistente || { dia, entrada: "", salida: "" };
      });
    }

    // Si no hay horarios, inicializa vacíos o con defaults
    return dias.map((dia) => ({
      dia,
      entrada: "", // o null o lo que prefieras
      salida: "",
    }));
  };

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
            banco: "",
            otro_banco: "",
            tipo_cuenta: "Cuenta", // o "CLABE"
            numero_cuenta: "",
            solicitar_gps: "", // antes era gps_requerido
            lugar_checkin: null, // o {} si esperas objeto
            lugar_checkout: null,
          },
  });

  useEffect(() => {
    if ((editar || soloLectura) && values) {
      // Asegúrate que values.horarios siempre esté definido
      const {
        cuenta_bancaria = {},
        horarios,
        hrs_por_dia,
        hrs_de_comida,
        ...restoEmpleado
      } = values;

      const horariosIniciales =
        horarios && horarios.length > 0
          ? horarios
          : construirHorariosDesdeDatos(values);

      let banco = cuenta_bancaria.banco || "";
      let otro_banco = cuenta_bancaria.otro_banco || "";

      const bancosComunes = [
        "BBVA",
        "Banorte",
        "Santander",
        "HSBC",
        "Scotiabank",
        "Citibanamex",
        "Banco Azteca",
      ];

      // Si el banco guardado no está en la lista, se debe tratar como "Otro"
      if (banco && !bancosComunes.includes(banco)) {
        otro_banco = banco;
        banco = "Otro";
      }

      form.reset({
        ...restoEmpleado,
        horarios: horariosIniciales,
        hrs_por_dia: Number(hrs_por_dia) || 0,
        hrs_de_comida: Number(hrs_de_comida) || 0,
        numero_cuenta: cuenta_bancaria.numero_cuenta || "",
        banco,
        otro_banco,
        tipo_cuenta: cuenta_bancaria.tipo_cuenta || "Cuenta",
        solicitar_gps:
          restoEmpleado.solicitar_gps === 1
            ? "Sí"
            : restoEmpleado.solicitar_gps === 0
            ? "No"
            : "",
        lugar_checkin:
          typeof restoEmpleado.lugar_checkin === "string"
            ? JSON.parse(restoEmpleado.lugar_checkin)
            : restoEmpleado.lugar_checkin || null,
        lugar_checkout:
          typeof restoEmpleado.lugar_checkout === "string"
            ? JSON.parse(restoEmpleado.lugar_checkout)
            : restoEmpleado.lugar_checkout || null,
      });

      if (!fueDesdeLectura.current) {
        setTab("personales");
      }

      fueDesdeLectura.current = false;
    }
  }, [editar, values, soloLectura]);

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

    const erroresCuentas = ["banco", "tipo_cuenta", "numero_cuenta"];

    const errorKeys = Object.keys(errors);

    if (errorKeys.some((e) => erroresPersonales.includes(e))) {
      setTab("personales");
    } else if (errorKeys.some((e) => erroresLaborales.includes(e))) {
      setTab("laborales");
    } else if (errorKeys.some((e) => erroresJornada.includes(e))) {
      setTab("jornada");
    } else if (errorKeys.some((e) => erroresNomina.includes(e))) {
      setTab("nomina");
    } else if (errorKeys.some((e) => erroresCuentas.includes(e))) {
      setTab("cuentas");
    }
  };

  const onValidSubmit = async (data) => {
    data.id_empresa = dataUser?.id_empresa;

    if (data.banco === "Otro" && data.otro_banco?.trim()) {
      data.banco = data.otro_banco.trim();
    }
    delete data.otro_banco;

    // Construir horarios si no existen
    if (!data.horarios || data.horarios.length === 0) {
      data.horarios = construirHorariosDesdeDatos(data);
    }

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

      data.id_empresa = dataUser?.id_empresa;

      const formData = new FormData();

      delete data.nombre_empresa;

      // Adjuntar todos los campos del formulario
      Object.keys(data).forEach((key) => {
        if (Array.isArray(data[key]) || typeof data[key] === "object") {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key]);
        }
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
          <div className="overflow-x-auto">
            <TabsList className="flex-nowrap w-max min-w-full">
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
              <TabsTrigger value="cuentas">
                {/* <Icon icon="mdi:cash" className="mr-2 h-4 w-4" /> */}
                <Icon icon="rivet-icons:money" className="mr-2 h-4 w-4" />
                Cuentas bancarias
              </TabsTrigger>
            </TabsList>
          </div>

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
                  <TabPersonales form={form} soloLectura={soloLectura} />
                )}

                {tab === "laborales" && (
                  <TabLaborales
                    form={form}
                    soloLectura={soloLectura}
                    dataUser={dataUser}
                  />
                )}

                {tab === "jornada" && (
                  <TabJornada form={form} soloLectura={soloLectura} />
                )}

                {tab === "nomina" && (
                  <TabNomina form={form} soloLectura={soloLectura} />
                )}
                {tab === "cuentas" && (
                  <TabCuentasBancarias form={form} soloLectura={soloLectura} />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </Tabs>
      </form>
    </Form>
  );
}
