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
import axios from "@/lib/axios";
import { useSnackbar } from "notistack";
import useSWR from "swr";
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
import { toPng } from "html-to-image";

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
  mutate,
}) {
  const DIAS_SEMANA = React.useMemo(
    () => [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ],
    [],
  );

  const defaultHorarios = React.useMemo(
    () =>
      DIAS_SEMANA.map((dia) => ({
        dia,
        entrada: "",
        salida_comida: "",
        regreso_comida: "",
        salida: "",
      })),
    [DIAS_SEMANA],
  );

  const [tab, setTab] = useState("personales");
  const fueDesdeLectura = useRef(false);
  const nombreInputRef = useRef(null);

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
    defaultValues: {
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
      horarios: defaultHorarios,
    },
  });

  const nipActual = form.watch("nip");

  const normalizarHorarios = React.useCallback(
    (horarios = []) =>
      DIAS_SEMANA.map((dia) => {
        const existente = horarios.find((h) => h.dia === dia);
        return (
          existente || {
            dia,
            entrada: "",
            salida_comida: "",
            regreso_comida: "",
            salida: "",
          }
        );
      }),
    [DIAS_SEMANA],
  );

  // const valores = form.watch();

  // useEffect(() => {
  //   console.log(valores);
  // }, [valores]);
  useEffect(() => {
    if (!editar && dataUser?.empresas?.length === 1) {
      form.setValue("id_empresa", dataUser.empresas[0]);
    }
  }, [dataUser, editar]);

  useEffect(() => {
    if ((editar || soloLectura) && values) {
      const {
        cuenta_bancaria = {},
        horarios,
        hrs_por_dia,
        hrs_de_comida,
        ...restoEmpleado
      } = values;

      const horariosIniciales = normalizarHorarios(values.horarios || []);

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

  const formaCalculo = form.watch("forma_calculo");

  useEffect(() => {
    if (formaCalculo === "$") {
      form.setValue("porcentaje", null, { shouldValidate: false });
    } else if (formaCalculo === "%") {
      form.setValue("sueldo", null, { shouldValidate: false });
    }
  }, [formaCalculo]);

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
    if (data.banco === "Otro" && data.otro_banco?.trim()) {
      data.banco = data.otro_banco.trim();
    }
    delete data.otro_banco;

    const diasTrabajo = data.horarios
      .filter((h) => h.entrada && h.salida)
      .map((h) => h.dia);
    data.dias_trabajo = diasTrabajo.join(",");

    if (!data.id_empresa || Number(data.id_empresa) <= 0) {
      enqueueSnackbar("Debes seleccionar una empresa", {
        variant: "warning",
      });
      setTab("laborales");
      return;
    }

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

      mutate();
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
        {/* SECCIÓN UNIFICADA: Foto + Info + QR */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* 1. Foto de Perfil */}
            <div className="flex-shrink-0">
              <ImageUpload
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                setSelectedFile={setSelectedFile}
                soloLectura={soloLectura}
              />
            </div>

            {/* 2. Información Principal (Nombre y Puesto) */}
            <div className="flex-1 space-y-4 w-full">
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
                        className="text-2xl font-semibold text-gray-900 border-0 border-b-2 border-gray-200 focus:border-[#2563EB] focus:ring-0 rounded-none px-0 h-auto py-2 bg-transparent"
                        autoFocus
                        value={field.value ?? ""}
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
                        autoComplete="organization-title"
                        autoCorrect="off"
                        autoCapitalize="off"
                        disabled={soloLectura}
                        spellCheck={false}
                        value={field.value ?? ""}
                        placeholder="Nombre del puesto"
                        className="text-lg text-gray-600 border-0 border-b-2 border-gray-200 focus:border-[#2563EB] focus:ring-0 rounded-none px-0 h-auto py-2 bg-transparent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Botón de Credencial (Solo si ya existe el empleado) */}
              {(soloLectura || editar) && values && (
                <div className="pt-2">
                  <BotonCredencial
                    empleado={values}
                    imagePreview={imagePreview}
                  />
                </div>
              )}
            </div>

            {/* 3. Tu QR de Acceso (Lado derecho) */}
            {(editar || soloLectura) && nipActual && (
              <div className="flex flex-col items-center justify-center p-3 bg-gray-50 border rounded-xl shadow-inner min-w-[140px]">
                <span className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                  Acceso QR
                </span>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${nipActual}&size=150x150`}
                  alt="QR Empleado"
                  className="w-24 h-24 lg:w-32 lg:h-32 object-contain"
                  key={nipActual}
                />
                <div className="mt-2 text-center">
                  <p className="text-[10px] text-gray-400 uppercase leading-none">
                    Código
                  </p>
                  <span className="text-sm font-mono font-bold text-blue-600">
                    {nipActual}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TABS (Asegúrate de borrar la lista duplicada que estaba abajo) */}
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

            {/* Contenido de Tabs con Framer Motion */}
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
                    <TabCuentasBancarias
                      form={form}
                      soloLectura={soloLectura}
                    />
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
