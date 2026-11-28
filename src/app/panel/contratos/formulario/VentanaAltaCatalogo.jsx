"use client";

// Dar de alta un puesto, un departamento o un lugar de trabajo SIN SALIR del contrato (28/11/2026, pedido del dueño). Es
// una sola idea con un campo: va en VENTANA CHICA (docs/sistema-diseno.md). Lo que ya se capturó en el contrato no se
// toca (vive en el estado del formulario, no aquí) y, al guardar, el nombre nuevo queda elegido en su campo.
import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { CampoFormulario, VentanaChica } from "@/components/formulario";
import { prepararFocoCampo } from "@/lib/formulario/focoCampo.mjs";
import { mensajeDeError } from "@/lib/contratos/detalleContrato.mjs";
import { CATALOGOS, crearEnCatalogo } from "./catalogosContrato";

/**
 * alta: { tipo: "puesto" | "departamento" | "lugar", texto, idCampo } o null (cerrada).
 * idEmpresa / empresa: la empresa del contrato (el catálogo es por empresa).
 * alCerrar(); alCreado(tipo, nombre).
 */
export default function VentanaAltaCatalogo({ alta, idEmpresa, empresa = "", alCerrar, alCreado }) {
  const { enqueueSnackbar } = useSnackbar();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const cat = alta ? CATALOGOS[alta.tipo] : null;

  useEffect(() => {
    if (!alta) return;
    setNombre(alta.texto ?? "");
    setError("");
  }, [alta]);

  const guardar = async () => {
    // El foco vuelve al campo del contrato cuando la ventana se cierra (si la persona no se movió a otro lado; INC-012).
    const enfocar = prepararFocoCampo();
    const limpio = nombre.trim().replace(/\s+/g, " ");
    if (!limpio) return setError("Escribe el nombre.");
    setGuardando(true);
    try {
      const r = await crearEnCatalogo(alta.tipo, idEmpresa, limpio);
      enqueueSnackbar(r.yaExistia ? `«${r.nombre}» ya existía en el catálogo y quedó elegido.` : cat.creado(r.nombre), { variant: r.yaExistia ? "info" : "success" });
      alCreado(alta.tipo, r.nombre);
      alCerrar();
      enfocar(alta.idCampo);
    } catch (e) {
      setError(e?.response?.status === 403 ? "No tienes permiso para agregar al catálogo." : mensajeDeError(e, "No se pudo guardar. Intenta de nuevo."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <VentanaChica
      abierta={Boolean(alta)}
      alCambiar={(v) => (v ? null : alCerrar())}
      titulo={cat?.titulo ?? ""}
      descripcion={cat ? `${cat.descripcion}${empresa ? ` Empresa: ${empresa}.` : ""}` : null}
      alGuardar={guardar}
      guardando={guardando}
      deshabilitado={!nombre.trim()}
    >
      <CampoFormulario id="alta-catalogo-nombre" etiqueta={cat?.etiqueta ?? "Nombre"} obligatorio error={error || null}>
        {(p) => <input {...p} value={nombre} onChange={(e) => { setNombre(e.target.value); setError(""); }} autoFocus autoComplete="off" />}
      </CampoFormulario>
    </VentanaChica>
  );
}
