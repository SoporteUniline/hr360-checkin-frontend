"use client";

// Una carpeta del expediente: documentos propios (con su plazo de guarda y sus acciones) y lo que viene de otros módulos
// de ADAMIA (contratos, recibos, vacaciones, actas…), que se ven aquí sin copiarse. Depurar pide confirmar en la página.
import { useState } from "react";
import { accionesDocumento, fechaMx, tamano, textoGuarda } from "@/lib/expediente/presentacion.mjs";
import FormArchivo from "./FormArchivo";
import { BOTON_PELIGRO, BOTON_SECUNDARIO, CAMPO, Etiqueta, SECUNDARIO } from "./Piezas";

const VIGENCIA = { VENCIDO: ["Vencido", "rojo"], POR_VENCER: ["Vence pronto", "ambar"] };

function Documento({ doc, puedeEditar, acciones }) {
  const [abierto, setAbierto] = useState(null); // "reemplazar" | "depurar"
  const [ocupado, setOcupado] = useState(false);
  const botones = accionesDocumento(doc, { puedeEditar });
  const correr = async (fn) => {
    setOcupado(true);
    try { await fn(); setAbierto(null); } finally { setOcupado(false); }
  };
  const vigencia = VIGENCIA[doc.estatus];
  const archivado = doc.estatus_manual === "ARCHIVADO";
  return (
    <li data-documento={doc.id} className="grid gap-2 border-b border-slate-200 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 break-words font-bold">{doc.nombre_documento}</p>
        {Number(doc.version) > 1 ? <Etiqueta tono="azul">Versión {doc.version}</Etiqueta> : null}
        {archivado ? <Etiqueta tono="gris">{doc.reemplazado_por_id ? "Versión anterior" : "Archivado"}</Etiqueta> : null}
        {vigencia && !archivado ? <Etiqueta tono={vigencia[1]}>{vigencia[0]}</Etiqueta> : null}
      </div>
      <p className={SECUNDARIO}>
        {[doc.fecha_emision ? `Fecha: ${fechaMx(doc.fecha_emision)}` : `Subido: ${fechaMx(doc.created_at)}`, doc.fecha_vencimiento ? `Vence: ${fechaMx(doc.fecha_vencimiento)}` : null,
          doc.categoria_nombre, tamano(doc.archivo_tamano_bytes)].filter(Boolean).join(" · ")}
      </p>
      {textoGuarda(doc.guarda) ? <p className={SECUNDARIO} data-guarda>{textoGuarda(doc.guarda)}</p> : null}
      {!abierto ? (
        <div className="flex flex-wrap gap-3">
          {botones.includes("ver") ? <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => correr(() => acciones.ver(doc))}>Ver</button> : null}
          {botones.includes("reemplazar") ? <button type="button" className={BOTON_SECUNDARIO} onClick={() => setAbierto("reemplazar")}>Reemplazar</button> : null}
          {botones.includes("archivar") ? <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => correr(() => acciones.archivar(doc))}>Archivar</button> : null}
          {botones.includes("restaurar") ? <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => correr(() => acciones.restaurar(doc))}>Restaurar</button> : null}
          {botones.includes("depurar") ? <button type="button" className={BOTON_PELIGRO} onClick={() => setAbierto("depurar")}>Depurar</button> : null}
        </div>
      ) : null}
      {abierto === "reemplazar" ? (
        <FormArchivo
          titulo={`Reemplazar: ${doc.nombre_documento}`}
          ayuda="La versión anterior se conserva archivada con su archivo; no se borra."
          nombreInicial={doc.nombre_documento}
          sugerirVencimiento={Number(doc.vence) === 1}
          textoGuardar="Guardar versión nueva"
          onCancelar={() => setAbierto(null)}
          onEnviar={async (datos) => { await acciones.reemplazar(doc, datos); setAbierto(null); }}
        />
      ) : null}
      {abierto === "depurar" ? (
        <div role="group" aria-label="Confirmar depuración" className="grid gap-3 rounded-xl border border-red-300 bg-red-50 p-4" onKeyDown={(e) => { if (e.key === "Escape") setAbierto(null); }}>
          <p className="font-bold text-[#7F1D1D]">¿Borrar «{doc.nombre_documento}» de forma definitiva?</p>
          <p className="text-[#7F1D1D]">{textoGuarda(doc.guarda)} El archivo se borra y el movimiento queda en la bitácora. No se puede deshacer.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={`${BOTON_PELIGRO} bg-white`} disabled={ocupado} autoFocus onClick={() => correr(() => acciones.depurar(doc))}>Sí, borrar definitivamente</button>
            <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => setAbierto(null)}>Cancelar</button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Vinculo({ v }) {
  return (
    <li data-vinculo={v.tipo} className="grid gap-1 border-b border-slate-200 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 break-words font-bold">{v.titulo}</p>
        <Etiqueta tono="azul">De {v.origen}</Etiqueta>
      </div>
      <p className={SECUNDARIO}>{[v.fecha ? fechaMx(v.fecha) : null, v.detalle, v.con_archivo ? "Va en el ZIP" : "Se lista en el índice del ZIP"].filter(Boolean).join(" · ")}</p>
    </li>
  );
}

export default function Carpeta({ carpeta, puedeEditar, clavesSubir = [], acciones }) {
  const [clave, setClave] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const docs = carpeta.documentos ?? [];
  const vinculos = carpeta.vinculos ?? [];
  const elegida = clavesSubir.find((c) => c.clave === clave);
  return (
    <article data-carpeta={carpeta.clave} className="grid gap-2 rounded-xl border border-slate-300 p-4">
      <h3 className="text-[19px] font-bold sm:text-lg">{carpeta.nombre}</h3>
      {docs.length + vinculos.length === 0 ? <p className={SECUNDARIO}>Sin documentos todavía.</p> : null}
      <ul className="grid">
        {docs.map((d) => <Documento key={d.id} doc={d} puedeEditar={puedeEditar} acciones={acciones} />)}
        {vinculos.map((v) => <Vinculo key={`${v.tipo}-${v.id}`} v={v} />)}
      </ul>
      {puedeEditar && clavesSubir.length ? (
        subiendo && elegida ? (
          <FormArchivo
            titulo={`Subir a «${carpeta.nombre}»: ${elegida.nombre}`}
            nombreInicial={elegida.nombre}
            onCancelar={() => { setSubiendo(false); setClave(""); }}
            onEnviar={async (datos) => { await acciones.subir(elegida.clave, datos); setSubiendo(false); setClave(""); }}
          />
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-0 flex-1 gap-1.5 sm:max-w-md">
              <label htmlFor={`subir-${carpeta.clave}`} className="font-bold">Subir a esta carpeta</label>
              <select id={`subir-${carpeta.clave}`} className={CAMPO} value={clave} onChange={(e) => setClave(e.target.value)}>
                <option value="">Elige qué documento es…</option>
                {clavesSubir.map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
              </select>
            </div>
            <button type="button" className={BOTON_SECUNDARIO} disabled={!clave} onClick={() => setSubiendo(true)}>Continuar</button>
          </div>
        )
      ) : null}
    </article>
  );
}

