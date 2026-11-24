"use client";

import useCamposPersonalizados from "@/hooks/useCamposPersonalizados";
import { CamposEmpleado } from "@/components/CamposEmpleado";
import { parseCampos } from "@/lib/camposPersonalizados.mjs";
import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
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
import { isNativeClient } from "@/lib/native-app";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CambiarContrasenaEmpleado from "./CambiarContrasenaEmpleado";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BriefcaseBusiness, User, FolderOpen, ScanFace, Wallet } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ComboboxSucursal } from "@/components/ComboboxSucursal";
import { zodResolver } from "@hookform/resolvers/zod";
import { schemaEmpleado } from "@/schemas/schemaEmpleado";
import TabContactosEmergencia from "./tabs/TabContactosEmergencia";
import TabPersonales from "./tabs/TabPersonales";
import TabLaborales from "./tabs/TabLaborales";
import BajaEmpleadoInfo from "@/components/BajaEmpleadoInfo";
import TabJornada from "./tabs/TabJornada";
import TabNomina from "./tabs/TabNomina";
import TabCuentasBancarias from "./tabs/TabCuentasBancarias";
import TabReconocimiento from "./tabs/TabReconocimiento";
import TabGPS from "./tabs/TabGPS";
import PanelEmpleadoDocumentos from "@/app/panel/panel-empleado/components/PanelEmpleadoDocumentos";
import BotonCredencial from "@/components/BotonCredencial";
import { toPng } from "html-to-image";
import { qrComoDataUrl } from "@/lib/qrImagen.mjs";
import { camposCambiados, copiarValores, hayCambiosPendientes, valoresIguales } from "@/lib/cambiosPendientes.mjs";
import { useGuardiaSalida } from "@/components/cambios/CambiosPendientes";
import EstadoCambios from "@/components/cambios/EstadoCambios";
import { fechaParaInput } from "@/lib/fechaInput.mjs";

// (23/11/2026) Campos que no cuentan como «cambios sin guardar»: las horas por día y de comida se recalculan solas a
// partir de los horarios (que sí cuentan) y el rostro se revisa aparte (solo cuenta si RH capturó uno nuevo).
const NO_CUENTAN_COMO_CAMBIO = ["hrs_por_dia", "hrs_de_comida", "descriptor_facial"];

export default function FormularioEmpleado({
  modoFormulario,
  setModoFormulario,
  editar = false,
  values = null,
  page,
  limit,
  // Solo para mostrar la ficha sin editar. Desde el 23/11/2026 la ficha abre siempre editable («en cuanto entre ya pueda
  // editar»); no hay un permiso de «ver sin editar» en el panel (lo decide el servidor al guardar).
  soloLectura = false,
  onClose,
  mutate,
  // (21/11/2026) Ficha flotante desde otras pantallas (components/empleado/FichaEmpleado.jsx).
  textoRegresar = "Regresar a la tabla",
  enVentana = false,
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

  const [contactosEmergencia, setContactosEmergencia] = useState([]);
  // (23/11/2026) 5 pestañas: personal · trabajo · checador · pago · documentos.
  const [tab, setTab] = useState("personal");
  // (22/11/2026) Al editar, el rostro solo se envía si RH capturó uno nuevo: así guardar la ficha no pisa el rostro que la
  // persona haya actualizado desde su app mientras la ficha estaba abierta. (23/11/2026) También cuenta como cambio sin
  // guardar.
  const [rostroNuevo, setRostroNuevo] = useState(false);
  // (23/11/2026) Valores con los que abrió la ficha (o con los que se guardó por última vez): contra ellos se decide si
  // hay cambios sin guardar. Lo que llega del servidor después de abrir (turno asignado, áreas) se suma con
  // sincronizarCampo para no contarlo como cambio.
  const [base, setBase] = useState(null);
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
      campos_personalizados: {},
      apellido_materno: "",
      apellido_paterno: "",
      correo: "",
      correo_notificaciones: "",
      curp: "",
      departamento: "",
      direccion: "",
      estado_civil: "", // (23/11/2026) es texto (combobox): «sin-seleccion» se mostraba tal cual
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
      medio_pago: "",
      monto_transferencia: "",
      banco: "",
      otro_banco: "",
      tipo_cuenta: "Cuenta",
      numero_cuenta: "",
      solicitar_gps: "",
      lugar_checkin: null,
      lugar_checkout: null,
      checar_gps: false,
      enviar_asistencia_automatica: false,
      autoriza_horas_extra: false,
      cc_vacaciones: "",
      cc_permisos: "",
      cierre_turno: "Automático",
      areasAsignadas: [],
      new_pass: "",
      confirm_pass: "",
      horarios: defaultHorarios,
      tipo_horario: "personalizado",
      id_turno: null,
    },
  });

  const fijarBase = useCallback(() => setBase(copiarValores(form.getValues())), [form]);
  const sincronizarCampo = useCallback((campo, valor) => {
    // (24/11/2026) También es el nuevo «valor original» del formulario, para que solo cuente lo que la persona toque.
    // resetField solo actúa sobre campos registrados: tipo_horario, id_turno o areasAsignadas no tienen input propio.
    form.register(campo);
    form.resetField(campo, { defaultValue: copiarValores(valor) });
    setBase((b) => (b ? { ...b, [campo]: copiarValores(valor) } : b));
  }, [form]);
  // Empleado nuevo: la base son los valores vacíos con los que abre.
  useEffect(() => {
    if (!values) fijarBase();
  }, [values, fijarBase]);

  const empresaCampos = form.watch("id_empresa");
  const { campos: camposConfigurados, error: errorCampos, isLoading: cargandoCampos } = useCamposPersonalizados(empresaCampos);
  const empresaCamposAnterior = useRef(null);
  useEffect(() => {
    if (empresaCamposAnterior.current && empresaCamposAnterior.current !== String(empresaCampos)) {
      form.setValue("campos_personalizados", {});
    }
    empresaCamposAnterior.current = empresaCampos ? String(empresaCampos) : null;
  }, [empresaCampos, form]);

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
      sincronizarCampo("id_empresa", dataUser.empresas[0]);
    }
  }, [dataUser, editar, sincronizarCampo]);

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

      console.log("VALUES EMPLEADO:", values);
      console.table(Object.entries(values).filter(([_, v]) => v === null));

      form.reset({
        ...restoEmpleado,
        campos_personalizados: parseCampos(restoEmpleado.campos_personalizados),
        fecha_nacimiento: fechaParaInput(restoEmpleado.fecha_nacimiento),
        fecha_ingreso: fechaParaInput(restoEmpleado.fecha_ingreso),

        nip: restoEmpleado.nip ?? "",
        periodo_pago: restoEmpleado.periodo_pago ?? "sin-seleccion",
        forma_pago: restoEmpleado.forma_pago ?? "sin-seleccion",
        forma_calculo: restoEmpleado.forma_calculo ?? "sin-seleccion",
        medio_pago: restoEmpleado.medio_pago ?? "",
        monto_transferencia: restoEmpleado.monto_transferencia ?? "",

        cc_vacaciones: restoEmpleado.cc_vacaciones ?? "",
        cc_permisos: restoEmpleado.cc_permisos ?? "",
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
        sueldo: restoEmpleado.sueldo ?? null,
        porcentaje: restoEmpleado.porcentaje ?? null,
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
        confirm_pass: "",

        tipo_horario: "personalizado",
        id_turno: null,
      });
      fijarBase();
      setTab("personal");
    }
  }, [editar, values, soloLectura]);

  const formaCalculo = form.watch("forma_calculo");

  useEffect(() => {
    // Si la forma de cálculo es la guardada, limpiar el otro campo es parte de abrir la ficha, no un cambio.
    const limpiar = (campo) => {
      if (base && valoresIguales(base.forma_calculo, formaCalculo)) sincronizarCampo(campo, null);
      else form.setValue(campo, null, { shouldValidate: false });
    };
    if (formaCalculo === "$") limpiar("porcentaje");
    else if (formaCalculo === "%") limpiar("sueldo");
    // Solo al cambiar la forma de cálculo: con `base` en las dependencias se volvería a correr en cada sincronización.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const obtenerPrimerMensajeError = (errorObj) => {
      if (!errorObj) return null;

      if (errorObj.message) return errorObj.message;
      if (errorObj.root?.message) return errorObj.root.message;

      if (Array.isArray(errorObj)) {
        for (const item of errorObj) {
          const mensaje = obtenerPrimerMensajeError(item);
          if (mensaje) return mensaje;
        }
      }

      if (typeof errorObj === "object") {
        for (const key of Object.keys(errorObj)) {
          const mensaje = obtenerPrimerMensajeError(errorObj[key]);
          if (mensaje) return mensaje;
        }
      }

      return null;
    };

    const firstErrorKey = Object.keys(errors)[0];
    const mensaje =
      obtenerPrimerMensajeError(errors[firstErrorKey]) ||
      "Faltan campos obligatorios por llenar";

    enqueueSnackbar(`⚠️ ${mensaje}`, { variant: "warning" });

    const tabsConErrores = {
      personal: [
        "nombre",
        "apellido_paterno",
        "apellido_materno",
        "correo",
        "correo_notificaciones",
        "curp",
        "telefono",
        "rfc",
      ],
      trabajo: ["id_empresa", "puesto", "sucursal", "hrs_por_dia", "hrs_de_comida", "horarios"],
      checador: ["new_pass", "confirm_pass", "nip"],
      pago: [
        "periodo_pago",
        "forma_pago",
        "forma_calculo",
        "sueldo",
        "porcentaje",
        "medio_pago",
        "monto_transferencia",
        "banco", "otro_banco", "numero_cuenta", "tipo_cuenta",
      ],
    };

    const tabConError = Object.entries(tabsConErrores).find(([_, campos]) =>
      campos.includes(firstErrorKey),
    );

    if (tabConError) {
      setTab(tabConError[0]);
    }

    form.setFocus(firstErrorKey);
  };

  const onValidSubmit = async ({ confirm_pass, ...data }) => {
    const tipoHorario = form.getValues("tipo_horario") || "personalizado";
    const idTurno = form.getValues("id_turno");

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
      setTab("trabajo");
      return false;
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
            nip: data.nip,
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
        return false;
      }

      if (existeCurp) {
        enqueueSnackbar("Ya existe un empleado con esa CURP", {
          variant: "warning",
        });
        return false;
      }
      if (existeRfc) {
        enqueueSnackbar("Ya existe un empleado con ese RFC", {
          variant: "warning",
        });
        return false;
      }
      if (existeNss) {
        enqueueSnackbar("Ya existe un empleado con ese NSS", {
          variant: "warning",
        });
        return false;
      }

      if (existeNip) {
        enqueueSnackbar("Ya existe un empleado con ese NIP", {
          variant: "warning",
        });
        return false;
      }

      if (tipoHorario === "turno" && !idTurno) {
        enqueueSnackbar("Debes seleccionar un turno", {
          variant: "warning",
        });
        setTab("trabajo");
        return false;
      }

      if (errorCampos || cargandoCampos) {
        enqueueSnackbar("Espera a que se carguen los campos personalizados antes de guardar.", { variant: "warning" });
        return false;
      }
      const formData = new FormData();

      delete data.nombre_empresa;
      if (editar && !rostroNuevo) delete data.descriptor_facial;

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
          return false;
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

      let idEmpleadoFinal = editar ? values.id_empleado : null;

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

        idEmpleadoFinal = values.id_empleado;
      } else {
        const responseCrear = await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        idEmpleadoFinal = responseCrear.data?.id;
      }

      if (!idEmpleadoFinal) {
        throw new Error("No se pudo obtener el ID del empleado");
      }

      // CONTACTOS_EMERGENCIA_POST_CREACION
      // El empleado ya existe: un error aquí no debe provocar
      // que el usuario intente crearlo nuevamente.
      if (!editar && contactosEmergencia.length > 0) {
        const urlContactos =
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/${idEmpleadoFinal}/contactos-emergencia`;

        let guardados = 0;
        let fallidos = 0;

        // Primero los secundarios, al final el principal.
        const ordenados = [...contactosEmergencia].sort(
          (a, b) => Number(a.es_principal) - Number(b.es_principal)
        );

        for (const contacto of ordenados) {
          try {
            await axios.post(urlContactos, contacto);
            guardados++;
          } catch (errorContacto) {
            console.error(
              "Error al guardar contacto de emergencia:",
              errorContacto
            );
            fallidos++;
          }
        }

        if (fallidos > 0) {
          enqueueSnackbar(
            `Empleado creado. Contactos guardados: ${guardados}. Contactos pendientes: ${fallidos}. Puedes agregarlos desde su expediente.`,
            { variant: "warning", autoHideDuration: 10000 }
          );
        }

        setContactosEmergencia([]);
      }

      // En creación, el turno se asigna dentro del mismo POST /empleados
      // para que empleado + turno sean una sola transacción en backend.
      // En edición se conserva el endpoint independiente.
      if (editar && tipoHorario === "turno") {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/turnos/${idTurno}/asignar`,
          {
            id_empleado: Number(idEmpleadoFinal),
          },
        );
      } else if (editar) {
        try {
          await axios.delete(
            `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/${idEmpleadoFinal}/turno`,
          );
        } catch (errorTurno) {
          if (errorTurno?.response?.status !== 404) {
            throw errorTurno;
          }
        }
      }

      if (editar) {
        enqueueSnackbar("Cambios guardados", {
          variant: "success",
        });

        // (23/11/2026) Lo guardado es la nueva base: ya no hay cambios pendientes. Se queda en la pestaña donde estaba.
        setSelectedFile(null);
        setRostroNuevo(false);
        // Lo guardado pasa a ser el «valor original» (base y valores por omisión del formulario).
        form.reset(form.getValues());
        fijarBase();
      } else {
        enqueueSnackbar("Empleado registrado", {
          variant: "success",
        });

        setTab("personal");
        onClose?.();
        setModoFormulario(false);
      }

      mutate();
      return true;
    } catch (error) {
      console.log(error);
      const status = error.response?.status;
      const mensaje =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error desconocido";

      if (status === 403) {
        // En app nativa no mostrar enlace externo de suscripción
        enqueueSnackbar(
          isNativeClient() ? (
            mensaje
          ) : (
            <span>
              {mensaje}{" "}
              <a href="/panel/mi-suscripcion" className="underline font-semibold">
                Mejorar plan →
              </a>
            </span>
          ),
          { variant: "warning", autoHideDuration: 6000 },
        );
      } else {
        enqueueSnackbar(mensaje, { variant: "error" });
      }
      return false;
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

  // (23/11/2026) ¿Hay algo que se perdería al salir? Valores del formulario contra la base, más lo que se guarda con la
  // ficha sin vivir en el formulario: foto nueva, rostro capturado con la cámara y, en un empleado nuevo, los contactos de
  // emergencia en borrador. No cuentan: «Continuar desde el celular», firma y PIN, consentimiento del rostro, contactos
  // de un empleado ya guardado, bonos y conceptos de pago (se guardan solos en el servidor).
  const valoresActuales = form.watch();
  // (24/11/2026) Solo cuenta lo que la persona tocó (y quedó distinto): abrir la ficha nunca marca cambios aunque el
  // sistema acomode datos al cargar (pasaba con datos reales: «no he movido nada y dice cambios sin guardar»).
  const { dirtyFields } = form.formState;
  const hayCambios = !soloLectura && Boolean(base) && hayCambiosPendientes({
    base,
    actual: valoresActuales,
    ignorar: NO_CUENTAN_COMO_CAMBIO,
    extras: [selectedFile, rostroNuevo, !editar && contactosEmergencia.length > 0],
    tocados: dirtyFields,
  });
  // Qué campos cuentan como cambio (se ve al pasar el mouse por «Cambios sin guardar» y ayuda a diagnosticar).
  const cambiados = base ? camposCambiados(base, valoresActuales, NO_CUENTAN_COMO_CAMBIO, dirtyFields) : [];
  const { isSubmitting } = form.formState;
  // «Guardar y salir» usa exactamente lo mismo que el botón Guardar (validación + servidor); true solo si se guardó.
  const guardar = () => new Promise((resolve) => {
    form.handleSubmit(
      async (datos) => resolve(await onValidSubmit(datos)),
      (errores) => { onInvalidSubmit(errores); resolve(false); },
    )().catch(() => resolve(false));
  });
  const confirmarSalida = useGuardiaSalida({ hayCambios, guardar });
  const regresar = () => confirmarSalida(() => {
    setModoFormulario(false);
    setTab("personal");
  });
  const botonGuardarActivo = !editar || hayCambios;

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

  // Los campos personalizados siguen guardados con su pestaña original (personales, laborales, jornada…): cada sección
  // los pinta con su clave aunque ahora viva dentro de otra pestaña. Así no se mueve ningún dato.
  const renderCamposDe = (pestana) => function camposDePestana(despuesDe, agrupar = false) {
    return <CamposEmpleado form={form} campos={camposConfigurados} soloLectura={soloLectura} pestana={pestana} despuesDe={despuesDe} agrupar={agrupar} />;
  };
  const renderCampos = (despuesDe, agrupar = false) => (
    <CamposEmpleado
      form={form}
      campos={camposConfigurados}
      soloLectura={soloLectura}
      pestana={tab}
      despuesDe={despuesDe}
      agrupar={agrupar}
    />
  );

  return (
    <Form {...form}>
      {/* Contenedor principal: columna fija en mobile, flujo normal en desktop */}
      <div className={`flex flex-col sm:block sm:h-auto ${enVentana ? "h-full" : "h-[calc(100dvh-3.5rem)]"}`}>
        {/* ── Header mobile (oscuro, fijo arriba) ── */}
        <div className="sm:hidden bg-white text-[#080d36] border-b border-slate-200 px-4 pt-3 pb-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 text-[#080d36] active:opacity-70 min-w-0"
              onClick={regresar}
            >
              <Icon
                icon="material-symbols:arrow-back"
                width={20}
                height={20}
                className="shrink-0"
              />
              <span className="text-sm font-semibold truncate">
                {soloLectura || editar
                  ? values
                    ? `${values.nombre} ${values.apellido_paterno}`
                    : "Empleado"
                  : "Nuevo empleado"}
              </span>
            </button>
            {editar && !soloLectura && <EstadoCambios hayCambios={hayCambios} campos={cambiados} />}
          </div>
        </div>

        {/* ── Header desktop (tarjeta blanca) ── */}
        <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex justify-between items-center">
            <button
              type="button"
              className="flex items-center gap-2 text-[#2563EB] hover:text-[#1d4ed8] transition-colors font-medium"
              onClick={regresar}
            >
              <Icon icon="material-symbols:arrow-back" width={20} height={20} />
              <span className="text-sm">{textoRegresar}</span>
            </button>

            <div className="flex items-center gap-3">
              {editar && !soloLectura && <EstadoCambios hayCambios={hayCambios} campos={cambiados} />}
              {soloLectura ? null : (
                <Button
                  type="submit"
                  form="formulario-empleado"
                  data-boton-guardar
                  disabled={!botonGuardarActivo || isSubmitting}
                  className={botonGuardarActivo
                    ? "bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
                    : "bg-gray-100 text-gray-400 font-medium shadow-none disabled:opacity-100"}
                >
                  {isSubmitting ? "Guardando…" : editar ? "Guardar" : "Registrar"}
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
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                    Empleado
                  </p>

                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                    {`${form.watch("nombre")} ${form.watch(
                      "apellido_paterno",
                    )} ${form.watch("apellido_materno")}` || "Nuevo empleado"}
                  </h2>

                  <p className="text-sm text-gray-500 truncate">
                    {form.watch("puesto") || "Sin puesto asignado"}
                  </p>

                  {(soloLectura || editar) && values && (
                    <div className="pt-3">
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
                      src={qrComoDataUrl(nipActual, { celda: 6 })}
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
                    src={qrComoDataUrl(nipActual, { celda: 4 })}
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
                    <TabsTrigger value="personal" className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-5 font-medium">
                      <User className="h-4 w-4 sm:mr-2" />
                      <span className="ml-1.5 whitespace-nowrap text-[13px] sm:ml-0 sm:text-sm">Personal</span>
                    </TabsTrigger>
                    <TabsTrigger value="trabajo" className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-5 font-medium">
                      <BriefcaseBusiness className="h-4 w-4 sm:mr-2" />
                      <span className="ml-1.5 whitespace-nowrap text-[13px] sm:ml-0 sm:text-sm">Trabajo</span>
                    </TabsTrigger>
                    <TabsTrigger value="checador" className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-5 font-medium">
                      <ScanFace className="h-4 w-4 sm:mr-2" />
                      <span className="ml-1.5 whitespace-nowrap text-[13px] sm:ml-0 sm:text-sm">Checador y acceso</span>
                    </TabsTrigger>
                    <TabsTrigger value="pago" className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-5 font-medium">
                      <Wallet className="h-4 w-4 sm:mr-2" />
                      <span className="ml-1.5 whitespace-nowrap text-[13px] sm:ml-0 sm:text-sm">Pago</span>
                    </TabsTrigger>
                    {(values?.id_empleado || camposConfigurados.some(c => c.activo && c.formulario && c.pestana === "documentos")) && (
                      <TabsTrigger
                        value="documentos"
                        className="data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] rounded-none py-2.5 px-3 sm:py-4 sm:px-6 font-medium"
                      >
                        <FolderOpen className="h-4 w-4 sm:mr-2" />
                        <span className="ml-1.5 whitespace-nowrap text-[13px] sm:ml-0 sm:text-sm">Documentos</span>
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
                      {tab === "personal" && (
                        <div className="space-y-6">
                          <TabPersonales renderCampos={renderCamposDe("personales")} form={form} soloLectura={soloLectura} />
                          <TabContactosEmergencia
                            renderCampos={renderCamposDe("emergencia")}
                            empleadoId={values?.id_empleado}
                            soloLectura={soloLectura}
                            borradores={contactosEmergencia}
                            setBorradores={setContactosEmergencia}
                          />
                        </div>
                      )}
                      {tab === "trabajo" && (
                        <div className="space-y-6">
                          <BajaEmpleadoInfo empleado={values} />
                          <TabLaborales seccion="trabajo" renderCampos={renderCamposDe("laborales")} form={form} soloLectura={soloLectura} dataUser={dataUser} sincronizarCampo={sincronizarCampo} />
                          <TabJornada renderCampos={renderCamposDe("jornada")} form={form} soloLectura={soloLectura} empleadoId={values?.id_empleado} sincronizarCampo={sincronizarCampo} />
                        </div>
                      )}
                      {tab === "checador" && (
                        <div className="space-y-6">
                          <TabLaborales seccion="checador" renderCampos={renderCamposDe("laborales")} form={form} soloLectura={soloLectura} dataUser={dataUser} sincronizarCampo={sincronizarCampo}
                            cambiarContrasena={values?.id_empleado && !soloLectura ? <CambiarContrasenaEmpleado empleado={values} conTexto /> : null} />
                          <TabReconocimiento
                            renderCampos={renderCamposDe("reconocimiento")}
                            form={form}
                            soloLectura={soloLectura}
                            active={tab === "checador"}
                            setDescriptor={(descriptor) => {
                              setRostroNuevo(true);
                              form.setValue("descriptor_facial", descriptor);
                            }}
                          />
                        </div>
                      )}
                      {tab === "pago" && (
                        <div className="space-y-6">
                          <TabNomina renderCampos={renderCamposDe("nomina")} form={form} soloLectura={soloLectura} />
                          <TabCuentasBancarias renderCampos={renderCamposDe("cuentas")} form={form} soloLectura={soloLectura} />
                        </div>
                      )}

                      {tab === "documentos" && values?.id_empleado && (
                        <PanelEmpleadoDocumentos
                          renderCampos={renderCampos}
                          idEmpleado={values.id_empleado}
                          idEmpresa={values.id_empresa}
                        />
                      )}
                      {errorCampos && <p role="alert" className="mt-4 text-sm text-red-600">No se pudieron cargar los campos personalizados.</p>}
                      {cargandoCampos && <p className="mt-4 text-sm">Cargando campos personalizados…</p>}
                      {tab === "documentos" && !values?.id_empleado && ["inicio", "encabezado", "filtros", "documentos", "fin"].map(posicion => <Fragment key={posicion}>{renderCampos(posicion, true)}</Fragment>)}
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
              data-boton-guardar
              disabled={!botonGuardarActivo || isSubmitting}
              className={`w-full min-h-[44px] text-sm font-bold py-3 rounded-xl ${botonGuardarActivo
                ? "bg-brand active:bg-blue-800 text-white"
                : "bg-gray-100 text-gray-400"}`}
            >
              {isSubmitting ? "Guardando…" : editar ? "Guardar" : "Registrar empleado"}
            </button>
          )}
        </div>
      </div>
    </Form>
  );
}
