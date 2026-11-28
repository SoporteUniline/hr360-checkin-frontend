"use client";

// Registrar un préstamo desde RH (Nómina R2). Queda aprobado y se envía el acuerdo para que la persona lo firme en
// Mi espacio; mientras no firme, no se descuenta. Antes de guardar se piden al backend el plan y los avisos (simular).
// (27/11/2026, aprobado por el dueño) Es una PÁGINA (/panel/nomina/prestamos/nuevo), no una ventana
// (docs/vistas-de-detalle.md, regla 7). El dato principal es «¿En cuántos pagos?» con la palabra del periodo de la
// persona («6 quincenas»); la opción «Prefiero poner cuánto por nómina» es el modo de antes. Guardar y Cancelar siempre a
// la vista (barra fija en celular) y aviso si sales con cambios sin guardar.
// (28/11/2026) Con las piezas del sistema de diseño (docs/sistema-diseno.md): encabezado gris, una sección con franja y
// la barra de acciones pegada abajo (Cancelar a la izquierda, «Registrar y enviar a firma» azul a la derecha).
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { useGuardiaSalida } from "@/components/cambios/CambiosPendientes";
import { BarraAccionesFormulario, EncabezadoPagina, PaginaFormulario, SeccionFormulario } from "@/components/formulario";
import { mensajeError, SelectorEmpresa, useEmpresaNomina } from "./comun";
import SelectorEmpleado from "./SelectorEmpleado";
import { CAMPO, ETIQUETA, CamposPlan, ResumenSimulacion, cuerpoPlan, useSimulacionPrestamo } from "./PlanPrestamo";

const VACIO = { id_empleado: "", monto: "", modo: "pagos", num_pagos: "", abono: "", motivo: "" };
const LISTA = "/panel/nomina/prestamos";

export default function RegistrarPrestamo() {
  const router = useRouter();
  const params = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const empresa = useEmpresaNomina(Number(params.get("empresa")) || null);
  const [f, setF] = useState(VACIO);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const plan = cuerpoPlan(f);
  const simulacion = useSimulacionPrestamo("/checador/nomina/prestamos", f.id_empleado && plan ? { id_empleado: Number(f.id_empleado), ...plan } : null);
  // La palabra del periodo («quincenas») se recuerda por persona: no se pierde al cambiar de modo o borrar un campo.
  const [periodos, setPeriodos] = useState({});
  const delPlan = simulacion.info?.plan?.periodo_pago;
  useEffect(() => {
    if (delPlan && f.id_empleado) setPeriodos((p) => (p[f.id_empleado] === delPlan ? p : { ...p, [f.id_empleado]: delPlan }));
  }, [delPlan, f.id_empleado]);
  const periodo = delPlan ?? periodos[f.id_empleado] ?? null;
  // No se marca «sin cambios» al guardar: la guardia haría back() a la vez que la navegación (ver FormularioContrato).
  const sucio = Boolean(f.id_empleado || f.monto || f.num_pagos || f.abono || f.motivo);

  const guardar = async () => {
    if (guardando) return { ok: false };
    if (!f.id_empleado || !plan) {
      setError(!f.id_empleado ? "Elige a la persona." : f.modo === "abono" ? "Escribe el monto y el abono." : "Escribe el monto y en cuántos pagos (un número entero, 1 o más).");
      return { ok: false };
    }
    setGuardando(true);
    setError("");
    try {
      const r = await axios.post("/checador/nomina/prestamos", { id_empleado: Number(f.id_empleado), ...plan, motivo: f.motivo });
      return { ok: true, datos: r.data };
    } catch (err) {
      setError(mensajeError(err, "No se pudo registrar el préstamo."));
      return { ok: false };
    } finally {
      setGuardando(false);
    }
  };
  const confirmarSalida = useGuardiaSalida({ hayCambios: sucio, guardar: async () => (await guardar()).ok });
  // Mientras hay cambios, la guardia deja una entrada extra en el historial: se reemplaza en lugar de agregar otra.
  const ir = (ruta) => (window.history.state?.__cambiosPendientes ? router.replace(ruta) : router.push(ruta));
  const alGuardar = async (e) => {
    e?.preventDefault?.();
    const r = await guardar();
    if (!r.ok) return;
    enqueueSnackbar(r.datos.aviso_acuerdo ?? "Préstamo registrado. Se envió el acuerdo para que lo firme en Mi espacio.", { variant: r.datos.aviso_acuerdo ? "warning" : "success" });
    ir(`${LISTA}/${r.datos.id}`);
  };
  const cancelar = () => confirmarSalida(({ reemplazar } = {}) => (reemplazar ? router.replace(LISTA) : router.push(LISTA)), { navega: true });

  return (
    <PaginaFormulario
      data-formulario-prestamo
      encabezado={<EncabezadoPagina completo volver={{ href: LISTA, texto: "Préstamos" }} titulo="Registrar préstamo"
        descripcion="Sin intereses. La persona firma el acuerdo en Mi espacio y desde la siguiente nómina se descuenta." />}
      barra={<BarraAccionesFormulario etiqueta="Guardar o cancelar"
        cancelar={{ onClick: cancelar, deshabilitado: guardando }}
        principal={{ texto: guardando ? "Guardando…" : "Registrar y enviar a firma", type: "submit", form: "formulario-prestamo", cargando: guardando }} />}
    >
      <form id="formulario-prestamo" onSubmit={alGuardar} noValidate aria-label="Registrar préstamo" className="max-w-3xl">
        <SeccionFormulario titulo="Préstamo" descripcion="A quién, cuánto y en cuántos pagos se descuenta." columnas={1}>
          {empresa.empresas.length > 1 ? <SelectorEmpresa {...empresa} setIdEmpresa={(v) => { empresa.setIdEmpresa(v); setF({ ...f, id_empleado: "" }); }} /> : null}
          {empresa.idEmpresa ? <SelectorEmpleado idEmpresa={empresa.idEmpresa} value={f.id_empleado} onChange={(v) => setF({ ...f, id_empleado: v })} requerido grande /> : null}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={ETIQUETA}>
              Monto prestado
              <input className={CAMPO} inputMode="decimal" type="number" min="0.01" step="0.01" required value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} />
            </label>
            <CamposPlan valor={f} onCambio={(v) => setF({ ...f, ...v })} periodo={periodo} idBase="rh-prestamo" />
          </div>
          {!f.id_empleado && plan ? <p className="m-0 text-texto-secundario">Elige a la persona para ver en qué periodo se le paga y el calendario de descuentos.</p> : null}
          <ResumenSimulacion simulacion={simulacion} onUsarPagos={(n) => setF({ ...f, modo: "pagos", num_pagos: String(n) })} />
          <label className={ETIQUETA}>
            Motivo (opcional)
            <input className={CAMPO} maxLength={300} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} />
          </label>
          {error ? <p role="alert" className="m-0 rounded-boton bg-estado-error px-4 py-3 text-estado-error-texto">{error}</p> : null}
        </SeccionFormulario>
      </form>
    </PaginaFormulario>
  );
}
