"use client";

// Diálogos de la vista de detalle del contrato (27/11/2026): cambiar sueldo con convenio, renovar, terminar, firmar
// como empresa y mandar a firmar (el MISMO flujo de firma digital que actas, finiquitos y documentos). Cada uno llama
// a su endpoint; el servidor valida (un solo vigente, sueldo con convenio, texto congelado) y aquí se explica.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BotonAccion } from "@/components/detalle";
import { contratosApi } from "@/lib/contratosApi";
import { firmaDigitalAdminApi } from "@/lib/firmaDigitalApi";
import { htmlToPdf } from "@/lib/htmlToPdf";
import { nombreArchivoPdf } from "@/lib/nombreArchivo.mjs";
import { dinero, porPeriodo, PERIODICIDADES, TIPOS_OPCIONES, mensajeDeError } from "@/lib/contratos/detalleContrato.mjs";

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const sumarDia = (f) => {
  const d = new Date(`${f}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const CAMPO = "block w-full min-h-12 rounded-[12px] border border-[#CBD3E3] bg-white px-3 text-[17px] text-[#111827] lg:text-[16px] focus:outline-none focus:ring-2 focus:ring-[#2C56E8]";

function Campo({ etiqueta, ayuda, children, id }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[16px] font-semibold text-[#111827]">{etiqueta}</label>
      {children}
      {ayuda ? <p className="m-0 text-[16px] text-[#4B5563]">{ayuda}</p> : null}
    </div>
  );
}

function Marco({ abierto, alCerrar, titulo, descripcion, children, acciones, error }) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!v) alCerrar(); }}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-24px)] max-w-lg overflow-y-auto rounded-3xl p-5 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[20px] font-bold text-[#111827]">{titulo}</DialogTitle>
          {descripcion ? <DialogDescription className="text-[17px] text-[#374151] lg:text-[16px]">{descripcion}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex flex-col gap-4">{children}</div>
        {error ? <p role="alert" className="m-0 rounded-xl bg-[#FEF2F2] px-3 py-2.5 text-[17px] text-[#991B1B] lg:text-[16px]">{error}</p> : null}
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">{acciones}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const useEnvio = () => {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const enviar = async (fn, porOmision) => {
    setEnviando(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(mensajeDeError(e, porOmision));
      return null;
    } finally {
      setEnviando(false);
    }
  };
  return { enviando, error, setError, enviar };
};

/** Cambiar sueldo con un convenio de modificación: antes → después, fecha en que aplica y motivo. */
export function ConvenioDialog({ abierto, alCerrar, contrato, alGuardar }) {
  const [sueldo, setSueldo] = useState("");
  const [periodicidad, setPeriodicidad] = useState(contrato?.periodicidad_pago || "Mensual");
  const [fecha, setFecha] = useState(hoy());
  const [motivo, setMotivo] = useState("");
  const { enviando, error, setError, enviar } = useEnvio();
  useEffect(() => {
    if (abierto) { setSueldo(""); setPeriodicidad(contrato?.periodicidad_pago || "Mensual"); setFecha(hoy()); setMotivo(""); setError(""); }
  }, [abierto, contrato?.periodicidad_pago, setError]);
  const nuevo = Number(sueldo);
  const valido = nuevo > 0 && fecha;
  const guardar = async () => {
    const r = await enviar(() => contratosApi.convenio(contrato.id, { salario_nuevo: nuevo, periodicidad_nueva: periodicidad, fecha_efectiva: fecha, motivo: motivo || null }), "No se pudo registrar el convenio.");
    if (r) alGuardar?.(`Sueldo actualizado con convenio: ${dinero(r.salario_anterior, { centavos: "siempre" })} → ${dinero(r.salario_nuevo, { centavos: "siempre" })}.`);
  };
  return (
    <Marco abierto={abierto} alCerrar={alCerrar} titulo="Cambiar sueldo (convenio)" error={error}
      descripcion="El cambio queda en el historial del contrato (antes, después, desde cuándo y quién). La nómina, los finiquitos y los aguinaldos usan el sueldo nuevo."
      acciones={<>
        <BotonAccion accion={{ clave: "cancelar", texto: "Cancelar", tipo: "normal", onClick: alCerrar }} />
        <BotonAccion accion={{ clave: "guardar-convenio", texto: "Guardar convenio", tipo: "primaria", onClick: guardar, deshabilitada: !valido, cargando: enviando }} />
      </>}>
      <p className="m-0 rounded-xl bg-[#F3F5FA] px-3 py-2.5 text-[17px] lg:text-[16px]" data-sueldo-actual>
        Sueldo actual: <b>{dinero(contrato?.salario_base, { centavos: "siempre" })} {porPeriodo(contrato?.periodicidad_pago)}</b>
        {nuevo > 0 ? <> → <b>{dinero(nuevo, { centavos: "siempre" })} {porPeriodo(periodicidad)}</b></> : null}
      </p>
      <Campo id="conv-sueldo" etiqueta={`Sueldo nuevo (${porPeriodo(periodicidad) || "por periodo"})`}>
        <input id="conv-sueldo" className={CAMPO} type="number" inputMode="decimal" min="0" step="0.01" value={sueldo} onChange={(e) => setSueldo(e.target.value)} />
      </Campo>
      <Campo id="conv-periodicidad" etiqueta="Periodicidad del pago">
        <select id="conv-periodicidad" className={CAMPO} value={periodicidad} onChange={(e) => setPeriodicidad(e.target.value)}>
          {PERIODICIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Campo>
      <Campo id="conv-fecha" etiqueta="Fecha en que aplica" ayuda="Hoy o antes. Si aplica más adelante, regístralo ese día.">
        <input id="conv-fecha" className={CAMPO} type="date" max={hoy()} min={contrato?.fecha_inicio || undefined} value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </Campo>
      <Campo id="conv-motivo" etiqueta="Motivo (opcional)">
        <textarea id="conv-motivo" className={`${CAMPO} min-h-24 py-2`} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: revisión anual, cambio de puesto" />
      </Campo>
    </Marco>
  );
}

/** Renovar: contrato nuevo que sigue al actual (cadena de renovación) y lo cierra. */
export function RenovarDialog({ abierto, alCerrar, contrato, alGuardar }) {
  const inicial = () => ({
    fecha_inicio: contrato?.fecha_fin ? sumarDia(contrato.fecha_fin) : hoy(), fecha_fin: "", tipo_contrato: contrato?.tipo_contrato || "indefinido",
    salario_base: contrato?.salario_base ?? "",
  });
  const [f, setF] = useState(inicial);
  const { enviando, error, setError, enviar } = useEnvio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (abierto) { setF(inicial()); setError(""); } }, [abierto]);
  const pideFin = ["temporal", "obra_determinada", "prueba", "capacitacion"].includes(f.tipo_contrato);
  const valido = f.fecha_inicio && Number(f.salario_base) > 0 && (!pideFin || f.fecha_fin);
  const guardar = async () => {
    const r = await enviar(() => contratosApi.renovar(contrato.id, { ...f, fecha_fin: f.fecha_fin || null, salario_base: Number(f.salario_base) }), "No se pudo renovar el contrato.");
    if (r) alGuardar?.(r);
  };
  const cambiar = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Marco abierto={abierto} alCerrar={alCerrar} titulo="Renovar contrato" error={error}
      descripcion="Se crea un contrato nuevo con las mismas condiciones y este se cierra. Si cambias el sueldo, el cambio queda en el historial."
      acciones={<>
        <BotonAccion accion={{ clave: "cancelar", texto: "Cancelar", tipo: "normal", onClick: alCerrar }} />
        <BotonAccion accion={{ clave: "guardar-renovacion", texto: "Crear renovación", tipo: "primaria", onClick: guardar, deshabilitada: !valido, cargando: enviando }} />
      </>}>
      <Campo id="ren-tipo" etiqueta="Tipo de contrato">
        <select id="ren-tipo" className={CAMPO} value={f.tipo_contrato} onChange={cambiar("tipo_contrato")}>
          {TIPOS_OPCIONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Campo>
      <Campo id="ren-inicio" etiqueta="Inicia el">
        <input id="ren-inicio" className={CAMPO} type="date" value={f.fecha_inicio} onChange={cambiar("fecha_inicio")} />
      </Campo>
      <Campo id="ren-fin" etiqueta={pideFin ? "Termina el" : "Termina el (opcional)"}>
        <input id="ren-fin" className={CAMPO} type="date" min={f.fecha_inicio || undefined} value={f.fecha_fin} onChange={cambiar("fecha_fin")} />
      </Campo>
      <Campo id="ren-sueldo" etiqueta={`Sueldo (${porPeriodo(contrato?.periodicidad_pago) || "por periodo"})`}>
        <input id="ren-sueldo" className={CAMPO} type="number" inputMode="decimal" min="0" step="0.01" value={f.salario_base} onChange={cambiar("salario_base")} />
      </Campo>
    </Marco>
  );
}

/** Terminar el contrato (con motivo y fecha). No borra nada. */
export function TerminarDialog({ abierto, alCerrar, contrato, alGuardar }) {
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const { enviando, error, setError, enviar } = useEnvio();
  useEffect(() => { if (abierto) { setMotivo(""); setFecha(hoy()); setError(""); } }, [abierto, setError]);
  const guardar = async () => {
    const r = await enviar(() => contratosApi.terminar(contrato.id, { motivo, fecha }), "No se pudo terminar el contrato.");
    if (r) alGuardar?.("Contrato terminado.");
  };
  return (
    <Marco abierto={abierto} alCerrar={alCerrar} titulo="Terminar contrato" error={error}
      descripcion="El contrato deja de estar vigente y queda en el historial con su motivo. Sin contrato vigente, la nómina usa el sueldo de la ficha. Para el pago a la persona, haz su finiquito."
      acciones={<>
        <BotonAccion accion={{ clave: "cancelar", texto: "Cancelar", tipo: "normal", onClick: alCerrar }} />
        <BotonAccion accion={{ clave: "confirmar-terminar", texto: "Terminar contrato", tipo: "primaria", onClick: guardar, deshabilitada: !motivo.trim(), cargando: enviando }} />
      </>}>
      <Campo id="ter-motivo" etiqueta="Motivo">
        <textarea id="ter-motivo" className={`${CAMPO} min-h-24 py-2`} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: renuncia voluntaria, fin del periodo" />
      </Campo>
      <Campo id="ter-fecha" etiqueta="Fecha de terminación">
        <input id="ter-fecha" className={CAMPO} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </Campo>
    </Marco>
  );
}

/** Firmar como empresa desde el panel: congela el texto y registra quién firmó. */
export function FirmarEmpresaDialog({ abierto, alCerrar, contrato, quien, alGuardar }) {
  const { enviando, error, setError, enviar } = useEnvio();
  useEffect(() => { if (abierto) setError(""); }, [abierto, setError]);
  const firmar = async () => {
    const r = await enviar(() => contratosApi.firmarEmpresa(contrato.id), "No se pudo firmar el contrato.");
    if (r) alGuardar?.(r.completo ? "Contrato firmado por las dos partes." : "Firmaste el contrato como empresa. Falta la firma de la persona.");
  };
  return (
    <Marco abierto={abierto} alCerrar={alCerrar} titulo="Firmar como empresa" error={error}
      descripcion={`Vas a firmar el contrato ${contrato?.folio ?? ""} a nombre de la empresa${quien ? ` como ${quien}` : ""}. Desde ese momento su texto queda fijo: si cambias la plantilla, este contrato no cambia.`}
      acciones={<>
        <BotonAccion accion={{ clave: "cancelar", texto: "Cancelar", tipo: "normal", onClick: alCerrar }} />
        <BotonAccion accion={{ clave: "confirmar-firma-empresa", texto: "Firmar contrato", tipo: "primaria", onClick: firmar, cargando: enviando }} />
      </>}>
      <p className="m-0 text-[17px] text-[#374151] lg:text-[16px]">Queda registrado quién firmó, la fecha y desde qué equipo.</p>
    </Marco>
  );
}

/**
 * Mandar a firmar a la persona: el servidor congela el texto, el navegador lo convierte en PDF y se crea la solicitud
 * de firma (tipo CONTRATO) con el mismo flujo de actas y finiquitos; la persona firma desde su celular con foto.
 * Si ya hay una solicitud vigente, muestra su enlace.
 */
export function MandarAFirmarDialog({ abierto, alCerrar, contrato, soloEnlace = false, alGuardar }) {
  const [enlace, setEnlace] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const { enviando, error, setError, enviar } = useEnvio();
  const completo = (url) => (url ? new URL(url, window.location.origin).toString() : null);

  useEffect(() => {
    if (!abierto) return;
    setEnlace(null); setCopiado(false); setError("");
    if (soloEnlace) {
      enviar(async () => {
        const r = await firmaDigitalAdminApi.obtenerEstadoDocumento({ idEmpresa: contrato.id_empresa, tipoDocumento: "CONTRATO", referenciaId: contrato.id });
        setEnlace(completo(r?.solicitud?.url_firma));
        return r;
      }, "No se pudo leer el enlace de firma.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, soloEnlace]);

  const mandar = async () => {
    const r = await enviar(async () => {
      const preparado = await contratosApi.prepararFirma(contrato.id);
      const documento = await htmlToPdf(preparado.html, `Contrato ${contrato.folio}`, { download: false });
      try {
        const s = await firmaDigitalAdminApi.crearSolicitud({
          idEmpresa: contrato.id_empresa, idEmpleado: contrato.id_empleado, tipoDocumento: "CONTRATO", referenciaId: contrato.id, documento,
          nombreArchivo: nombreArchivoPdf({ documento: "Contrato", folio: contrato.folio, empleado: contrato.id_empleado }), expiracionHoras: 72,
        });
        return completo(s?.url || s?.url_firma || (s?.token ? `/firmar/${encodeURIComponent(s.token)}` : null));
      } catch (e) {
        if (e?.response?.data?.codigo !== "SOLICITUD_FIRMA_EXISTENTE") throw e;
        const estado = await firmaDigitalAdminApi.obtenerEstadoDocumento({ idEmpresa: contrato.id_empresa, tipoDocumento: "CONTRATO", referenciaId: contrato.id });
        return completo(estado?.solicitud?.url_firma);
      }
    }, "No se pudo mandar a firmar.");
    if (r) { setEnlace(r); alGuardar?.(); }
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(enlace); setCopiado(true); } catch { setError("No se pudo copiar: selecciona el enlace y cópialo."); }
  };

  return (
    <Marco abierto={abierto} alCerrar={alCerrar} titulo={enlace ? "Enlace para firmar" : "Mandar a firmar"} error={error}
      descripcion={enlace
        ? "Mándaselo a la persona por WhatsApp o correo. Lo abre en su celular, lee el contrato y firma con su dedo; se toma una foto como evidencia. El enlace vence en 72 horas."
        : "Se genera el PDF con el texto del contrato (ya no cambiará) y se crea el enlace para que la persona firme desde su celular, con foto."}
      acciones={enlace ? <>
        <BotonAccion accion={{ clave: "cerrar", texto: "Listo", tipo: "normal", onClick: alCerrar }} />
        <BotonAccion accion={{ clave: "copiar-enlace", texto: copiado ? "Enlace copiado" : "Copiar enlace", tipo: "primaria", onClick: copiar }} />
      </> : <>
        <BotonAccion accion={{ clave: "cancelar", texto: "Cancelar", tipo: "normal", onClick: alCerrar }} />
        {soloEnlace ? null : <BotonAccion accion={{ clave: "confirmar-mandar", texto: "Generar enlace de firma", tipo: "primaria", onClick: mandar, cargando: enviando }} />}
      </>}>
      {enlace ? (
        <p className="m-0 break-all rounded-xl bg-[#F3F5FA] px-3 py-2.5 text-[17px] lg:text-[16px]" data-enlace-firma>{enlace}</p>
      ) : enviando ? (
        <p className="m-0 text-[17px] text-[#374151] lg:text-[16px]">Preparando el documento…</p>
      ) : null}
    </Marco>
  );
}
