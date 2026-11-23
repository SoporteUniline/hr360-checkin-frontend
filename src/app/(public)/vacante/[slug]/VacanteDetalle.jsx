"use client";
/* eslint-disable @next/next/no-img-element -- logo de la empresa (S3) con tamaño fijo; next/image exige dominios */
import React, { useState } from "react";
import Link from "next/link";
import ApplicationForm from "./ApplicationForm";
import { formatearFecha } from "@/lib/utils";
// HTML de la vacante saneado antes de insertarlo (INC-REC-003).
import { sanearHtml } from "@/lib/htmlSeguro.mjs";
import useSWR, { mutate } from "swr";
import { fetcher, fetcherWithToken, swr_config } from "@/lib/fetcher";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SocialShare from "./SocialShare";
import { Briefcase, Building2, CheckCircle2, ChevronLeft, Clock, Eye, MapPin, RotateCw, SearchX } from "lucide-react";
import UserInfoModal from "./UserInfoModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axios from "axios";
import Cookies from "js-cookie";
import { useSnackbar } from "notistack";
import PreguntasVacante, { faltantes } from "./ApplicationForm/PreguntasVacante";
import { respuestasParaEnviar } from "@/lib/reclutamiento/respuestas.mjs";
import { formatoSueldo, haceCuanto, textoPlano, ubicacionVacante } from "@/lib/bolsaTrabajo.mjs";

// Página pública de una vacante (rediseño 23/11/2026, estilo ADAMIA). La lógica de postulación no cambia: sin sesión,
// formulario con verificación del teléfono (OTP) y preguntas propias; con sesión de candidato, confirmación con las
// mismas preguntas y POST /postulaciones/postulacion-auth.

const tieneTexto = (html) => textoPlano(html).length > 0;

function Bloque({ titulo, html }) {
  if (!tieneTexto(html)) return null;
  return (
    <section className="vc-bloque">
      <h2>{titulo}</h2>
      <div className="vc-prosa" dangerouslySetInnerHTML={{ __html: sanearHtml(html) }} />
    </section>
  );
}

function Requisito({ titulo, html }) {
  if (!tieneTexto(html)) return null;
  return (
    <div>
      <dt>{titulo}</dt>
      <dd className="vc-prosa" dangerouslySetInnerHTML={{ __html: sanearHtml(html) }} />
    </div>
  );
}

function Cargando() {
  return (
    <div className="lh vc" aria-busy="true" aria-label="Cargando vacante">
      <section className="vc-cab">
        <div className="wrap vc-cab-in">
          <i className="vc-esq" style={{ width: 160, height: 18 }} />
          <div className="vc-cab-grid">
            <i className="vc-esq vc-logo" />
            <div style={{ display: "grid", gap: 12 }}>
              <i className="vc-esq" style={{ width: "min(420px, 80%)", height: 36 }} />
              <i className="vc-esq" style={{ width: 200, height: 18 }} />
            </div>
          </div>
        </div>
      </section>
      <div className="wrap vc-grid">
        <div className="vc-cuerpo" style={{ display: "grid", gap: 12 }}>
          {[90, 100, 70, 95, 60].map((w, i) => <i key={i} className="vc-esq vc-esq-claro" style={{ width: `${w}%`, height: 16 }} />)}
        </div>
        <i className="vc-esq vc-esq-claro" style={{ height: 320, borderRadius: 24 }} />
      </div>
    </div>
  );
}

function SinVacante({ noExiste, onReintentar }) {
  return (
    <div className="lh vc">
      <div className="wrap vc-sin">
        <div className="bt-estado-vc" role={noExiste ? "status" : "alert"}>
          <span className="ico" aria-hidden="true">{noExiste ? <SearchX /> : <RotateCw />}</span>
          <h1>{noExiste ? "Esta vacante ya no está disponible" : "No pudimos cargar la vacante"}</h1>
          <p>{noExiste ? "Puede que la empresa la haya cerrado o que el enlace esté incompleto. Hay más vacantes en la bolsa de trabajo." : "Revisa tu conexión a internet e inténtalo de nuevo."}</p>
          <div className="ctas">
            {noExiste ? null : <button type="button" className="btn btn-primary" onClick={onReintentar}>Reintentar</button>}
            <Link className={noExiste ? "btn btn-primary" : "btn btn-line"} href="/bolsa-de-trabajo">Ver vacantes</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VacanteDetalle() {
  const [openDialog, setOpenDialog] = useState(false);
  const [openSheet, setOpenSheet] = useState(false); // Para controlar el Sheet manualmente
  const [enviada, setEnviada] = useState(false);

  const [showModal, setShowModal] = useState(false);
  // (03/12/2026) Preguntas propias de la vacante también al postularse con sesión.
  const [respuestas, setRespuestas] = useState({});
  const [sinResponder, setSinResponder] = useState([]);
  const { dataUser, isLoggedIn } = useAuth();
  const params = useParams();
  const token = Cookies.get("token");
  const { enqueueSnackbar } = useSnackbar();

  const { data, error, isLoading } = useSWR(
    `/vacantes/slug/${params.slug}`,
    fetcher,
    swr_config
  );

  const { data: disponibilidad } = useSWR(
    data?.id_vacante ? `/vacantes/check-positions/${data.id_vacante}` : null,
    fetcher,
    swr_config
  );

  const sinDisponibilidad = disponibilidad && !disponibilidad.available;

  // Fetch de postulaciones si ya se tiene el ID
  const {
    data: postulaciones,
    isLoading: loadingPostulaciones,
    error: errorPostulaciones,
  } = useSWR(
    dataUser?.id_usuario ? `/postulaciones/by-correo/${dataUser.correo}` : null,
    fetcherWithToken,
    swr_config
  );

  const yaPostulado = postulaciones?.data?.some(
    (post) => post.slug === params.slug
  );

  const {
    data: userDetail,
    isLoading: loadingUser,
    error: errorUser,
  } = useSWR(
    dataUser?.id_usuario && dataUser?.tipo_usuario === "User"
      ? `/users/user/${dataUser.id_usuario}`
      : null,
    fetcherWithToken,
    swr_config
  );

  const handlePostularme = async () => {
    const headers = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/postulaciones/postulacion-auth`,
        {
          id_vacante: data.id_vacante,
          id_usuario: dataUser.id_usuario,
          respuestas: respuestasParaEnviar(data.preguntas_formulario ?? [], respuestas),
        },
        headers
      );

      if (
        response.status === 200 ||
        response.status === 201 ||
        response.data?.success
      ) {
        mutate(`/postulaciones/by-correo/${dataUser.correo}`);
        mutate(`/vacantes/slug/${params.slug}`);
        setOpenDialog(false);
        enqueueSnackbar("¡Te has postulado con éxito!", {
          variant: "success",
        });
      } else {
        // Respuesta recibida pero con algo raro
        console.warn("Respuesta no satisfactoria:", response.data);
        enqueueSnackbar("Error al postularte...", {
          variant: "warning",
        });
      }
    } catch (err) {
      console.error("Error al postularte:", err);
      enqueueSnackbar(err?.response?.data?.error || "¡Error al postularte!", {
        variant: "error",
      });
    }
  };

  if (isLoading || loadingPostulaciones || loadingUser) return <Cargando />;

  if (error || errorPostulaciones || errorUser) {
    return (
      <SinVacante
        noExiste={error?.response?.status === 404}
        onReintentar={() => {
          mutate(`/vacantes/slug/${params.slug}`);
          if (dataUser?.correo) mutate(`/postulaciones/by-correo/${dataUser.correo}`);
        }}
      />
    );
  }
  if (!data) return <Cargando />;

  const sueldo = formatoSueldo(data.salario);
  const lugar = ubicacionVacante(data);
  const publicada = haceCuanto(data.fecha_publicacion);
  const puedePostular = dataUser?.tipo_usuario === "User" || !isLoggedIn;
  const datos = [
    ["Tipo de contratación", data.tipo_contratacion],
    ["Contrato", data.tipo_contrato],
    ["Modalidad", data.modalidad],
    ["Horario", data.horario],
    ["Lugar de trabajo", data.direccion || lugar],
    ["Publicada", data.fecha_publicacion ? formatearFecha(data.fecha_publicacion) : ""],
  ].filter(([, v]) => v && String(v).trim());
  const hayRequisitos = [data.escolaridad, data.experiencia, data.habilidades, data.idiomas].some(tieneTexto);

  let accion = null;
  let conBarra = false; // en celular, «Postularme ahora» queda fijo abajo
  if (puedePostular) {
    if (yaPostulado || enviada) {
      accion = (
        <p className="vc-aviso ok" role="status">
          <CheckCircle2 aria-hidden="true" />
          <span>{enviada ? "Enviamos tu postulación. La empresa la revisará y te contactará por teléfono o correo." : "Ya te postulaste a esta vacante."}</span>
        </p>
      );
    } else if (sinDisponibilidad) {
      accion = <p className="vc-aviso" role="status">Ya no hay lugares disponibles para esta vacante.</p>;
    } else if (data.recibe_postulaciones === false) {
      accion = <p className="vc-aviso" role="status">Esta vacante ya cerró su periodo de postulaciones.</p>;
    } else {
      conBarra = true;
      accion = (
        <div className="vc-postular">
          <ApplicationForm
            selectedJob={data}
            open={openSheet}
            setOpen={setOpenSheet}
            isLoggedIn={isLoggedIn}
            setOpenDialog={setOpenDialog}
            onEnviada={() => setEnviada(true)}
          />
          {isLoggedIn && dataUser?.tipo_usuario === "User" && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="vc-icono"
              aria-label="Ver la información de tu perfil"
              title="Ver la información de tu perfil"
            >
              <Eye aria-hidden="true" />
            </button>
          )}
        </div>
      );
    }
  }

  return (
    <div className={`lh vc${conBarra ? " con-barra" : ""}`}>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Quieres postularte a {data.titulo}?</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60dvh] overflow-y-auto">
            <PreguntasVacante preguntas={data?.preguntas_formulario ?? []} valores={respuestas} onCambiar={setRespuestas} errores={sinResponder} />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => setOpenDialog(false)}>
              No
            </Button>
            <Button
              onClick={() => {
                const pendientes = faltantes(data?.preguntas_formulario ?? [], respuestas);
                setSinResponder(pendientes);
                if (pendientes.length) return;
                setOpenDialog(false);
                handlePostularme();
              }}
              className="min-h-11 bg-[#2c56e8] text-white hover:bg-[#1f44c8]"
            >
              Sí, postularme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="vc-cab">
        <div className="wrap vc-cab-in">
          <Link className="vc-volver" href="/bolsa-de-trabajo"><ChevronLeft aria-hidden="true" /> Todas las vacantes</Link>
          <div className="vc-cab-grid">
            {data.url_imagen ? (
              <img className="vc-logo" src={data.url_imagen} alt={data.nombre_empresa ? `Logo de ${data.nombre_empresa}` : ""} width={80} height={80} />
            ) : (
              <span className="vc-logo ini" aria-hidden="true">{(data.nombre_empresa || data.titulo || "?").trim().charAt(0).toUpperCase()}</span>
            )}
            <div className="vc-cab-txt">
              <h1>{data.titulo}</h1>
              {data.nombre_empresa ? <p className="vc-emp">{data.nombre_empresa}</p> : null}
              <ul className="vc-chips" aria-label="Resumen de la vacante">
                {lugar ? <li><MapPin aria-hidden="true" />{lugar}</li> : null}
                {data.modalidad ? <li><Building2 aria-hidden="true" />{data.modalidad}</li> : null}
                {data.tipo_contratacion ? <li><Briefcase aria-hidden="true" />{data.tipo_contratacion}</li> : null}
                {publicada ? <li><Clock aria-hidden="true" />{publicada}</li> : null}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap vc-grid">
        <aside className="vc-lado" aria-label="Datos y postulación">
          <div className="vc-tarjeta">
            <div className="vc-sueldo">
              <span>Sueldo</span>
              <b>{sueldo || "No publicado"}</b>
            </div>
            {datos.length ? (
              <dl className="vc-datos">
                {datos.map(([t, v]) => (
                  <div key={t}><dt>{t}</dt><dd>{v}</dd></div>
                ))}
              </dl>
            ) : null}
            {accion}
            <SocialShare titulo={data.nombre_empresa ? `${data.titulo} en ${data.nombre_empresa}` : data.titulo} />
          </div>
        </aside>

        <article className="vc-cuerpo">
          <Bloque titulo="Descripción del puesto" html={data.descripcion} />
          <Bloque titulo="Actividades y responsabilidades" html={data.responsabilidades} />
          {hayRequisitos ? (
            <section className="vc-bloque">
              <h2>Lo que buscamos</h2>
              <dl className="vc-req">
                <Requisito titulo="Escolaridad" html={data.escolaridad} />
                <Requisito titulo="Experiencia" html={data.experiencia} />
                <Requisito titulo="Habilidades" html={data.habilidades} />
                <Requisito titulo="Idiomas" html={data.idiomas} />
              </dl>
            </section>
          ) : null}
        </article>
      </div>

      {showModal && (
        <UserInfoModal
          user={userDetail}
          open={showModal}
          onOpenChange={setShowModal}
        />
      )}
    </div>
  );
}
