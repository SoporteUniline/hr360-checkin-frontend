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
import TabReconocimiento from "./tabs/TabReconocimiento";
import TabGPS from "./tabs/TabGPS";
import BotonCredencial from "@/components/BotonCredencial";

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
  onClose,
}) {
  const [tab, setTab] = useState("personales");
  const fueDesdeLectura = useRef(false);
  const nombreInputRef = useRef(null);

  const construirHorariosDesdeDatos = (data) => {
    const dias = data.dias_trabajo?.split(",") || [];

    if (
      data.horarios &&
      Array.isArray(data.horarios) &&
      data.horarios.length > 0
    ) {
      return dias.map((dia) => {
        const horarioExistente = data.horarios.find((h) => h.dia === dia);
        return horarioExistente || { dia, entrada: "", salida: "" };
      });
    }

    return dias.map((dia) => ({
      dia,
      entrada: "",
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
            correo_notificaciones: "",
            curp: "",
            departamento: "",
            direccion: "",
            estado_civil: "sin-seleccion",
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
            sexo: "sin-seleccion",
            sucursal: "",
            telefono: "",
            periodo_pago: "sin-seleccion",
            forma_pago: "sin-seleccion",
            forma_calculo: "sin-seleccion",
            banco: "",
            otro_banco: "",
            tipo_cuenta: "Cuenta",
            numero_cuenta: "",
            solicitar_gps: "",
            lugar_checkin: null,
            lugar_checkout: null,
            checar_gps: false,
            usar_reloj_checador: true,
            cierre_turno: "Automático",
            areasAsignadas: [],
            new_pass: "",
          },
  });

  const valores = form.watch();

  useEffect(() => {
    console.log(valores);
  }, [valores]);

  useEffect(() => {
    if ((editar || soloLectura) && values) {
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

      let banco = cuenta_bancaria?.banco || "";
      let otro_banco = cuenta_bancaria?.otro_banco || "";

      const bancosComunes = [
        "BBVA",
        "Banorte",
        "Santander",
        "HSBC",
        "Scotiabank",
        "Citibanamex",
        "Banco Azteca",
      ];

      if (banco && !bancosComunes.includes(banco)) {
        otro_banco = banco;
        banco = "Otro";
      }

      form.reset({
        ...restoEmpleado,
        horarios: horariosIniciales,
        hrs_por_dia: Number(hrs_por_dia) || 0,
        hrs_de_comida: Number(hrs_de_comida) || 0,
        numero_cuenta: cuenta_bancaria?.numero_cuenta || "",
        banco,
        otro_banco,
        tipo_cuenta: cuenta_bancaria?.tipo_cuenta || "Cuenta",
        cierre_turno:
          restoEmpleado.cierre_turno &&
          restoEmpleado.cierre_turno !== "undefined"
            ? restoEmpleado.cierre_turno
            : "Automático",
        sueldo: restoEmpleado.sueldo || null,
        porcentaje: restoEmpleado.porcentaje || null,
        descriptor_facial: restoEmpleado.descriptor_facial || [],
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
        checar_gps: restoEmpleado.checar_gps === 1 ? true : false,
        usar_reloj_checador:
          restoEmpleado.usar_reloj_checador === 1 ? true : false,
        new_pass: "",
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
      form.setValue("sueldo", null);
    }
  }, [form.watch("forma_calculo")]);

  // const onInvalidSubmit = (errors) => {
  //   console.log("ERRORES DE VALIDACIÓN:", errors);
  //   console.log("VALORES ACTUALES DEL FORM:", form.getValues());
  //   enqueueSnackbar(
  //     "Tienes campos obligatorios vacíos, por favor llena los campos requeridos",
  //     { variant: "warning" },
  //   );

  //   const errorKeys = Object.keys(errors);

  //   const tabsConErrores = {
  //     personales: [
  //       "apellido_paterno",
  //       "apellido_materno",
  //       "nombre",
  //       "correo",
  //       "correo_notificaciones",
  //       "curp",
  //       "telefono",
  //       "rfc",
  //     ],
  //     laborales: ["puesto", "sucursal"],
  //     jornada: ["hrs_por_dia", "hrs_de_comida", "horarios"],
  //     nomina: [
  //       "periodo_pago",
  //       "forma_pago",
  //       "forma_calculo",
  //       "sueldo",
  //       "porcentaje",
  //     ],
  //     cuentas: ["banco", "numero_cuenta", "tipo_cuenta"],
  //   };

  //   const tabConError = Object.entries(tabsConErrores).find(([tab, campos]) =>
  //     errorKeys.some((errorKey) => campos.includes(errorKey)),
  //   );

  //   if (tabConError) {
  //     setTab(tabConError[0]);
  //   }
  // };

  const onInvalidSubmit = (errors) => {
    console.log("ERRORES DE VALIDACIÓN:", errors);
    console.log("VALORES ACTUALES DEL FORM:", form.getValues());
    const firstErrorKey = Object.keys(errors)[0];
    const firstError = errors[firstErrorKey];
    const mensaje =
      firstError?.message ||
      firstError?.root?.message ||
      "Faltan campos obligatorios por llenar";

    enqueueSnackbar(`⚠️ ${mensaje}`, { variant: "warning" });

    const tabsConErrores = {
      personales: [
        "nombre",
        "apellido_paterno",
        "apellido_materno",
        "correo",
        "correo_notificaciones",
        "curp",
        "telefono",
        "rfc",
      ],
      laborales: ["puesto", "sucursal"],
      jornada: ["hrs_por_dia", "hrs_de_comida", "horarios"],
      nomina: [
        "periodo_pago",
        "forma_pago",
        "forma_calculo",
        "sueldo",
        "porcentaje",
      ],
      cuentas: ["banco", "otro_banco", "numero_cuenta", "tipo_cuenta"],
    };

    const tabConError = Object.entries(tabsConErrores).find(([_, campos]) =>
      campos.includes(firstErrorKey),
    );

    if (tabConError) {
      setTab(tabConError[0]);
    }

    form.setFocus(firstErrorKey);
  };

  const onValidSubmit = async (data) => {
    console.log("🔍 DATA antes de convertir a FormData:", data.cierre_turno);
    data.id_empresa = dataUser?.id_empresa;

    if (data.banco === "Otro" && data.otro_banco?.trim()) {
      data.banco = data.otro_banco.trim();
    }
    delete data.otro_banco;

    if (!data.horarios || data.horarios.length === 0) {
      data.horarios = construirHorariosDesdeDatos(data);
    }
    const diasTrabajo = data.horarios
      .filter((h) => h.entrada && h.salida)
      .map((h) => h.dia);
    data.dias_trabajo = diasTrabajo.join(",");

    try {
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
        },
      );

      const { existeCorreo, existeCurp, existeRfc, existeNss, existeNip } =
        response.data;

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

      if (existeNip) {
        enqueueSnackbar("Ya existe un empleado con ese NIP", {
          variant: "warning",
        });
        return;
      }

      data.id_empresa = dataUser?.id_empresa;

      console.log("Áreas asignadas que se van a enviar:", data.areasAsignadas);

      const formData = new FormData();

      delete data.nombre_empresa;

      [
        "id_jefe_inmediato",
        "id_autoriza_vacaciones",
        "id_autoriza_permisos",
      ].forEach((campo) => {
        if (data[campo] === "" || data[campo] === "null") {
          data[campo] = null;
        }
      });

      if (!data.new_pass || data.new_pass.trim() === "") {
        delete data.new_pass;
      }

      Object.keys(data).forEach((key) => {
        if (data[key] === null || data[key] === undefined) {
          return;
        }

        if (Array.isArray(data[key]) || typeof data[key] === "object") {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key]);
        }
      });

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
          },
        );
        enqueueSnackbar("Empleado actualizado", { variant: "success" });
        setTab("personales");
        // onClose?.();
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );
        enqueueSnackbar("Empleado registrado", { variant: "success" });
        setTab("personales");
        onClose?.();
        setModoFormulario(false);
      }

      mutate(
        `/checador/empleados?empresa=${data.id_empresa}&page=${page}&limit=${limit}`,
      );
    } catch (error) {
      console.log(error);
      // console.error(error);
      // enqueueSnackbar("Error al guardar empleado", { variant: "error" });
      const mensaje =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error desconocido";

      enqueueSnackbar(mensaje, { variant: "error" });
    }
  };

  useEffect(() => {
    if (modoFormulario && nombreInputRef.current && !editar && !soloLectura) {
      const timer = setTimeout(() => {
        nombreInputRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [modoFormulario, editar, soloLectura]);

  const { data, isLoading, error } = useSWR(
    dataUser?.id_usuario ? `/users/${dataUser.id_usuario}` : null,
    fetcherWithToken,
    swr_config,
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
      {/* Header del formulario - Estilo ADAMIA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex justify-between items-center">
          <button
            type="button"
            className="flex items-center gap-2 text-[#2563EB] hover:text-[#1d4ed8] transition-colors font-medium"
            onClick={() => {
              setModoFormulario(false);
              setTab("personales");
            }}
          >
            <Icon icon="material-symbols:arrow-back" width={20} height={20} />
            <span className="text-sm">Regresar a la tabla</span>
          </button>

          <div className="flex items-center gap-3">
            {soloLectura && (
              <Button
                variant="outline"
                className="border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
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
              <Button
                type="submit"
                form="formulario-empleado"
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
              >
                {editar ? "Actualizar" : "Registrar"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <form
        id="formulario-empleado"
        onSubmit={form.handleSubmit(onValidSubmit, onInvalidSubmit)}
        className="space-y-6"
      >
        {/* Sección de información principal - Estilo ADAMIA */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <ImageUpload
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              setSelectedFile={setSelectedFile}
              soloLectura={soloLectura}
            />

            <div className="flex-1 space-y-4">
              <FormField
                name="nombre"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        ref={nombreInputRef}
                        disabled={soloLectura}
                        placeholder="Ingrese el nombre del empleado"
                        className="text-2xl font-semibold text-gray-900 border-0 border-b-2 border-gray-200 focus:border-[#2563EB] focus:ring-0 rounded-none px-0 h-auto py-2"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="puesto"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={soloLectura}
                        placeholder="Nombre del puesto"
                        className="text-lg text-gray-600 border-0 border-b-2 border-gray-200 focus:border-[#2563EB] focus:ring-0 rounded-none px-0 h-auto py-2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {(soloLectura || editar) && values && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <BotonCredencial empleado={values} imagePreview={imagePreview} />
            </div>
          )}
        </div>

        {/* Tabs - Estilo ADAMIA */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <TabsList className="flex-nowrap w-max min-w-full bg-gray-50 rounded-none border-b border-gray-200 p-0 h-auto">
                <TabsTrigger
                  value="personales"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-4 px-6 font-medium"
                >
                  <User className="mr-2 h-4 w-4" />
                  Datos personales
                </TabsTrigger>
                <TabsTrigger
                  value="laborales"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-4 px-6 font-medium"
                >
                  <BriefcaseBusiness className="mr-2 h-4 w-4" />
                  Datos laborales
                </TabsTrigger>
                <TabsTrigger
                  value="jornada"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-4 px-6 font-medium"
                >
                  <Hammer className="mr-2 h-4 w-4" />
                  Jornada laboral
                </TabsTrigger>
                <TabsTrigger
                  value="nomina"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-4 px-6 font-medium"
                >
                  <Icon icon="mdi:cash" className="mr-2 h-4 w-4" />
                  Datos de nómina
                </TabsTrigger>
                <TabsTrigger
                  value="cuentas"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-4 px-6 font-medium"
                >
                  <Icon icon="rivet-icons:money" className="mr-2 h-4 w-4" />
                  Cuentas bancarias
                </TabsTrigger>
                <TabsTrigger
                  value="reconocimiento"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-4 px-6 font-medium"
                >
                  <Icon icon="mdi:face-recognition" className="mr-2 h-4 w-4" />
                  Escanear rostro
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Contenido de las pestañas */}

            <motion.div layout className="w-full p-6">
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
                    <TabJornada
                      form={form}
                      soloLectura={soloLectura}
                      empleadoId={values?.id_empleado}
                    />
                  )}

                  {tab === "nomina" && (
                    <TabNomina form={form} soloLectura={soloLectura} />
                  )}

                  {tab === "cuentas" && (
                    <TabCuentasBancarias form={form} soloLectura={soloLectura} />
                  )}

                  {/* 🔹 CAMBIO: Solo renderizar TabReconocimiento cuando esté activo */}
                  {tab === "reconocimiento" && (
                    <TabReconocimiento
                      form={form}
                      soloLectura={soloLectura}
                      active={tab === "reconocimiento"}
                      setDescriptor={(descriptor) =>
                        form.setValue("descriptor_facial", descriptor)
                      }
                    />
                  )}

                  {/* {tab === "gps" && (
                    <TabGPS form={form} soloLectura={soloLectura} />
                  )} */}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </Tabs>
      </form>
    </Form>
  );
}
