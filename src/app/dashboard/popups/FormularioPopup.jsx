"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PopupTarjeta from "@/components/landing/popups/PopupTarjeta";
import { PAGINAS, DISPARADORES, DISPOSITIVOS, ENLACES, VACIO, aInputFecha } from "./opciones";

const OTRA = "__otra__";
const campo = "grid gap-1.5";
const select = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

// Formulario de alta/edición con vista previa en vivo. `guardar(formData)` regresa el mensaje de error o null.
export default function FormularioPopup({ abierto, popup, alCerrar, guardar }) {
  const [form, setForm] = useState(VACIO);
  const [imagen, setImagen] = useState(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setForm(popup ? { ...VACIO, ...popup, cupon: popup.cupon ?? "", texto: popup.texto ?? "", fecha_inicio: aInputFecha(popup.fecha_inicio), fecha_fin: aInputFecha(popup.fecha_fin) } : VACIO);
    setImagen(null);
    setQuitarImagen(false);
    setError("");
  }, [abierto, popup]);

  const urlImagen = useMemo(() => (imagen ? URL.createObjectURL(imagen) : null), [imagen]);
  useEffect(() => () => urlImagen && URL.revokeObjectURL(urlImagen), [urlImagen]);

  const cambia = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const enlaceElegido = ENLACES.some((o) => o.valor === form.boton_url) ? form.boton_url : OTRA;
  const togglePagina = (valor) =>
    setForm((f) => {
      if (valor === "todas") return { ...f, paginas: ["todas"] };
      const sinTodas = f.paginas.filter((p) => p !== "todas");
      const nuevas = sinTodas.includes(valor) ? sinTodas.filter((p) => p !== valor) : [...sinTodas, valor];
      return { ...f, paginas: nuevas.length ? nuevas : ["todas"] };
    });

  const vista = {
    ...form,
    imagen_url: urlImagen ?? (quitarImagen ? null : popup?.imagen_url ?? null),
    titulo: form.titulo || "Título del pop-up",
    boton_texto: form.boton_texto || "Botón",
  };

  const enviar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const datos = new FormData();
    for (const [k, v] of Object.entries(form)) {
      if (["id", "imagen_url", "imagen_key", "vistas", "clics", "cierres", "creado_en", "actualizado_en", "creado_por_nombre", "actualizado_por_nombre"].includes(k)) continue;
      datos.append(k, k === "paginas" ? JSON.stringify(v) : v ?? "");
    }
    if (imagen) datos.append("imagen", imagen);
    else if (quitarImagen) datos.append("quitar_imagen", "1");
    const mensaje = await guardar(datos);
    setGuardando(false);
    if (mensaje) setError(mensaje);
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && alCerrar()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{popup ? "Editar pop-up" : "Nuevo pop-up"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-4">
            <div className={campo}>
              <Label htmlFor="pv-nombre">Nombre interno</Label>
              <Input id="pv-nombre" value={form.nombre} onChange={cambia("nombre")} placeholder="Buen Fin 2026" maxLength={120} required />
            </div>
            <div className={campo}>
              <Label htmlFor="pv-titulo">Título</Label>
              <Input id="pv-titulo" value={form.titulo} onChange={cambia("titulo")} placeholder="30 % en tu primer año" maxLength={120} required />
            </div>
            <div className={campo}>
              <Label htmlFor="pv-texto">Texto (opcional)</Label>
              <Textarea id="pv-texto" value={form.texto} onChange={cambia("texto")} maxLength={400} rows={3} />
            </div>
            <div className={campo}>
              <Label htmlFor="pv-imagen">Imagen (JPG, PNG o WebP, hasta 3 MB)</Label>
              <Input id="pv-imagen" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setImagen(e.target.files?.[0] ?? null); setQuitarImagen(false); }} />
              {popup?.imagen_url && !imagen ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={quitarImagen} onChange={(e) => setQuitarImagen(e.target.checked)} /> Quitar la imagen actual
                </label>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={campo}>
                <Label htmlFor="pv-boton">Texto del botón que envía los datos</Label>
                <Input id="pv-boton" value={form.boton_texto} onChange={cambia("boton_texto")} maxLength={60} required />
              </div>
              <div className={campo}>
                <Label htmlFor="pv-enlace">Después de enviar, «Continuar» lleva a</Label>
                <select id="pv-enlace" className={select} value={enlaceElegido} onChange={(e) => setForm((f) => ({ ...f, boton_url: e.target.value === OTRA ? "https://" : e.target.value }))}>
                  {ENLACES.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                  <option value={OTRA}>Otra dirección…</option>
                </select>
              </div>
            </div>
            {enlaceElegido === OTRA ? (
              <div className={campo}>
                <Label htmlFor="pv-url">Dirección (ruta /… o https://…)</Label>
                <Input id="pv-url" value={form.boton_url} onChange={cambia("boton_url")} maxLength={500} required />
              </div>
            ) : null}
            <div className={campo}>
              <Label htmlFor="pv-cupon">Cupón (opcional)</Label>
              <Input id="pv-cupon" value={form.cupon} onChange={(e) => setForm((f) => ({ ...f, cupon: e.target.value.toUpperCase() }))} placeholder="BUENFIN26" maxLength={40} />
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Dónde aparece</legend>
              <div className="flex flex-wrap gap-3">
                {PAGINAS.map((p) => (
                  <label key={p.valor} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.paginas.includes(p.valor)} onChange={() => togglePagina(p.valor)} /> {p.texto}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={campo}>
                <Label htmlFor="pv-disp">Cuándo aparece</Label>
                <select id="pv-disp" className={select} value={form.disparador} onChange={cambia("disparador")}>
                  {DISPARADORES.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                </select>
              </div>
              {form.disparador === "tiempo" ? (
                <div className={campo}>
                  <Label htmlFor="pv-seg">Segundos (mínimo 3)</Label>
                  <Input id="pv-seg" type="number" min={3} max={120} value={form.segundos} onChange={cambia("segundos")} />
                </div>
              ) : form.disparador === "scroll" ? (
                <div className={campo}>
                  <Label htmlFor="pv-scroll">Al bajar el % de la página</Label>
                  <Input id="pv-scroll" type="number" min={10} max={90} value={form.scroll_pct} onChange={cambia("scroll_pct")} />
                </div>
              ) : <div />}
              <div className={campo}>
                <Label htmlFor="pv-frec">Se vuelve a mostrar cada (días; 0 = cada visita)</Label>
                <Input id="pv-frec" type="number" min={0} max={365} value={form.frecuencia_dias} onChange={cambia("frecuencia_dias")} />
              </div>
              <div className={campo}>
                <Label htmlFor="pv-dispositivos">Dispositivos</Label>
                <select id="pv-dispositivos" className={select} value={form.dispositivos} onChange={cambia("dispositivos")}>
                  {DISPOSITIVOS.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                </select>
              </div>
              <div className={campo}>
                <Label htmlFor="pv-ini">Desde (hora de CDMX, opcional)</Label>
                <Input id="pv-ini" type="datetime-local" value={form.fecha_inicio} onChange={cambia("fecha_inicio")} />
              </div>
              <div className={campo}>
                <Label htmlFor="pv-fin">Hasta (opcional)</Label>
                <Input id="pv-fin" type="datetime-local" value={form.fecha_fin} onChange={cambia("fecha_fin")} />
              </div>
              <div className={campo}>
                <Label htmlFor="pv-prio">Prioridad (si hay varios, sale el mayor)</Label>
                <Input id="pv-prio" type="number" min={-100} max={100} value={form.prioridad} onChange={cambia("prioridad")} />
              </div>
              <div className={campo}>
                <Label htmlFor="pv-estado">Estado</Label>
                <select id="pv-estado" className={select} value={form.estado} onChange={cambia("estado")}>
                  <option value="pausado">Pausado (no se muestra)</option>
                  <option value="activo">Activo (se muestra)</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid content-start gap-2">
            <p className="text-sm font-medium">Vista previa</p>
            <div className="rounded-xl bg-slate-900/60 p-4">
              <PopupTarjeta popup={vista} alCerrar={() => {}} vistaPrevia />
            </div>
          </div>
          {error ? <p role="alert" className="text-sm text-red-600 lg:col-span-2">{error}</p> : null}
          <DialogFooter className="lg:col-span-2">
            <Button type="button" variant="outline" onClick={alCerrar}>Cancelar</Button>
            <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
