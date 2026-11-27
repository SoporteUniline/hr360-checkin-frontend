"use client";

// «Revisar sueldos» (27/11/2026, decisión del dueño: nunca se cambia un sueldo en silencio). El sueldo vive en el
// contrato vigente; si la ficha dice otro, RH elige cuál es el correcto. Mientras haya diferencias, la nómina de esas
// personas no se crea ni se autoriza (se puede ver). Aquí también se corrigen las personas con más de un contrato vigente
// y (27/11/2026, opción C del dueño) se confirma la periodicidad de los contratos que los cálculos leían como mensuales.
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { TarjetaDetalle, BotonAccion, FilaDato, ListaDatos } from "@/components/detalle";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { contratosApi } from "@/lib/contratosApi";
import { dinero, porPeriodo, fechaCorta, TIPOS, mensajeDeError } from "@/lib/contratos/detalleContrato.mjs";
import { textoPeriodicidad, explicaDecision } from "@/lib/contratos/periodicidadPorConfirmar.mjs";

const OPCIONES = {
  usar_contrato: {
    texto: "Usar el del contrato",
    explica: (d) => `La ficha queda en ${dinero(d.contrato_en_periodo_ficha, { centavos: "siempre" })} ${porPeriodo(d.periodo_ficha)}, igual que su contrato. El contrato no cambia.`,
  },
  convenio_ficha: {
    texto: "Actualizar el contrato con convenio al de la ficha",
    explica: (d) => `Se registra un convenio de modificación en el contrato ${d.folio ?? ""}: de ${dinero(d.salario_contrato, { centavos: "siempre" })} ${porPeriodo(d.periodicidad_contrato)} al sueldo de la ficha (${dinero(d.sueldo_ficha, { centavos: "siempre" })} ${porPeriodo(d.periodo_ficha)}), con fecha de hoy y tu nombre.`,
  },
};

export default function RevisarSueldosPage() {
  const { dataUser } = useAuth() ?? {};
  const { enqueueSnackbar } = useSnackbar();
  const empresas = dataUser?.empresas_detalle ?? [];
  const [elegida, setElegida] = useState("");
  const idEmpresa = Number(elegida || empresas[0]?.id_empresa || dataUser?.id_empresa) || null;
  const { data, error, isLoading, mutate } = useSWR(idEmpresa ? ["revisar-sueldos", idEmpresa] : null, () => contratosApi.revisarSueldos(idEmpresa), { revalidateOnFocus: false });
  const [confirmar, setConfirmar] = useState(null);
  const [conservar, setConservar] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorDialogo, setErrorDialogo] = useState("");

  const resolver = async () => {
    setEnviando(true);
    setErrorDialogo("");
    try {
      if (confirmar.tipo === "periodicidad") {
        const r = await contratosApi.resolverPeriodicidad({ idEmpresa, idEmpleado: confirmar.persona.id_empleado, idContrato: confirmar.persona.id_contrato, decision: confirmar.decision });
        enqueueSnackbar(`Listo: el contrato ${confirmar.persona.folio ?? ""} quedó ${String(r.despues).toLowerCase()}.`, { variant: "success" });
      } else if (confirmar.tipo === "sueldo") {
        await contratosApi.resolverSueldo({ idEmpresa, idEmpleado: confirmar.persona.id_empleado, decision: confirmar.decision });
        enqueueSnackbar(`Listo: el sueldo de ${confirmar.persona.nombre} ya coincide.`, { variant: "success" });
      } else {
        const r = await contratosApi.resolverDuplicado({ idEmpresa, idEmpleado: confirmar.persona.id_empleado, conservar: confirmar.conservar });
        enqueueSnackbar(`Se quedó vigente ${r.conservado}; se terminaron ${r.cerrados.join(", ")}.`, { variant: "success" });
      }
      setConfirmar(null);
      mutate();
    } catch (e) {
      setErrorDialogo(mensajeDeError(e, "No se pudo guardar la decisión."));
    } finally {
      setEnviando(false);
    }
  };

  const diferencias = data?.diferencias ?? [];
  const duplicados = data?.duplicados ?? [];
  const periodicidades = data?.periodicidades ?? [];
  const tituloConfirmar = !confirmar ? "" : confirmar.tipo === "periodicidad" ? confirmar.texto : confirmar.tipo === "sueldo" ? OPCIONES[confirmar.decision].texto : "Conservar un contrato";
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 text-[17px] text-[#111827] lg:text-[16px]" data-vista="revisar-sueldos">
      <nav aria-label="Ruta"><Link href="/panel/contratos" className="inline-flex min-h-12 items-center text-[17px] font-semibold text-[#1E40C4] no-underline lg:text-[16px]">‹ Contratos</Link></nav>
      <header className="flex flex-col gap-1">
        <h1 className="m-0 text-[26px] font-bold lg:text-[28px]">Revisar sueldos</h1>
        <p className="m-0 max-w-3xl text-[#374151]">
          El sueldo vive en el contrato vigente: es el que usan la nómina, los finiquitos y los aguinaldos. Aquí decides los sueldos que hay que revisar; mientras no los resuelvas, la nómina de esas personas no se puede crear ni autorizar.
        </p>
      </header>
      {empresas.length > 1 ? (
        <label className="flex max-w-sm flex-col gap-1.5 font-semibold">
          Empresa
          <select className="min-h-12 rounded-[12px] border border-[#CBD3E3] bg-white px-3 font-normal" value={idEmpresa ?? ""} onChange={(e) => setElegida(e.target.value)}>
            {empresas.map((e) => <option key={e.id_empresa} value={e.id_empresa}>{e.nombre}</option>)}
          </select>
        </label>
      ) : null}

      {isLoading ? <p className="flex items-center gap-2 text-[#374151]"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Revisando sueldos…</p> : null}
      {error ? <p role="alert" className="m-0 rounded-2xl bg-[#FEF2F2] px-4 py-3 text-[#991B1B]">{mensajeDeError(error, "No se pudo revisar los sueldos.")}</p> : null}
      {data && data.migracion === false ? (
        <p className="m-0 rounded-2xl bg-[#EEF2FF] px-4 py-3 text-[#1E3A8A]">Puedes ver las diferencias; para resolverlas falta que ADAMIA termine de actualizar tu cuenta.</p>
      ) : null}

      {data && !diferencias.length && !duplicados.length && !periodicidades.length ? (
        <TarjetaDetalle titulo="Todo en orden" data-vacio>
          <p className="m-0 text-[#374151]">Los sueldos de las fichas coinciden con sus contratos vigentes y nadie tiene dos contratos vigentes.</p>
        </TarjetaDetalle>
      ) : null}

      {periodicidades.length ? (
        <section aria-labelledby="h-periodicidad" className="flex flex-col gap-3" data-seccion="periodicidad">
          <h2 id="h-periodicidad" className="m-0 text-[20px] font-bold">Periodicidad por confirmar ({periodicidades.length})</h2>
          <p className="m-0 text-[#374151]">
            Estos contratos dicen cada cuándo se paga de una forma que los cálculos no entienden (por ejemplo «quincenal» en minúsculas) y por eso hoy se pagan como <b>mensuales</b>. Confirma cada uno: el monto no cambia, solo cómo se lee. Mientras no lo hagas, su nómina no se puede crear ni autorizar.
          </p>
          {periodicidades.map((p) => {
            const t = textoPeriodicidad(p);
            return (
              <TarjetaDetalle key={p.id_contrato} titulo={p.nombre} data-periodicidad={p.id_contrato}
                accion={<Link href={`/panel/contratos/${p.id_contrato}`} className="inline-flex min-h-12 items-center font-semibold text-[#1E40C4]">Ver contrato {p.folio ?? ""}</Link>}>
                <ListaDatos>
                  <FilaDato etiqueta={`Guardado en el contrato ${p.folio ?? ""}`} valor={t.guardado} />
                  <FilaDato etiqueta="Hoy" valor={t.hoy} tono="aviso" />
                  {t.comoDice ? <FilaDato etiqueta="Como dice" valor={t.comoDice} /> : null}
                </ListaDatos>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {t.opciones.map((o, i) => (
                    <BotonAccion key={o.decision} accion={{ clave: `periodicidad-${o.decision}`, texto: o.texto, tipo: i === 0 ? "contorno" : "normal",
                      onClick: () => { setErrorDialogo(""); setConfirmar({ tipo: "periodicidad", decision: o.decision, texto: o.texto, persona: p }); } }} />
                  ))}
                </div>
              </TarjetaDetalle>
            );
          })}
        </section>
      ) : null}

      {diferencias.length ? (
        <section aria-labelledby="h-diferencias" className="flex flex-col gap-3">
          <h2 id="h-diferencias" className="m-0 text-[20px] font-bold">Sueldo distinto en la ficha ({diferencias.length})</h2>
          {diferencias.map((d) => (
            <TarjetaDetalle key={d.id_empleado} titulo={d.nombre} data-diferencia={d.id_empleado}
              accion={<Link href={`/panel/contratos/${d.id_contrato}`} className="inline-flex min-h-12 items-center font-semibold text-[#1E40C4]">Ver contrato {d.folio ?? ""}</Link>}>
              <ListaDatos>
                <FilaDato etiqueta="En la ficha" valor={`${dinero(d.sueldo_ficha, { centavos: "siempre" })} ${porPeriodo(d.periodo_ficha)}`} tono="aviso" />
                <FilaDato etiqueta={`En el contrato ${d.folio ?? ""}`} valor={`${dinero(d.salario_contrato, { centavos: "siempre" })} ${porPeriodo(d.periodicidad_contrato)}${d.periodicidad_contrato !== d.periodo_ficha ? ` (= ${dinero(d.contrato_en_periodo_ficha, { centavos: "siempre" })} ${porPeriodo(d.periodo_ficha)})` : ""}`} />
              </ListaDatos>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <BotonAccion accion={{ clave: "usar_contrato", texto: OPCIONES.usar_contrato.texto, tipo: "contorno", onClick: () => { setErrorDialogo(""); setConfirmar({ tipo: "sueldo", decision: "usar_contrato", persona: d }); } }} />
                <BotonAccion accion={{ clave: "convenio_ficha", texto: OPCIONES.convenio_ficha.texto, tipo: "normal", onClick: () => { setErrorDialogo(""); setConfirmar({ tipo: "sueldo", decision: "convenio_ficha", persona: d }); } }} />
              </div>
            </TarjetaDetalle>
          ))}
        </section>
      ) : null}

      {duplicados.length ? (
        <section aria-labelledby="h-duplicados" className="flex flex-col gap-3">
          <h2 id="h-duplicados" className="m-0 text-[20px] font-bold">Más de un contrato vigente ({duplicados.length})</h2>
          <p className="m-0 text-[#374151]">Solo puede haber un contrato vigente por persona. Elige el que se queda; los demás se terminan (no se borra ninguno).</p>
          {duplicados.map((p) => {
            const elegido = conservar[p.id_empleado] ?? p.usado_por_calculos;
            return (
              <TarjetaDetalle key={p.id_empleado} titulo={p.nombre} data-duplicado={p.id_empleado}>
                <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                  <legend className="mb-1 font-semibold">¿Cuál se queda vigente?</legend>
                  {p.contratos.map((c) => (
                    <label key={c.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] border border-[#CBD3E3] px-3 py-2">
                      <input type="radio" name={`conservar-${p.id_empleado}`} className="h-5 w-5" checked={Number(elegido) === Number(c.id)} onChange={() => setConservar((x) => ({ ...x, [p.id_empleado]: c.id }))} />
                      <span className="min-w-0 break-words">
                        <b>{c.folio}</b> · {TIPOS[c.tipo_contrato] ?? c.tipo_contrato} · desde {fechaCorta(c.fecha_inicio)} · {dinero(c.salario_base, { centavos: "siempre" })} {porPeriodo(c.periodicidad_pago)}
                        {Number(c.id) === Number(p.usado_por_calculos) ? <span className="text-[#374151]"> (el que usan hoy los cálculos)</span> : null}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <BotonAccion accion={{ clave: "conservar", texto: "Conservar este y terminar los demás", tipo: "contorno", onClick: () => { setErrorDialogo(""); setConfirmar({ tipo: "duplicado", persona: p, conservar: elegido }); } }} className="mt-2 self-start" />
              </TarjetaDetalle>
            );
          })}
        </section>
      ) : null}

      <Dialog open={Boolean(confirmar)} onOpenChange={(v) => { if (!v) setConfirmar(null); }}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-lg rounded-3xl p-5 sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[20px] font-bold">{tituloConfirmar}</DialogTitle>
            <DialogDescription className="text-[17px] text-[#374151] lg:text-[16px]">
              {confirmar?.tipo === "periodicidad" ? explicaDecision(confirmar.persona, confirmar.decision) : confirmar?.tipo === "sueldo"
                ? OPCIONES[confirmar.decision].explica(confirmar.persona)
                : confirmar ? `Se queda vigente ${confirmar.persona.contratos.find((c) => Number(c.id) === Number(confirmar.conservar))?.folio}; los demás contratos de ${confirmar.persona.nombre} se terminan con el motivo «Duplicado».` : ""}
            </DialogDescription>
          </DialogHeader>
          {errorDialogo ? <p role="alert" className="m-0 rounded-xl bg-[#FEF2F2] px-3 py-2.5 text-[17px] text-[#991B1B] lg:text-[16px]">{errorDialogo}</p> : null}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <BotonAccion accion={{ clave: "cancelar", texto: "Cancelar", tipo: "normal", onClick: () => setConfirmar(null) }} />
            <BotonAccion accion={{ clave: "confirmar-revision", texto: "Confirmar", tipo: "primaria", onClick: resolver, cargando: enviando }} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
