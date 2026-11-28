"use client";
// Ficha → Checador y acceso → Reconocimiento facial. Registro GUIADO en 5 poses con la cámara de la computadora
// (useCapturaRostro + CapturaGuiada, el mismo detector rápido del reloj al checar): las huellas quedan en el formulario y se
// guardan al guardar la ficha (descriptores [{ pose, descriptor }] + descriptor_facial con la de frente). Antes era una
// sola foto con otro detector (SSD), que no coincidía con el del reloj.
import { buttonVariants } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ConsentimientoRostro from "./ConsentimientoRostro";
import AvisoRostroApp from "./AvisoRostroApp";
import FirmaPinRh from "./FirmaPinRh";
import RostroCelular from "./RostroCelular";
import ProbarRostro from "./ProbarRostro";
import RostroRhResumen from "./RostroRhResumen";
import { useSWRConfig } from "swr";
import { Camera, ScanFace } from "lucide-react";
import { mensajeListo } from "@/lib/rostro/enlaceCelular.mjs";
import { useCapturaRostro } from "@/components/rostro/useCapturaRostro";
import CapturaGuiada from "@/components/rostro/CapturaGuiada";
import { OVALO_FICHA } from "@/lib/rostro/guia.mjs";

export default function TabReconocimiento({
  renderCampos = () => null,
  form,
  setDescriptor,
  soloLectura,
  active,
}) {
  const { dataUser } = useAuth();
  const valores = form?.getValues?.() ?? {};
  const idEmpresa = valores.id_empresa;
  const empresaNombre = (dataUser?.empresas_detalle ?? []).find((e) => Number(e.id_empresa) === Number(idEmpresa))?.nombre;
  const nombreEmpleado = [valores.nombre, valores.apellido_paterno, valores.apellido_materno].filter(Boolean).join(" ");
  const [rostroCelular, setRostroCelular] = useState(false);
  const [capturadas, setCapturadas] = useState(0); // fotos tomadas en esta ficha (se guardan al guardar)
  const captura = useCapturaRostro({ ovalo: OVALO_FICHA });
  const { fase, encender, cancelar, registrarGuiado, camaraVisible, aviso } = captura;
  const bloqueRef = useRef(null);
  const { mutate } = useSWRConfig();
  // Registrado desde el celular: se actualiza el estado y el aviso del rostro de la ficha, sin recargar.
  // No se toca el formulario: al guardar la ficha no se reenvía un rostro (ver rostroCapturado en FormularioEmpleado).
  const idEmpleadoFicha = valores.id_empleado;
  const alRegistrarDesdeCelular = useCallback(() => {
    setRostroCelular(true);
    if (idEmpleadoFicha) mutate(`/checador/mi-espacio/rostro/empleado/${idEmpleadoFicha}`);
  }, [idEmpleadoFicha, mutate]);

  // Al salir de la pestaña se apaga la cámara.
  useEffect(() => { if (!active) cancelar(); }, [active, cancelar]);

  const registrar = useCallback(async () => {
    bloqueRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    if (!(await encender())) return;
    await registrarGuiado((descriptores, frente) => {
      setDescriptor(frente, descriptores);
      setCapturadas(descriptores.length);
    }, () => "No se pudieron tomar las fotos. Intenta de nuevo.");
  }, [encender, registrarGuiado, setDescriptor]);

  // 🔹 Si no está activo, no renderizar el contenido de la cámara
  if (!active) {
    return null;
  }

  const descriptorReady = capturadas > 0;
  const tieneRostro = rostroCelular || descriptorReady || (Array.isArray(valores.descriptor_facial) && valores.descriptor_facial.length > 0);

  // Tres columnas en vez de una tira angosta: 1) documento (consentimiento),
  // 2) firma y PIN + aviso del rostro desde la app, 3) reconocimiento facial (instrucciones, cámara y botones).
  // Por ancho del contenedor (no de la ventana): 3 columnas ≥ 1024 px; 2 + 1 en tableta; apiladas en teléfono.
  return (
    <div className="@container w-full space-y-4 py-2">
      {renderCampos("inicio", true)}
      <div className="grid grid-cols-1 items-start gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3" data-reconocimiento-columnas>
        <div className="min-w-0" data-columna="documento">
          <ConsentimientoRostro idEmpresa={idEmpresa} idEmpleado={valores.id_empleado} nombre={nombreEmpleado} empresa={empresaNombre} />
        </div>
        <div className="grid min-w-0 gap-4" data-columna="firma">
          <FirmaPinRh idEmpleado={valores.id_empleado} />
          <AvisoRostroApp idEmpleado={valores.id_empleado} />
        </div>
        <section aria-labelledby="t-reconocimiento" className="min-w-0 rounded-seccion border border-borde bg-white p-4 text-cuerpo @2xl:col-span-2 @5xl:col-span-1" data-columna="reconocimiento">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 id="t-reconocimiento" className="flex items-center gap-2 text-titulo-seccion font-bold text-navy"><ScanFace className="size-5 text-navy" aria-hidden="true" /> Reconocimiento facial</h3>
            <span data-chico className={`rounded-full px-3 py-1 text-[15px] font-semibold ${tieneRostro ? "bg-estado-exito text-estado-exito-texto" : "bg-estado-neutro text-estado-neutro-texto"}`} data-rostro-estado>
              {rostroCelular ? "Registrado desde el celular" : descriptorReady ? "Fotos tomadas: falta guardar" : tieneRostro ? "Rostro registrado" : "Sin rostro"}
            </span>
          </div>
          {valores.id_empleado ? <ProbarRostro idEmpleado={valores.id_empleado} nombre={nombreEmpleado} tieneRostro={tieneRostro} sinGuardar={descriptorReady} onAbrir={cancelar} /> : null}
          <RostroRhResumen idEmpleado={valores.id_empleado} tieneRostro={tieneRostro} />
          {rostroCelular ? (
            <p role="status" className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">{mensajeListo(nombreEmpleado)} Ya lo usa para checar.</p>
          ) : null}
          {renderCampos("instrucciones", true)}
          <div ref={bloqueRef} className="mt-4 grid gap-3 border-t border-slate-100 pt-4" data-registro-guiado>
            {!camaraVisible ? (
              <>
                <p className="text-texto-secundario">Registro con 5 fotos: la persona mira al frente, sube y baja un poco la cara y la gira un poco a cada lado. Las fotos se toman solas, con buena luz y sin otras personas atrás.</p>
                {!soloLectura ? (
                  <button type="button" onClick={registrar} disabled={fase === "preparando"}
                    className={`${buttonVariants()} w-full`}>
                    <Camera className="size-4" aria-hidden="true" />{fase === "preparando" ? "Preparando la cámara…" : tieneRostro ? "Volver a registrar" : "Registrar rostro"}
                  </button>
                ) : null}
                {aviso ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{aviso.texto}</p> : null}
              </>
            ) : null}
            <CapturaGuiada captura={captura} className={camaraVisible ? "" : "hidden"} ovalo="inset-x-[20%] inset-y-[10%]" etiqueta="Vista de la cámara de esta computadora" />
            {renderCampos("camara", true)}
            {renderCampos("controles", true)}
            {descriptorReady && fase === "listo" ? (
              <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800" data-rostro-capturado>{capturadas} fotos tomadas. Se guardan al guardar la ficha.</p>
            ) : null}
          </div>
          {/* También en modo «ver»: el QR guarda el rostro directo en el servidor (con su permiso de RH), no
              depende de guardar la ficha. Antes se ocultaba y en la ficha abierta en solo lectura no aparecía. */}
          {valores.id_empleado || !soloLectura ? (
            <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4" data-rostro-celular-bloque>
              <p className="text-texto-secundario">{soloLectura ? "¿Registrar o actualizar su rostro? La persona puede tomarlo con su celular." : "¿Es difícil con la cámara de la computadora? La persona puede tomarlo con su celular."}</p>
              {valores.id_empleado ? (
                <RostroCelular idEmpleado={valores.id_empleado} nombre={nombreEmpleado} onRegistrado={alRegistrarDesdeCelular} onAbrir={cancelar} />
              ) : (
                <p className="text-cuerpo text-texto-secundario">Guarda primero al empleado para usar esta opción.</p>
              )}
            </div>
          ) : null}
        </section>
      </div>
      {renderCampos("fin", true)}
    </div>
  );
}
