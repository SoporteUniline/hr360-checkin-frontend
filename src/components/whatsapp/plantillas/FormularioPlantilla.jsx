"use client";

// Crear / editar una plantilla de WhatsApp con vista previa en vivo. Al editar, nombre, idioma y categoría no cambian
// (regla de Meta); para cambiarlos se crea una versión nueva. `guardar(cuerpo)` regresa null o { error, errores }.
import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CATEGORIAS, IDIOMAS, LIMITES, TIPOS_BOTON, ajustarEjemplos, cuentaVariables, erroresDe, paraApi, siguienteVariable, validar,
} from "@/lib/whatsapp/plantillasMeta.mjs";
import BurbujaWhatsapp from "./BurbujaWhatsapp";
import { area, ayuda, boton, botonSec, campo, dialogo, etiqueta } from "./estilos";

function Errores({ lista, id }) {
  if (!lista.length) return null;
  return <ul id={id} className="mt-1 grid gap-0.5 text-[13px] text-red-700">{lista.map((m) => <li key={m}>{m}</li>)}</ul>;
}

export default function FormularioPlantilla({ abierto, modo = "crear", inicial, cuentaTexto, alCerrar, guardar }) {
  const [f, setF] = useState(inicial);
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const refCuerpo = useRef(null);
  const editando = modo === "editar";

  useEffect(() => {
    if (!abierto) return;
    setF(inicial);
    setMostrarErrores(false);
    setErrorServidor("");
  }, [abierto, inicial]);

  if (!f) return null;
  const errores = validar(f);
  const de = (c) => (mostrarErrores ? erroresDe(errores, c) : []);
  const cambia = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const cambiaCuerpo = (valor) => setF((x) => ({ ...x, cuerpo: valor, ejemplos: ajustarEjemplos(valor, x.ejemplos) }));
  const agregarVariable = () => {
    const el = refCuerpo.current;
    const v = siguienteVariable(f.cuerpo);
    const ini = el?.selectionStart ?? f.cuerpo.length;
    const fin = el?.selectionEnd ?? f.cuerpo.length;
    cambiaCuerpo(`${f.cuerpo.slice(0, ini)}${v}${f.cuerpo.slice(fin)}`);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(ini + v.length, ini + v.length); });
  };
  const cambiaEjemplo = (i) => (e) => setF((x) => ({ ...x, ejemplos: x.ejemplos.map((v, j) => (j === i ? e.target.value : v)) }));
  const cambiaBoton = (i, k) => (e) => setF((x) => ({ ...x, botones: x.botones.map((b, j) => (j === i ? { ...b, [k]: e.target.value } : b)) }));
  const quitarBoton = (i) => setF((x) => ({ ...x, botones: x.botones.filter((_, j) => j !== i) }));
  const agregarBoton = () => setF((x) => ({ ...x, botones: [...x.botones, { tipo: "QUICK_REPLY", texto: "" }] }));
  const encVars = cuentaVariables(f.encabezado?.texto);

  const enviar = async (e) => {
    e.preventDefault();
    setMostrarErrores(true);
    setErrorServidor("");
    if (errores.length) return;
    setGuardando(true);
    const r = await guardar(paraApi(f));
    setGuardando(false);
    if (r?.error) setErrorServidor([r.error, ...(r.errores ?? []).slice(1).map((x) => x.mensaje)].join(" "));
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !guardando && alCerrar()}>
      <DialogContent className={`${dialogo} sm:max-w-5xl`}>
        <DialogHeader>
          <DialogTitle>{editando ? `Editar ${f.nombre}` : "Nueva plantilla de WhatsApp"}</DialogTitle>
          <DialogDescription className="text-[13px]">
            {editando
              ? "Al guardar vuelve a revisión de Meta y no se puede mandar hasta que la aprueben. Meta deja editar una aprobada 1 vez cada 24 h."
              : `Se manda a aprobación de Meta en ${cuentaTexto}. La revisión tarda hasta 24 h.`}
          </DialogDescription>
        </DialogHeader>
        <form data-formulario-plantilla noValidate onSubmit={enviar} className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-4">
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <label className="grid min-w-0 gap-1 sm:col-span-3">
                <span className={etiqueta}>Nombre</span>
                <input className={campo} value={f.nombre} onChange={cambia("nombre")} disabled={editando} placeholder="adamia_aviso_nuevo" autoComplete="off" spellCheck={false} aria-invalid={de("nombre").length > 0} />
                <span className={ayuda}>Minúsculas, números y guion bajo. No se puede cambiar después.</span>
                <Errores lista={de("nombre")} />
              </label>
              <label className="grid min-w-0 gap-1 sm:col-span-2">
                <span className={etiqueta}>Categoría</span>
                <select className={campo} value={f.categoria} onChange={cambia("categoria")} disabled={editando}>
                  {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.texto} ({c.valor})</option>)}
                </select>
                <span className={ayuda}>{CATEGORIAS.find((c) => c.valor === f.categoria)?.ayuda} Meta puede cambiarla al aprobar.</span>
              </label>
              <label className="grid min-w-0 gap-1">
                <span className={etiqueta}>Idioma</span>
                <select className={campo} value={f.idioma} onChange={cambia("idioma")} disabled={editando}>
                  {[...IDIOMAS, ...(IDIOMAS.some((i) => i.valor === f.idioma) ? [] : [{ valor: f.idioma, texto: f.idioma }])].map((i) => <option key={i.valor} value={i.valor}>{i.texto}</option>)}
                </select>
                <Errores lista={de("idioma")} />
              </label>
            </div>

            <fieldset className="grid min-w-0 gap-2">
              <legend className={etiqueta}>Encabezado (opcional)</legend>
              <input className={campo} aria-label="Texto del encabezado" value={f.encabezado?.texto ?? ""} maxLength={LIMITES.encabezado + 20}
                onChange={(e) => setF((x) => ({ ...x, encabezado: e.target.value ? { texto: e.target.value, ejemplo: x.encabezado?.ejemplo ?? "" } : null }))} placeholder="Sin encabezado" />
              {encVars ? <input className={campo} aria-label="Ejemplo de {{1}} del encabezado" value={f.encabezado?.ejemplo ?? ""} onChange={(e) => setF((x) => ({ ...x, encabezado: { ...x.encabezado, ejemplo: e.target.value } }))} placeholder="Ejemplo de {{1}}" /> : null}
              <span className={ayuda}>Hasta {LIMITES.encabezado} caracteres, sin emojis; admite {"{{1}}"}.</span>
              <Errores lista={de("encabezado")} />
            </fieldset>

            <div className="grid min-w-0 gap-1">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <label htmlFor="cuerpo-plantilla" className={etiqueta}>Cuerpo</label>
                <button type="button" className={botonSec} onClick={agregarVariable}><Plus className="size-4" /> Agregar variable</button>
              </div>
              <textarea id="cuerpo-plantilla" ref={refCuerpo} rows={6} className={area} value={f.cuerpo} onChange={(e) => cambiaCuerpo(e.target.value)}
                placeholder="Hola {{1}}, tu evaluación de {{2}} ya está lista. Entra a ADAMIA para verla." aria-invalid={de("cuerpo").length > 0} />
              <p className={`text-right text-[13px] tabular-nums ${f.cuerpo.length > LIMITES.cuerpo ? "text-red-700" : "text-slate-500"}`}>{f.cuerpo.length} / {LIMITES.cuerpo}</p>
              <Errores lista={de("cuerpo")} />
            </div>

            {f.ejemplos.length ? (
              <fieldset data-ejemplos className="grid min-w-0 gap-2 rounded-xl border border-slate-200 p-3">
                <legend className={`${etiqueta} px-1`}>Ejemplos de las variables (Meta los pide para revisar)</legend>
                {f.ejemplos.map((v, i) => (
                  <label key={i} className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-slate-700">{`{{${i + 1}}}`}</span>
                    <input className={campo} value={v} onChange={cambiaEjemplo(i)} aria-label={`Ejemplo de {{${i + 1}}}`} placeholder="Ej. Ana" />
                  </label>
                ))}
                <Errores lista={de("ejemplos")} />
              </fieldset>
            ) : null}

            <label className="grid min-w-0 gap-1">
              <span className={etiqueta}>Pie (opcional)</span>
              <input className={campo} value={f.pie} onChange={cambia("pie")} placeholder="Ej. Mensaje automático de ADAMIA" />
              <span className={ayuda}>Hasta {LIMITES.pie} caracteres, sin variables.</span>
              <Errores lista={de("pie")} />
            </label>

            <fieldset className="grid min-w-0 gap-2">
              <legend className={etiqueta}>Botones (opcional)</legend>
              {f.botones.map((b, i) => (
                <div key={i} data-boton-plantilla={i} className="grid min-w-0 gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto]">
                  <select className={campo} aria-label={`Tipo del botón ${i + 1}`} value={b.tipo} onChange={cambiaBoton(i, "tipo")}>
                    {TIPOS_BOTON.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
                  </select>
                  <input className={campo} aria-label={`Texto del botón ${i + 1}`} value={b.texto} onChange={cambiaBoton(i, "texto")} placeholder="Texto (máx. 25)" />
                  <button type="button" className={botonSec} onClick={() => quitarBoton(i)} aria-label={`Quitar botón ${i + 1}`}><Trash2 className="size-4" /></button>
                  {b.tipo === "URL" ? (
                    <>
                      <input className={`${campo} sm:col-span-3`} aria-label={`Enlace del botón ${i + 1}`} value={b.url ?? ""} onChange={cambiaBoton(i, "url")} placeholder="https://adamia.com.mx/… (puede terminar en {{1}})" inputMode="url" />
                      {/\{\{1\}\}$/.test(b.url ?? "") ? <input className={`${campo} sm:col-span-3`} aria-label={`Ejemplo del enlace del botón ${i + 1}`} value={b.ejemplo ?? ""} onChange={cambiaBoton(i, "ejemplo")} placeholder="Enlace completo de ejemplo" /> : null}
                    </>
                  ) : null}
                  {b.tipo === "PHONE_NUMBER" ? <input className={`${campo} sm:col-span-3`} aria-label={`Teléfono del botón ${i + 1}`} value={b.telefono ?? ""} onChange={cambiaBoton(i, "telefono")} placeholder="+525512345678" inputMode="tel" /> : null}
                </div>
              ))}
              {f.botones.length < LIMITES.botones ? <button type="button" className={`${botonSec} justify-self-start`} onClick={agregarBoton}><Plus className="size-4" /> Agregar botón</button> : null}
              <Errores lista={de("botones")} />
            </fieldset>
          </div>

          <div className="grid min-w-0 content-start gap-3 md:sticky md:top-0">
            <BurbujaWhatsapp plantilla={f} />
            {mostrarErrores && errores.length ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">Corrige {errores.length} detalle(s) antes de mandarla a Meta.</p> : null}
            {errorServidor ? <p role="alert" data-error-servidor className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">{errorServidor}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
              <button type="submit" className={boton} disabled={guardando}>{guardando ? <Loader2 className="size-4 animate-spin" /> : null}{editando ? "Guardar y mandar a revisión" : "Crear y enviar a aprobación"}</button>
              <button type="button" className={botonSec} onClick={alCerrar} disabled={guardando}>Cancelar</button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
