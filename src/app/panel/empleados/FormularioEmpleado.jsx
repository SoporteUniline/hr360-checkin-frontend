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
import { BriefcaseBusiness, Hammer, User, FolderOpen } from "lucide-react";
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
import PanelEmpleadoDocumentos from "@/app/panel/panel-empleado/components/PanelEmpleadoDocumentos";
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
      enviar_asistencia_automatica: true,
      autoriza_horas_extra: false,
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
        enviar_asistencia_automatica:
          restoEmpleado.enviar_asistencia_automatica === 1 ? true : false,
        autoriza_horas_extra:
          restoEmpleado.autoriza_horas_extra === 1 ? true : false,
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
      const status = error.response?.status;
      const mensaje =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error desconocido";

      if (status === 403) {
        // Límite de empleados alcanzado — mostrar aviso con link a suscripción
        enqueueSnackbar(
          <span>
            {mensaje}{" "}
            <a
              href="/panel/mi-suscripcion"
              className="underline font-semibold"
            >
              Mejorar plan →
            </a>
          </span>,
          { variant: "warning", autoHideDuration: 6000 },
        );
      } else {
        enqueueSnackbar(mensaje, { variant: "error" });
      }
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
      {/* Contenedor principal: columna fija en mobile, flujo normal en desktop */}
      <div className="flex flex-col h-[calc(100dvh-3.5rem)] sm:block sm:h-auto">

        {/* ── Header mobile (oscuro, fijo arriba) ── */}
        <div className="sm:hidden bg-gray-900 text-white px-4 pt-4 pb-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="flex items-center gap-2 text-white active:opacity-70 min-w-0"
              onClick={() => {
                setModoFormulario(false);
                setTab("personales");
              }}
            >
              <Icon icon="material-symbols:arrow-back" width={20} height={20} className="shrink-0" />
              <span className="text-sm font-semibold truncate">
                {soloLectura || editar
                  ? values
                    ? `${values.nombre} ${values.apellido_paterno}`
                    : "Empleado"
                  : "Nuevo empleado"}
              </span>
            </button>
            {soloLectura && (
              <button
                type="button"
                className="shrink-0 bg-white/10 active:bg-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
                onClick={() => {
                  fueDesdeLectura.current = true;
                  setEditar(true);
                  setSoloLectura(false);
                }}
              >
                Editar
              </button>
            )}
          </div>
        </div>

        {/* ── Header desktop (tarjeta blanca) ── */}
        <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
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

        {/* ── Área scrolleable ── */}
        <div className="flex-1 overflow-y-auto sm:overflow-visible">
          <form
            id="formulario-empleado"
            onSubmit={form.handleSubmit(onValidSubmit, onInvalidSubmit)}
            className="space-y-0 sm:space-y-6"
          >
            {/* SECCIÓN: Foto + Info + QR */}
            <div className="bg-white border-b border-gray-100 sm:rounded-xl sm:shadow-sm sm:border sm:border-gray-100 p-4 sm:p-6">
              <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
                {/* 1. Foto de Perfil */}
                <div className="shrink-0">
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

                {/* 3. QR de Acceso (solo visible en md+) */}
                {(editar || soloLectura) && nipActual && (
                  <div className="hidden md:flex flex-col items-center justify-center p-3 bg-gray-50 border rounded-xl shadow-inner min-w-35">
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

              {/* QR compacto en mobile (debajo del nombre/puesto) */}
              {(editar || soloLectura) && nipActual && (
                <div className="md:hidden mt-3 flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${nipActual}&size=80x80`}
                    alt="QR Empleado"
                    className="w-12 h-12 object-contain shrink-0"
                    key={nipActual}
                  />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide mb-0.5">
                      Acceso QR
                    </p>
                    <span className="text-base font-mono font-bold text-blue-600">
                      {nipActual}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* TABS */}
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <div className="bg-white sm:rounded-xl sm:shadow-sm sm:border sm:border-gray-100 overflow-hidden sm:mb-6">
                <div className="overflow-x-auto">
                  <TabsList className="flex-nowrap w-max min-w-full bg-gray-50 rounded-none border-b border-gray-200 p-0 h-auto">
                    <TabsTrigger
                      value="personales"
                      className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-6 font-medium"
                    >
                      <User className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Datos personales</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="laborales"
                      className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-6 font-medium"
                    >
                      <BriefcaseBusiness className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Datos laborales</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="jornada"
                      className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-6 font-medium"
                    >
                      <Hammer className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Jornada laboral</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="nomina"
                      className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-6 font-medium"
                    >
                      <Icon icon="mdi:cash" className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Datos de nómina</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="cuentas"
                      className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-6 font-medium"
                    >
                      <Icon icon="rivet-icons:money" className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Cuentas bancarias</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="reconocimiento"
                      className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-6 font-medium"
                    >
                      <Icon icon="mdi:face-recognition" className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Escanear rostro</span>
                    </TabsTrigger>
                    {values?.id_empleado && (
                      <TabsTrigger
                        value="documentos"
                        className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-6 font-medium"
                      >
                        <FolderOpen className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Documentos</span>
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                {/* Contenido de Tabs con Framer Motion */}
                <motion.div layout className="w-full p-3 sm:p-6">
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

                      {tab === "documentos" && values?.id_empleado && (
                        <PanelEmpleadoDocumentos
                          idEmpleado={values.id_empleado}
                          idEmpresa={values.id_empresa}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </div>
            </Tabs>
          </form>
        </div>

        {/* ── Barra de acción mobile (fija abajo) ── */}
        <div className="sm:hidden shrink-0 bg-white border-t border-gray-100 px-4 py-3">
          {soloLectura ? (
            <p className="text-center text-xs text-gray-400 py-1">
              Vista de solo lectura
            </p>
          ) : (
            <button
              type="submit"
              form="formulario-empleado"
              className="w-full bg-gray-900 active:bg-gray-700 text-white text-sm font-bold py-3 rounded-xl"
            >
              {editar ? "Actualizar empleado" : "Registrar empleado"}
            </button>
          )}
        </div>
      </div>
    </Form>
  );
}
