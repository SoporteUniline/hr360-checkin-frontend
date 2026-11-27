"use client";

// Estado y datos del formulario del contrato (27/11/2026, INC-CONTRATO-EDITAR-001). Lo usan la página de editar y la de
// alta (nuevo, duplicar, desde la ficha). Las reglas puras (cómo se llena, qué se valida, qué se manda) están en
// src/lib/contratos/formularioContrato.mjs y tienen pruebas (scripts/test-formulario-contrato.mjs). Antes todo vivía en
// ContratoDialog.jsx.
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import axios from "@/lib/axios";
import Cookies from "js-cookie";
import { contratosApi } from "@/lib/contratosApi";
import { calculosLftApi } from "@/lib/calculosLftApi";
import {
  formularioVacio, formularioDesdeContrato, formularioParaDuplicar, formularioDesdeFicha, validarFormulario, cuerpoDeAlta, cambiosDeEdicion,
  hayCambios, queSePuedeEditar, pestanaDe,
} from "@/lib/contratos/formularioContrato.mjs";

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const conToken = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` } });
const nombreDe = (e) => [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" ");

// Personas y puestos de la empresa (para elegir a la persona, a su jefe y sugerir el puesto).
async function catalogoDeEmpresa(idEmpresa) {
  const [empleados, puestos] = await Promise.all([
    axios.get(`/checador/empleados/activos?empresa=${idEmpresa}&page=1&limit=1000`, conToken()).then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])),
    axios.get(`/checador/empleados/puestos?empresa=${idEmpresa}`, conToken()).then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
  ]);
  const nombrePuesto = new Map(puestos.map((p) => [String(p.id ?? p.id_puesto), p.nombre || p.nombre_puesto || ""]));
  return {
    empleados: empleados
      .map((e) => ({ id: String(e.id_empleado), nombre: nombreDe(e), puesto: nombrePuesto.get(String(e.id_puesto)) || e.puesto || "", departamento: e.departamento || "", fecha_ingreso: e.fecha_ingreso || null }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    puestos: [...new Set(puestos.map((p) => p.nombre || p.nombre_puesto).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
  };
}

/**
 * modo: "editar" (id) | "nuevo" (duplicar: id del contrato a copiar; inicial: { id_empresa, id_empleado, salario_base,
 * periodicidad_pago } desde la ficha). empresas: las de la sesión.
 */
export default function useFormularioContrato({ modo, id = null, duplicar = null, inicial = null, empresas = [], elaboradoPor = null }) {
  const editar = modo === "editar";
  const idFuente = editar ? id : duplicar;
  const detalle = useSWR(idFuente ? ["contrato-detalle", String(idFuente)] : null, () => contratosApi.detalle(idFuente), { revalidateOnFocus: false });
  const contrato = detalle.data?.contrato ?? null;

  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [errores, setErrores] = useState([]);
  const [intentado, setIntentado] = useState(false);
  const llenado = useRef(false);
  const vacacionesTocadas = useRef(false);

  // Llenar UNA vez (al llegar los datos); si después se vuelve a leer el contrato, lo capturado no se pisa.
  useEffect(() => {
    if (llenado.current) return;
    if (idFuente && !contrato) return;
    let f;
    if (editar) f = formularioDesdeContrato(contrato);
    else if (duplicar) f = formularioParaDuplicar(contrato, { hoy: hoy() });
    else if (inicial?.id_empleado) f = formularioDesdeFicha(inicial);
    else f = formularioVacio();
    llenado.current = true;
    setOriginal(f);
    setForm(f);
  }, [idFuente, contrato, editar, duplicar, inicial]);

  // Lo que el sistema llena solo (empresa única, vacaciones de ley) no cuenta como «cambio sin guardar».
  const autollenar = (campo, valor, cuando) => {
    setForm((f) => (f && cuando(f) ? { ...f, [campo]: valor } : f));
    setOriginal((o) => (o && cuando(o) ? { ...o, [campo]: valor } : o));
  };

  // Con una sola empresa, es esa (la sesión puede llegar después que el formulario).
  const unicaEmpresa = !editar && empresas.length === 1 ? String(empresas[0].id_empresa) : "";
  useEffect(() => {
    if (unicaEmpresa) autollenar("id_empresa", unicaEmpresa, (x) => !x.id_empresa);
  }, [unicaEmpresa, form?.id_empresa]);

  const idEmpresa = form?.id_empresa || "";
  const catalogo = useSWR(idEmpresa ? ["contrato-catalogo", idEmpresa] : null, () => catalogoDeEmpresa(idEmpresa), { revalidateOnFocus: false });
  const empleados = useMemo(() => catalogo.data?.empleados ?? [], [catalogo.data]);
  const persona = empleados.find((e) => e.id === form?.id_empleado) ?? null;

  // Vacaciones de ley (art. 76, tabla 2023) a la fecha de inicio según la antigüedad; las calcula el servidor (motor LFT).
  const ingreso = String(persona?.fecha_ingreso ?? contrato?.fecha_ingreso ?? "").slice(0, 10) || null;
  const inicio = form?.fecha_inicio || "";
  const ley = useSWR(inicio ? ["vacaciones-ley", ingreso, inicio] : null, () => calculosLftApi.vacacionesLey({ fechaIngreso: ingreso && ingreso <= inicio ? ingreso : inicio, fecha: inicio }), { revalidateOnFocus: false });
  const vacacionesLey = useMemo(() => (ley.data?.dias ? { dias: Number(ley.data.dias), anio: ley.data.anio_servicio } : null), [ley.data]);
  // En un contrato nuevo se proponen mientras RH no cambie el campo (como antes).
  useEffect(() => {
    if (editar || !vacacionesLey || vacacionesTocadas.current) return;
    autollenar("dias_vacaciones", String(vacacionesLey.dias), (x) => String(x.dias_vacaciones) !== String(vacacionesLey.dias));
  }, [editar, vacacionesLey]);

  const cambiar = (campo, valor) => {
    if (campo === "dias_vacaciones") vacacionesTocadas.current = true;
    setForm((f) => {
      const nuevo = { ...f, [campo]: valor };
      if (campo === "id_empresa" && valor !== f.id_empresa) Object.assign(nuevo, { id_empleado: "", jefe_inmediato_id: "" });
      // Al elegir a la persona se sugiere su puesto y área de la ficha (solo si están vacíos).
      if (campo === "id_empleado") {
        const e = empleados.find((x) => x.id === valor);
        if (e) Object.assign(nuevo, { puesto: f.puesto || e.puesto, departamento: f.departamento || e.departamento });
      }
      return nuevo;
    });
  };

  const revisar = (f = form) => validarFormulario(f, { modo: editar ? "editar" : "nuevo", vacacionesLey: vacacionesLey?.dias ?? null, original: editar ? original : null });
  // Después del primer intento, los errores se actualizan mientras se corrige.
  useEffect(() => { if (intentado && form) setErrores(revisar(form)); }, [form, intentado]); // eslint-disable-line react-hooks/exhaustive-deps

  const permiso = editar && contrato ? queSePuedeEditar(contrato) : { editable: true, motivo: null };
  const sucio = Boolean(form && original && permiso.editable && hayCambios(original, form));

  /** Guarda. → { ok, id?, mensaje?, sinCambios?, pestana? } (no lanza). */
  const guardar = async () => {
    setIntentado(true);
    const errs = revisar(form);
    setErrores(errs);
    if (errs.length) return { ok: false, pestana: pestanaDe(errs[0].campo), campo: errs[0].campo };
    try {
      if (editar) {
        const cuerpo = cambiosDeEdicion(original, form);
        if (!Object.keys(cuerpo).length) return { ok: true, id, sinCambios: true };
        await contratosApi.actualizar(id, cuerpo);
        await detalle.mutate();
        return { ok: true, id };
      }
      // (No se marca «sin cambios» aquí: la pantalla navega enseguida; ver alGuardar en FormularioContrato.)
      const r = await contratosApi.crear(cuerpoDeAlta(form, { duplicaDe: duplicar, elaboradoPor }));
      return { ok: true, id: r?.id, folio: r?.folio, cerrados: r?.cerrados ?? [] };
    } catch (e) {
      return { ok: false, error: e };
    }
  };

  return {
    cargando: (idFuente && detalle.isLoading) || !form, error: detalle.error ?? null, datos: detalle.data ?? null, contrato, mutarDetalle: detalle.mutate,
    form, original, cambiar, errores, guardar, sucio, permiso, empleados, puestos: catalogo.data?.puestos ?? [], cargandoPersonas: catalogo.isLoading,
    persona, vacacionesLey,
  };
}
