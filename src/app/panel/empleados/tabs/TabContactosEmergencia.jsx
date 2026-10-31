"use client";

import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { useSnackbar } from "notistack";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, Phone, Mail, Star,
  ChevronLeft, ChevronRight, X, Save, Loader2,
} from "lucide-react";

const VACIO = {
  nombre: "",
  parentesco: "",
  telefono: "",
  celular: "",
  correo: "",
  direccion: "",
  observaciones: "",
  es_principal: false,
};

const CAMPOS = [
  ["nombre", "Nombre completo", true],
  ["parentesco", "Parentesco", true],
  ["telefono", "Teléfono", false],
  ["celular", "Celular", false],
  ["correo", "Correo electrónico", false],
  ["direccion", "Dirección", false],
  ["observaciones", "Observaciones", false],
];

const base = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados`;

export default function TabContactosEmergencia({
  renderCampos = () => null,
  empleadoId,
  soloLectura = false,
  borradores = [],
  setBorradores,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [contactos, setContactos] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [contactoAEliminar, setContactoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const esNuevo = !empleadoId;
  const limite = 20;

  async function cargar(p = pagina) {
    if (!empleadoId) return;
    setCargando(true);
    try {
      const { data } = await axios.get(
        `${base}/${empleadoId}/contactos-emergencia`,
        { params: { page: p, limit: limite } }
      );
      setContactos(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error || "No se pudieron cargar los contactos",
        { variant: "error" }
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (empleadoId) cargar(1);
  }, [empleadoId]);

  const lista = esNuevo ? borradores : contactos;

  function abrir(contacto = null, indice = null) {
    setEditando(contacto ? (esNuevo ? indice : contacto.id_contacto) : null);
    setFormulario(
      contacto
        ? {
            ...VACIO,
            ...contacto,
            es_principal: Boolean(contacto.es_principal),
          }
        : { ...VACIO }
    );
  }

  function cambiar(campo, valor) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardar() {
    const datos = {
      ...formulario,
      nombre: formulario.nombre.trim(),
      parentesco: formulario.parentesco.trim(),
      telefono: formulario.telefono?.trim() || "",
      celular: formulario.celular?.trim() || "",
      correo: formulario.correo?.trim() || "",
      es_principal: Boolean(formulario.es_principal),
    };

    if (!datos.nombre || !datos.parentesco) {
      enqueueSnackbar("Nombre y parentesco son obligatorios", {
        variant: "warning",
      });
      return;
    }

    if (!datos.telefono && !datos.celular) {
      enqueueSnackbar("Captura al menos un teléfono o celular", {
        variant: "warning",
      });
      return;
    }

    if (esNuevo) {
      let nuevos = [...borradores];

      if (editando !== null) {
        nuevos[editando] = datos;
      } else {
        nuevos.push(datos);
      }

      if (datos.es_principal) {
        const principal = editando !== null ? editando : nuevos.length - 1;
        nuevos = nuevos.map((c, i) => ({
          ...c,
          es_principal: i === principal,
        }));
      }

      setBorradores(nuevos);
      setFormulario(null);
      return;
    }

    setGuardando(true);

    try {
      const url = `${base}/${empleadoId}/contactos-emergencia`;

      if (editando !== null) {
        await axios.put(`${url}/${editando}`, datos);
      } else {
        await axios.post(url, datos);
      }

      enqueueSnackbar("Contacto guardado correctamente", {
        variant: "success",
      });

      setFormulario(null);
      await cargar(editando === null ? 1 : pagina);
      if (editando === null) setPagina(1);
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error || "No se pudo guardar el contacto",
        { variant: "error" }
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!contactoAEliminar || eliminando || soloLectura) return;
    const { contacto, indice } = contactoAEliminar;

    if (esNuevo) {
      setBorradores((actual) => actual.filter((_, i) => i !== indice));
      setContactoAEliminar(null);
      return;
    }

    setEliminando(true);
    try {
      await axios.delete(
        `${base}/${empleadoId}/contactos-emergencia/${contacto.id_contacto}`
      );

      enqueueSnackbar("Contacto eliminado", { variant: "success" });
      setContactoAEliminar(null);
      const nuevaPagina =
        contactos.length === 1 && pagina > 1 ? pagina - 1 : pagina;
      setPagina(nuevaPagina);
      await cargar(nuevaPagina);
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error || "No se pudo eliminar",
        { variant: "error" }
      );
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="space-y-5">
      {renderCampos("inicio", true)}
      <AlertDialog
        open={Boolean(contactoAEliminar) && !soloLectura}
        onOpenChange={(open) => {
          if (!open && !eliminando) setContactoAEliminar(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl bg-white sm:max-w-md">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 size={24} aria-hidden="true" />
            </div>
            <AlertDialogTitle>¿Eliminar contacto de emergencia?</AlertDialogTitle>
            <AlertDialogDescription className="break-words text-gray-500">
              Vas a eliminar a <strong className="font-semibold text-gray-900">{contactoAEliminar?.contacto.nombre}</strong> de los contactos de emergencia.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={eliminando} className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={eliminando}
              onClick={(event) => {
                event.preventDefault();
                eliminar();
              }}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              {eliminando && <Loader2 size={16} className="animate-spin" />}
              {eliminando ? "Eliminando..." : "Eliminar contacto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Contactos de emergencia
          </h3>
          <p className="text-sm text-gray-500">
            {esNuevo
              ? "Los contactos se guardarán al registrar al empleado."
              : `${total} contacto${total === 1 ? "" : "s"} registrado${total === 1 ? "" : "s"}`}
          </p>
        </div>

        {!soloLectura && (
          <button
            type="button"
            onClick={() => abrir()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={17} />
            Agregar contacto
          </button>
        )}
      </div>

      {renderCampos("encabezado", true)}

      {formulario && !soloLectura && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">
              {editando !== null ? "Editar contacto" : "Nuevo contacto"}
            </h4>
            <button type="button" onClick={() => setFormulario(null)}>
              <X size={20} />
            </button>
          </div>

          <div className="employee-fields">
            {CAMPOS.map(([campo, etiqueta, obligatorio]) => (
              <label
                key={campo}
                className={
                  campo === "direccion" || campo === "observaciones"
                    ? "space-y-1 sm:col-span-2"
                    : "space-y-1"
                }
              >
                <span className="text-sm font-medium text-gray-700">
                  {etiqueta}{obligatorio ? " *" : ""}
                </span>
                <input
                  type={campo === "correo" ? "email" : "text"}
                  value={formulario[campo] || ""}
                  maxLength={
                    campo === "observaciones" ? 10000 :
                    campo === "direccion" ? 500 :
                    campo === "nombre" || campo === "correo" ? 150 :
                    campo === "parentesco" ? 80 : 25
                  }
                  onChange={(e) => cambiar(campo, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formulario.es_principal}
              onChange={(e) => cambiar("es_principal", e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            Marcar como contacto principal
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormulario(null)}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={guardar}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar contacto
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Cargando contactos...
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <Phone className="mx-auto mb-3 text-gray-400" size={28} />
          <p className="font-medium text-gray-700">Sin contactos registrados</p>
          <p className="mt-1 text-sm text-gray-500">
            Agrega a las personas que deban ser notificadas en una emergencia.
          </p>
        </div>
      ) : (
        <div className="employee-fields employee-fields-compact">
          {lista.map((contacto, indice) => (
            <div
              key={contacto.id_contacto || indice}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-gray-900 break-words">
                      {contacto.nombre}
                    </h4>
                    {Boolean(contacto.es_principal) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        <Star size={12} />
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {contacto.parentesco}
                  </p>
                </div>

                {!soloLectura && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => abrir(contacto, indice)}
                      className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactoAEliminar({ contacto, indice })}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                {contacto.telefono && (
                  <p className="flex items-center gap-2">
                    <Phone size={15} /> Tel: {contacto.telefono}
                  </p>
                )}
                {contacto.celular && (
                  <p className="flex items-center gap-2">
                    <Phone size={15} /> Cel: {contacto.celular}
                  </p>
                )}
                {contacto.correo && (
                  <p className="flex items-center gap-2 break-all">
                    <Mail size={15} className="shrink-0" />
                    {contacto.correo}
                  </p>
                )}
                {contacto.direccion && <p>{contacto.direccion}</p>}
                {contacto.observaciones && (
                  <p className="text-gray-500">{contacto.observaciones}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {renderCampos("contactos", true)}

      {!esNuevo && total > limite && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={pagina === 1 || cargando}
            onClick={() => {
              setPagina(pagina - 1);
              cargar(pagina - 1);
            }}
            className="rounded-lg border p-2 disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-gray-600">
            Página {pagina} de {Math.ceil(total / limite)}
          </span>
          <button
            type="button"
            disabled={pagina >= Math.ceil(total / limite) || cargando}
            onClick={() => {
              setPagina(pagina + 1);
              cargar(pagina + 1);
            }}
            className="rounded-lg border p-2 disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
      {renderCampos("fin", true)}
    </div>
  );
}
