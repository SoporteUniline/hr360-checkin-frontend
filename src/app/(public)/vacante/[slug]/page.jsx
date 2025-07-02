"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { twMerge } from "tailwind-merge";
import ApplicationForm from "./ApplicationForm";
import ErrorPage from "@/components/ErrorPage";
import { formatearFecha } from "@/lib/utils";
import useSWR, { mutate } from "swr";
import { fetcher, fetcherWithToken, swr_config } from "@/lib/fetcher";
import EllipsisLoader from "@/components/loading/EllipsisLoader";
import { useParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SocialShare from "./SocialShare";
import { Eye } from "lucide-react";
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

export default function DetalleVacante() {
  const [openDialog, setOpenDialog] = useState(false);
  const [openSheet, setOpenSheet] = useState(false); // Para controlar el Sheet manualmente

  const [showModal, setShowModal] = useState(false);
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
      enqueueSnackbar("¡Error al postularte!", {
        variant: "error",
      });
    }
  };

  if (isLoading || loadingPostulaciones || loadingUser)
    return <EllipsisLoader />;

  if (error || errorPostulaciones || errorUser) {
    return (
      <section className="p-5 pt-20 md:px-10 lg:px-30 xl:px-40">
        <ErrorPage
          message={error?.response?.data?.message}
          title="Sin resultados"
        />
      </section>
    );
  }

  return (
    <>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro que deseas postularte?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              No
            </Button>
            <Button
              onClick={() => {
                setOpenDialog(false);
                handlePostularme();
              }}
              className="bg-slate-700 text-white hover:bg-slate-800"
            >
              Sí
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section
        id="detalle-vacante"
        className="detalle-container px-5 py-10 sm:px-20 md:px-40 lg:px-50 bg-white rounded-md shadow-md mt-10"
      >
        <div className="inline-flex items-center gap-5">
          <div className="my-4 relative w-30 h-20">
            <Image
              alt={data.titulo || "jobImage"}
              src={data.url_imagen || "/assets/no-image.png"}
              fill
              className="object-cover rounded-md"
            />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-700">
              {data.titulo}
            </div>
            <div className="text-md font-bold text-slate-500">
              {`${data.nombre_empresa} • ${formatearFecha(
                data.fecha_publicacion
              )}`}
            </div>
            <div className="text-gray-500 mb-4">{data.direccion}</div>
          </div>
        </div>

        <div className="text-sm text-gray-700 mb-3">
          {data.salario} • {data.horario}
        </div>

        {(dataUser?.tipo_usuario === "User" || !isLoggedIn) && (
          <>
            {yaPostulado ? (
              <p className="mt-3 text-sm text-green-600 font-medium">
                Ya te has postulado a esta vacante.
              </p>
            ) : sinDisponibilidad ? (
              <p className="mt-3 text-sm text-red-600 font-medium">
                Ya no hay disponibilidad para esta vacante.
              </p>
            ) : (
              <div className="flex items-center gap-3 mt-5">
                <div className="flex-grow">
                  <ApplicationForm
                    selectedJob={data}
                    open={openSheet}
                    setOpen={setOpenSheet}
                    isLoggedIn={isLoggedIn}
                    setOpenDialog={setOpenDialog}
                  />
                </div>
                {isLoggedIn && dataUser?.tipo_usuario === "User" && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-gray-600 hover:text-gray-800 p-2"
                    title="Ver información del usuario"
                  >
                    <Eye />
                  </button>
                )}
              </div>
            )}

            {showModal && (
              <UserInfoModal
                user={userDetail}
                open={showModal}
                onOpenChange={setShowModal}
              />
            )}
          </>
        )}

        <SocialShare />

        <div>
          <h2 className="text-primary text-xl font-bold mt-5 mb-2">
            Información del empleo
          </h2>

          <hr className="mb-4" />

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className={twMerge(
                "p-0 gap-0 shadow-none border-none bg-gray-100 "
              )}
            >
              <CardContent className={twMerge("!px-4 !py-2 space-y-1")}>
                <strong>💵 Sueldo:</strong>
                <p className="text-sm leading-tight m-0">{data.salario}</p>
              </CardContent>
            </Card>

            <Card
              className={twMerge(
                "p-0 gap-0 shadow-none border-none bg-gray-100 "
              )}
            >
              <CardContent className={twMerge("!px-4 !py-2 space-y-1")}>
                <strong>📄 Tipo de Contratación:</strong>
                <p className="text-sm leading-tight m-0">
                  {data.tipo_contrato}
                </p>
              </CardContent>
            </Card>

            <Card
              className={twMerge(
                "p-0 gap-0 shadow-none border-none bg-gray-100 "
              )}
            >
              <CardContent className={twMerge("!px-4 !py-2 space-y-1")}>
                <strong>🏢 Modalidad:</strong> <p>{data.modalidad}</p>
              </CardContent>
            </Card>

            <Card
              className={twMerge(
                "p-0 gap-0 shadow-none border-none bg-gray-100 "
              )}
            >
              <CardContent className={twMerge("!px-4 !py-2 space-y-1")}>
                <strong>🕑 Jornada Laboral:</strong> <p>{data.horario}</p>
              </CardContent>
            </Card>

            <Card
              className={twMerge(
                "p-0 gap-0 shadow-none border-none bg-gray-100 "
              )}
            >
              <CardContent className={twMerge("!px-4 !py-2 space-y-1")}>
                <strong>🎓 Escolaridad Requerida:</strong>{" "}
                <div
                  className="prose prose-sm prose-slate max-w-none [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: data.escolaridad }}
                />
              </CardContent>
            </Card>
            <Card
              className={twMerge(
                "p-0 gap-0 shadow-none border-none bg-gray-100 "
              )}
            >
              <CardContent className={twMerge("!px-4 !py-2 space-y-1")}>
                <strong>📈 Experiencia Requerida:</strong>
                <div
                  className="prose prose-sm prose-slate max-w-none [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: data.experiencia }}
                />
              </CardContent>
            </Card>
            <Card
              className={twMerge(
                "p-0 gap-0 shadow-none border-none bg-gray-100 "
              )}
            >
              <CardContent className={twMerge("!px-4 !py-2 space-y-1")}>
                <strong>🧠 Habilidades:</strong>
                <div
                  className="prose prose-sm prose-slate max-w-none [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: data.habilidades }}
                />
              </CardContent>
            </Card>

            <Card
              className={twMerge(
                "p-0 gap-0 shadow-none border-none bg-gray-100 "
              )}
            >
              <CardContent className={twMerge("!px-4 !py-2 space-y-1")}>
                <strong>🌐 Idiomas:</strong> <p>{data.idiomas}</p>
              </CardContent>
            </Card>
          </section>
          <h2 className="text-primary text-xl font-bold mt-5 mb-2">
            Descripción General
          </h2>

          <hr className="mb-2" />
          <section>
            <div
              className="prose prose-sm prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: data.descripcion }}
            />
          </section>

          <h2 className="text-primary text-xl font-bold mt-5 mb-2">
            Actividades y Responsabilidades
          </h2>

          <hr className="mb-2" />
          <section>
            <div
              className="prose prose-sm prose-slate max-w-none [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: data.responsabilidades }}
            />
          </section>

          <h2 className="text-primary text-xl font-bold mt-5 mb-2">
            Publicación
          </h2>

          <hr className="mb-2" />
          <section>
            <p>{formatearFecha(data.fecha_publicacion)}</p>
          </section>
        </div>
      </section>
    </>
  );
}
