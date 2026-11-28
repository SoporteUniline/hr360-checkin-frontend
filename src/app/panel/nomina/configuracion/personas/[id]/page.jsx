"use client";

// Datos fiscales de una persona para la nómina formal (R3): salario diario integrado (calculado con el factor de ley o
// capturado), código postal fiscal y claves SAT de contrato, régimen y jornada. NSS, RFC y CURP siguen en su ficha.
// Backend: GET/PUT /checador/nomina/fiscal/empleados/:id. Es una página, no una ventana.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { ArrowLeft } from "lucide-react";
import axios from "@/lib/axios";
import { mensajeError } from "@/components/nomina/comun";
import { Cargando, ErrorCarga } from "@/components/nomina/ModuloNomina";
import { Aviso, BOTON, BOTON_SECUNDARIO, CAMPO, Campo, Etiqueta, Tarjeta } from "@/components/nomina/PiezasFormal";
import { dinero, fechaCorta } from "@/lib/nomina/nomina.mjs";
import { cambiosDe, valorCampo } from "@/lib/nomina/formal.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const CAMPOS = ["sdi_manual", "cp_fiscal", "tipo_contrato_sat", "tipo_regimen_sat", "tipo_jornada_sat"];

export default function DatosFiscalesPersona() {
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const { data, error, isLoading, mutate } = useSWR(`/checador/nomina/fiscal/empleados/${id}`, get);
  const [borrador, setBorrador] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (data?.fiscal) setBorrador(Object.fromEntries(CAMPOS.map((k) => [k, valorCampo(data.fiscal[k])])));
  }, [data]);

  if (error) return <div className="p-1"><ErrorCarga error={error} texto="No se pudieron cargar sus datos fiscales." /></div>;
  if (isLoading || !data) return <div className="p-1"><Cargando /></div>;

  const { empleado, fiscal, sugerencias, sdi_ley: sdiLey, faltantes, catalogos } = data;
  const original = Object.fromEntries(CAMPOS.map((k) => [k, fiscal?.[k] ?? null]));
  const cambios = cambiosDe(original, borrador);
  const campo = (k) => ({ id: `fis-${k}`, value: borrador[k] ?? "", onChange: (e) => setBorrador({ ...borrador, [k]: e.target.value }) });
  const sugerir = (k) => (sugerencias?.[k] && !borrador[k] ? (
    <button type="button" className="inline-flex min-h-12 w-fit items-center text-base font-bold text-[#1D3FB8] underline" onClick={() => setBorrador({ ...borrador, [k]: sugerencias[k] })}>
      Usar la sugerida: {sugerencias[k]}
    </button>
  ) : null);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await axios.put(`/checador/nomina/fiscal/empleados/${id}`, cambios);
      enqueueSnackbar("Datos fiscales guardados. Recalcula la nómina en borrador para que los tome.", { variant: "success" });
      await mutate();
    } catch (err) {
      enqueueSnackbar(mensajeError(err, "No se pudieron guardar sus datos."), { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="grid max-w-4xl gap-5 p-1 text-base text-[#0B1033]" data-pagina="datos-fiscales-persona">
      <header className="grid gap-2">
        <Link href="/panel/nomina/configuracion" className="inline-flex min-h-12 w-fit items-center gap-2 text-base font-bold text-[#1D3FB8] hover:underline">
          <ArrowLeft className="size-5" aria-hidden="true" /> Configuración de nómina
        </Link>
        <h1 className="text-3xl font-bold">{empleado.nombre}</h1>
        <p className="text-[17px] text-slate-700">Datos fiscales para la nómina formal{empleado.puesto ? ` · ${empleado.puesto}` : ""}</p>
      </header>

      {faltantes.bloquea.length ? (
        <Aviso tono="rojo" titulo="Sin esto no se le puede calcular el ISR ni el IMSS">
          <ul className="grid list-disc gap-1 pl-5">{faltantes.bloquea.map((f) => <li key={f}>{f}</li>)}</ul>
        </Aviso>
      ) : <Aviso tono="verde" titulo="Ya se le puede calcular el ISR y el IMSS." />}

      <Tarjeta id="titulo-ficha" titulo="De su ficha" acciones={<Link href={`/panel/empleados?id=${empleado.id_empleado}`} className={BOTON_SECUNDARIO}>Editar en su ficha</Link>}>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[["Número de seguridad social (NSS)", empleado.nss], ["RFC", empleado.rfc], ["CURP", empleado.curp], ["Fecha de ingreso", empleado.fecha_ingreso ? fechaCorta(empleado.fecha_ingreso) : null]].map(([k, v]) => (
            <div key={k} className="grid gap-0.5">
              <dt className="font-bold">{k}</dt>
              <dd>{v || <Etiqueta tono="ambar">Sin capturar</Etiqueta>}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      <form onSubmit={guardar} className="grid gap-5">
        <Tarjeta id="titulo-sdi" titulo="Salario diario integrado (SDI)">
          {sdiLey ? (
            <p data-sdi-ley>Calculado por ley: <b>{dinero(sdiLey.sdi)}</b>. <span className="text-slate-700">{sdiLey.formula}.</span></p>
          ) : <p className="text-slate-700">No tiene sueldo fijo para calcularlo (por ejemplo, cobra por comisión): captúralo.</p>}
          <Campo etiqueta="SDI capturado (opcional)" htmlFor="fis-sdi_manual"
            ayuda="Déjalo vacío para usar el calculado. Captúralo si tiene prestaciones mayores a las de la ley o una parte variable.">
            <input className={CAMPO} inputMode="decimal" placeholder={sdiLey ? String(sdiLey.sdi) : "$"} {...campo("sdi_manual")} />
          </Campo>
        </Tarjeta>

        <Tarjeta id="titulo-sat" titulo="Para timbrar más adelante (catálogos del SAT)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Código postal fiscal" htmlFor="fis-cp_fiscal" ayuda="El de su constancia de situación fiscal.">
              <input className={CAMPO} inputMode="numeric" maxLength={5} {...campo("cp_fiscal")} />
            </Campo>
            <Campo etiqueta="Tipo de régimen" htmlFor="fis-tipo_regimen_sat">
              <select className={CAMPO} {...campo("tipo_regimen_sat")}>
                <option value="">Elige…</option>
                {catalogos.tipo_regimen.map((c) => <option key={c.clave} value={c.clave}>{c.clave} · {c.texto}</option>)}
              </select>
              {sugerir("tipo_regimen_sat")}
            </Campo>
            <Campo etiqueta="Tipo de contrato" htmlFor="fis-tipo_contrato_sat" ayuda={empleado.tipo_contrato_texto ? `En su contrato dice: «${empleado.tipo_contrato_texto}».` : null}>
              <select className={CAMPO} {...campo("tipo_contrato_sat")}>
                <option value="">Elige…</option>
                {catalogos.tipo_contrato.map((c) => <option key={c.clave} value={c.clave}>{c.clave} · {c.texto}</option>)}
              </select>
              {sugerir("tipo_contrato_sat")}
            </Campo>
            <Campo etiqueta="Tipo de jornada" htmlFor="fis-tipo_jornada_sat" ayuda={empleado.tipo_jornada_texto ? `En su contrato dice: «${empleado.tipo_jornada_texto}».` : null}>
              <select className={CAMPO} {...campo("tipo_jornada_sat")}>
                <option value="">Elige…</option>
                {catalogos.tipo_jornada.map((c) => <option key={c.clave} value={c.clave}>{c.clave} · {c.texto}</option>)}
              </select>
              {sugerir("tipo_jornada_sat")}
            </Campo>
          </div>
          {faltantes.avisos.length ? <p className="text-slate-700">Faltan para timbrar: {faltantes.avisos.join(", ")}.</p> : null}
        </Tarjeta>

        <button type="submit" className={`${BOTON} w-fit`} disabled={!Object.keys(cambios).length || guardando}>{guardando ? "Guardando…" : "Guardar datos fiscales"}</button>
      </form>
    </div>
  );
}
