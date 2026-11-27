"use client";
// Página pública de una vacante (bolsa v2, 27/11/2026): la ficha grande con «Regresar» arriba y, en celular, la acción
// principal fija abajo («Postularme por WhatsApp» si la empresa tiene el asistente; si no, «Postularme»).
// La postulación (OTP, preguntas, aviso de privacidad, sesión de candidato) vive en Postular.jsx.
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ChevronLeft, RotateCw, SearchX } from "lucide-react";
import { fetcher, swr_config } from "@/lib/fetcher";
import FichaVacante from "./FichaVacante";

function Regresar() {
  // Si llegó desde la bolsa, «Regresar» vuelve a su búsqueda (misma pestaña); si no, abre la bolsa.
  const volver = (e) => {
    try {
      const desde = document.referrer ? new URL(document.referrer) : null;
      if (desde && desde.origin === window.location.origin && desde.pathname === "/bolsa-de-trabajo" && window.history.length > 1) {
        e.preventDefault();
        window.history.back();
      }
    } catch {
      /* referrer raro: sigue el enlace */
    }
  };
  return (
    <Link className="bt2-regresar" href="/bolsa-de-trabajo" onClick={volver}>
      <ChevronLeft aria-hidden="true" />Regresar a las vacantes
    </Link>
  );
}

function Cargando() {
  return (
    <div className="bt2 bt2-pagina-vacante" aria-busy="true" aria-label="Cargando vacante">
      <div className="bt2-envoltura">
        <div className="bt2-ficha pagina">
          <i className="bt2-esq-linea" style={{ width: "60%", height: 34 }} />
          <i className="bt2-esq-linea" style={{ width: "40%", height: 20 }} />
          <i className="bt2-esq-linea" style={{ width: "100%", height: 180 }} />
        </div>
      </div>
    </div>
  );
}

function SinVacante({ noExiste, onReintentar }) {
  return (
    <div className="bt2 bt2-pagina-vacante">
      <div className="bt2-envoltura">
        <div className="bt2-estado" role={noExiste ? "status" : "alert"}>
          <span className="ico" aria-hidden="true">{noExiste ? <SearchX /> : <RotateCw />}</span>
          <h1>{noExiste ? "Esta vacante ya no está disponible" : "No pudimos cargar la vacante"}</h1>
          <p>{noExiste ? "Puede que la empresa la haya cerrado o que el enlace esté incompleto. Hay más vacantes en la bolsa de trabajo." : "Revisa tu conexión a internet e inténtalo de nuevo."}</p>
          <div className="bt2-fila-links">
            {noExiste ? null : <button type="button" className="bt2-btn principal" onClick={onReintentar}>Reintentar</button>}
            <Link className={noExiste ? "bt2-btn principal" : "bt2-btn secundario"} href="/bolsa-de-trabajo">Ver vacantes</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VacanteDetalle() {
  const params = useParams();
  const clave = `/vacantes/slug/${params.slug}`;
  const { data, error, isLoading, mutate: recargar } = useSWR(clave, fetcher, swr_config);

  if (isLoading) return <Cargando />;
  if (error) return <SinVacante noExiste={error?.response?.status === 404} onReintentar={() => recargar()} />;
  if (!data) return <Cargando />;

  return (
    <div className="bt2 bt2-pagina-vacante con-barra">
      <div className="bt2-envoltura">
        <Regresar />
        <FichaVacante v={data} nivel="h1" pagina />
      </div>
    </div>
  );
}
