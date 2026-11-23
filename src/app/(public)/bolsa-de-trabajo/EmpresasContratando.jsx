"use client";
/* eslint-disable @next/next/no-img-element -- logos de las empresas (S3) con tamaño fijo; next/image exige dominios */

// 27/11/2026: la bolsa de trabajo es opcional por empresa. ?bolsa=1 trae solo las empresas que publican en la bolsa y
// tienen vacantes abiertas (el backend filtra); sin el parámetro, /empresas/activas responde como siempre.
// 23/11/2026 (rediseño): la tira es secundaria; si falla o no hay empresas, no se muestra (antes pintaba el error crudo).
export const RUTA_EMPRESAS_BOLSA = "/empresas/activas?bolsa=1&limit=4&page=1";

export default function EmpresasContratando({ empresas, cargando, idEmpresa, onElegir }) {
  if (!cargando && !empresas?.length) return null;
  return (
    <section className="bt-empresas" aria-labelledby="bt-empresas-titulo">
      <div className="wrap bt-empresas-in">
        <div>
          <h2 id="bt-empresas-titulo">Empresas que están contratando</h2>
          <p>Elige una para ver solo sus vacantes.</p>
        </div>
        <ul className="bt-logos" aria-busy={cargando || undefined}>
          {cargando
            ? [0, 1, 2, 3].map((i) => (
                <li key={i} className="bt-logo-esq" aria-hidden="true"><i /></li>
              ))
            : empresas.map((e) => {
                const activa = String(idEmpresa) === String(e.id_empresa);
                const nombre = e.nombre_empresa || "Empresa";
                return (
                  <li key={e.id_empresa}>
                    <button
                      type="button"
                      className="bt-logo"
                      aria-pressed={activa}
                      aria-label={activa ? `Quitar filtro: ${nombre}` : `Ver vacantes de ${nombre}`}
                      onClick={() => onElegir(activa ? "" : String(e.id_empresa))}
                    >
                      {e.url_imagen ? (
                        <img src={e.url_imagen} alt="" width={112} height={44} loading="lazy" decoding="async" />
                      ) : (
                        <i className="ini" aria-hidden="true">{nombre.trim().charAt(0).toUpperCase()}</i>
                      )}
                      <span>{nombre}</span>
                    </button>
                  </li>
                );
              })}
        </ul>
      </div>
    </section>
  );
}
