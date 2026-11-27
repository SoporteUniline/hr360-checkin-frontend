"use client";

// Nómina › Configuración (R3, nómina formal). El interruptor «Manejar nómina formal» (solo el dueño), los datos
// fiscales de la empresa, el estado de las tablas fiscales del año y «Lo que falta para nómina formal».
// Backend: /checador/nomina/fiscal/* (hr360-checkin-backend/docs/nomina-formal.md). Es una página, no una ventana.
import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { SelectorEmpresa, mensajeError, useEmpresaNomina } from "@/components/nomina/comun";
import { ModuloNomina, Cargando, ErrorCarga } from "@/components/nomina/ModuloNomina";
import { Aviso, BOTON, BOTON_PELIGRO, BOTON_SECUNDARIO, CAMPO, Campo, Etiqueta, Tarjeta } from "@/components/nomina/PiezasFormal";
import { cambiosDe, motivosParaNoEncender, valorCampo } from "@/lib/nomina/formal.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const CAMPOS = ["registro_patronal", "prima_riesgo", "rfc", "regimen_fiscal", "cp_expedicion", "zona_salario_minimo"];

export default function ConfiguracionNomina() {
  const { enqueueSnackbar } = useSnackbar();
  const empresa = useEmpresaNomina();
  const { data, error, isLoading, mutate } = useSWR(empresa.idEmpresa ? `/checador/nomina/fiscal/configuracion?empresa=${empresa.idEmpresa}` : null, get);
  const [borrador, setBorrador] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState(null); // "encender" | "apagar"
  const [rechazo, setRechazo] = useState(null);
  const cfg = data?.configuracion;

  useEffect(() => {
    if (cfg) setBorrador(Object.fromEntries(CAMPOS.map((k) => [k, valorCampo(cfg[k] ?? (k === "zona_salario_minimo" ? "general" : ""))])));
  }, [cfg]);

  const original = cfg ? Object.fromEntries(CAMPOS.map((k) => [k, cfg[k] ?? (k === "zona_salario_minimo" ? "general" : null)])) : {};
  const cambios = cambiosDe(original, borrador);
  const hayCambios = Object.keys(cambios).length > 0;

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await axios.put(`/checador/nomina/fiscal/configuracion/${empresa.idEmpresa}`, cambios);
      enqueueSnackbar("Datos fiscales guardados.", { variant: "success" });
      await mutate();
    } catch (err) {
      enqueueSnackbar(mensajeError(err, "No se pudieron guardar los datos."), { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarFormal = async (encender) => {
    setGuardando(true);
    setRechazo(null);
    try {
      await axios.post(`/checador/nomina/fiscal/configuracion/${empresa.idEmpresa}/formal`, { encender });
      enqueueSnackbar(encender ? "Nómina formal encendida. Recalcula las nóminas en borrador." : "Nómina formal apagada.", { variant: "success" });
      setConfirmar(null);
      await mutate();
    } catch (err) {
      setRechazo(mensajeError(err, "No se pudo cambiar la nómina formal."));
    } finally {
      setGuardando(false);
    }
  };

  const campo = (k) => ({ id: `cfg-${k}`, value: borrador[k] ?? "", onChange: (e) => setBorrador({ ...borrador, [k]: e.target.value }) });
  const motivos = motivosParaNoEncender(data);
  const encendida = Number(cfg?.nomina_formal) === 1;

  return (
    <ModuloNomina acciones={<SelectorEmpresa {...empresa} />}>
      {error ? (
        <ErrorCarga error={error} texto="No se pudo cargar la configuración de la nómina." />
      ) : isLoading || !data ? (
        <Cargando />
      ) : (
        <div className="grid max-w-4xl gap-5 text-base" data-pagina="configuracion-nomina">
          <Tarjeta id="titulo-formal" titulo="Manejar nómina formal" acciones={<Etiqueta tono={encendida ? "verde" : "gris"}>{encendida ? "Encendida" : "Apagada"}</Etiqueta>}>
            <p>
              {encendida
                ? "Cada recibo calcula el ISR (con el subsidio para el empleo) y la cuota del IMSS del trabajador, y muestra el costo del IMSS del patrón como información."
                : "Hoy la nómina es una pre-nómina: no calcula ISR ni IMSS. Al encenderla, cada recibo calcula el ISR con el subsidio para el empleo y la cuota del IMSS."}
            </p>
            <p className="text-slate-700">Los recibos siguen sin timbrar: dicen «Pre-nómina, no timbrada». Valida los cálculos con tu contador antes de pagar.</p>
            {!encendida && motivos.length ? (
              <Aviso titulo="Todavía no se puede encender">
                <ul className="grid list-disc gap-1 pl-5">{motivos.map((m) => <li key={m}>{m}</li>)}</ul>
              </Aviso>
            ) : null}
            {rechazo ? <Aviso tono="rojo">{rechazo}</Aviso> : null}
            {!data.puede_cambiar_formal ? (
              <p className="font-bold text-slate-700">Solo el dueño de la cuenta puede encenderla o apagarla.</p>
            ) : confirmar ? (
              <div className="grid gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4">
                <p className="font-bold">{confirmar === "encender" ? "¿Encender la nómina formal?" : "¿Apagar la nómina formal?"}</p>
                <p>{confirmar === "encender"
                  ? "Desde la próxima vez que calcules una nómina, sus recibos llevarán ISR e IMSS. Las nóminas en borrador hay que recalcularlas; las autorizadas no cambian."
                  : "Las próximas nóminas que calcules ya no llevarán ISR ni IMSS. Las nóminas autorizadas no cambian."}</p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className={confirmar === "encender" ? BOTON : BOTON_PELIGRO} disabled={guardando} onClick={() => cambiarFormal(confirmar === "encender")}>
                    {confirmar === "encender" ? "Sí, encender" : "Sí, apagar"}
                  </button>
                  <button type="button" className={BOTON_SECUNDARIO} disabled={guardando} onClick={() => setConfirmar(null)}>Cancelar</button>
                </div>
              </div>
            ) : encendida ? (
              <button type="button" className={`${BOTON_PELIGRO} w-fit`} onClick={() => setConfirmar("apagar")}>Apagar nómina formal</button>
            ) : (
              <button type="button" className={`${BOTON} w-fit`} disabled={!data.puede_encender} onClick={() => setConfirmar("encender")}>Encender nómina formal</button>
            )}
          </Tarjeta>

          <Tarjeta id="titulo-empresa" titulo="Datos fiscales de la empresa">
            <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Registro patronal (IMSS)" htmlFor="cfg-registro_patronal" ayuda="11 letras y números, sin guiones.">
                <input className={CAMPO} maxLength={14} autoComplete="off" {...campo("registro_patronal")} />
              </Campo>
              <Campo etiqueta="Prima de riesgo de trabajo (%)" htmlFor="cfg-prima_riesgo" ayuda="La de tu última determinación ante el IMSS. Empresas nuevas clase I: 0.54355.">
                <input className={CAMPO} inputMode="decimal" {...campo("prima_riesgo")} />
              </Campo>
              <Campo etiqueta="RFC de la empresa" htmlFor="cfg-rfc">
                <input className={CAMPO} maxLength={13} autoComplete="off" {...campo("rfc")} />
              </Campo>
              <Campo etiqueta="Régimen fiscal" htmlFor="cfg-regimen_fiscal">
                <select className={CAMPO} {...campo("regimen_fiscal")}>
                  <option value="">Elige el régimen…</option>
                  {data.catalogos.regimen_fiscal.map((r) => <option key={r.clave} value={r.clave}>{r.clave} · {r.texto}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Código postal de expedición" htmlFor="cfg-cp_expedicion">
                <input className={CAMPO} inputMode="numeric" maxLength={5} {...campo("cp_expedicion")} />
              </Campo>
              <Campo etiqueta="Zona del salario mínimo" htmlFor="cfg-zona_salario_minimo">
                <select className={CAMPO} {...campo("zona_salario_minimo")}>
                  <option value="general">Resto del país</option>
                  <option value="zlfn">Zona Libre de la Frontera Norte</option>
                </select>
              </Campo>
              <div className="sm:col-span-2">
                <button type="submit" className={BOTON} disabled={!hayCambios || guardando}>{guardando ? "Guardando…" : "Guardar datos de la empresa"}</button>
              </div>
            </form>
          </Tarjeta>

          <Tarjeta id="titulo-tablas" titulo={`Tablas fiscales ${data.tablas.anio}`}
            acciones={<Etiqueta tono={data.tablas.completas ? "verde" : "ambar"}>{data.tablas.completas ? "Confirmadas" : `${data.tablas.pendientes.length} por confirmar`}</Etiqueta>}>
            <p>UMA, salario mínimo, tarifa del ISR, subsidio para el empleo y cuotas del IMSS. Cada valor dice de dónde sale (DOF, SAT o IMSS) y si ya lo confirmó un administrador de ADAMIA con un contador.</p>
            {data.es_admin ? <Link href="/dashboard/tablas-fiscales" className={`${BOTON_SECUNDARIO} w-fit`}>Revisar y confirmar las tablas</Link>
              : <p className="text-slate-700">Las confirma el equipo de ADAMIA. Mientras haya valores por confirmar, la nómina formal no se puede encender.</p>}
          </Tarjeta>

          <Tarjeta id="titulo-falta" titulo="Lo que falta para nómina formal">
            {data.faltantes.empresa.bloquea.length || data.faltantes.empresa.avisos.length ? (
              <div className="grid gap-2">
                <h3 className="text-lg font-bold">La empresa</h3>
                {data.faltantes.empresa.bloquea.length ? <p><Etiqueta tono="rojo">Bloquea el cálculo</Etiqueta> <span className="ml-1">{data.faltantes.empresa.bloquea.join(", ")}</span></p> : null}
                {data.faltantes.empresa.avisos.length ? <p><Etiqueta tono="ambar">Para timbrar después</Etiqueta> <span className="ml-1">{data.faltantes.empresa.avisos.join(", ")}</span></p> : null}
              </div>
            ) : <p className="font-bold text-emerald-800">A la empresa no le falta nada.</p>}
            <div className="grid gap-2">
              <h3 className="text-lg font-bold">Las personas ({data.faltantes.personas_bloqueadas} sin poder calcular de {data.faltantes.total_personas})</h3>
              {data.faltantes.empleados.length === 0 ? <p className="font-bold text-emerald-800">A nadie le falta nada.</p> : (
                <ul className="grid gap-3" aria-label="Personas con datos por completar">
                  {data.faltantes.empleados.map((p) => (
                    <li key={p.id_empleado} className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_auto] sm:items-center" data-persona={p.id_empleado}>
                      <div className="grid min-w-0 gap-1.5">
                        <p className="font-bold">{p.nombre}{p.puesto ? <span className="font-normal text-slate-600"> · {p.puesto}</span> : null}</p>
                        {p.bloquea.length ? <p><Etiqueta tono="rojo">Bloquea el cálculo</Etiqueta> <span className="ml-1">{p.bloquea.join(", ")}</span></p> : null}
                        {p.avisos.length ? <p><Etiqueta tono="ambar">Para timbrar después</Etiqueta> <span className="ml-1">{p.avisos.join(", ")}</span></p> : null}
                      </div>
                      <Link href={`/panel/nomina/configuracion/personas/${p.id_empleado}`} className={`${BOTON_SECUNDARIO} w-full sm:w-auto`}>Completar datos</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Tarjeta>
        </div>
      )}
    </ModuloNomina>
  );
}
