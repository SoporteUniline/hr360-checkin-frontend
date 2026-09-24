"use client";

import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Check, Eye, Mail, Phone } from "lucide-react";
import axios from "@/lib/axios";
import { enqueueSnackbar } from "notistack";
import Cookies from "js-cookie";
import NuevaEmpresa from "./NuevaEmpresa";
import RechazarEmpresa from "./RechazarEmpresa";
import { fetcherWithToken } from "@/lib/fetcher";
import {
  fetchCompanySummary,
  numberOrNull,
  money,
  getValidity,
} from "./empresaResumen";
import styles from "./empresas.module.css";

const status = { Activo: true, Inactivo: false };
const summaryOptions = {
  shouldRetryOnError: false,
  revalidateOnMount: true,
  dedupingInterval: 15000,
  focusThrottleInterval: 60000,
};

export default function TablaEmpresas({ data, setSelected, limit, page }) {
  return (
    <Table className={styles.table} aria-label="Empresas, personal y cobranza">
      <TableHeader>
        <TableRow>
          <TableHead>Empresa</TableHead>
          <TableHead>Empleados activos</TableHead>
          <TableHead>Mensualidad</TableHead>
          <TableHead>Saldo pendiente</TableHead>
          <TableHead>Vigencia registrada</TableHead>
          <TableHead>Acceso</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!data?.length && (
          <TableRow>
            <TableCell colSpan={7}>
              <div className={styles.empty}>
                No hay empresas que coincidan con los filtros en esta página.
              </div>
            </TableCell>
          </TableRow>
        )}
        {data?.map((item) => (
          <EmpresaRow
            key={item.id_empresa}
            item={item}
            setSelected={setSelected}
            limit={limit}
            page={page}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function PendingValue({ loading, error, retry, missing = "Sin dato" }) {
  if (loading)
    return (
      <span
        className={styles.skeleton}
        role="status"
        aria-label="Cargando dato"
      />
    );
  if (error)
    return (
      <button className={styles.retry} onClick={retry}>
        Reintentar consulta
      </button>
    );
  return <span className={styles.missing}>{missing}</span>;
}

function EmpresaRow({ item, setSelected, limit, page }) {
  const subscription = useSWR(
    `/empresas/${item.id_empresa}/suscripcion`,
    fetchCompanySummary,
    summaryOptions
  );
  const financial = useSWR(
    `/empresas/${item.id_empresa}/resumen-financiero`,
    fetchCompanySummary,
    summaryOptions
  );
  const sub = subscription.data?.data;
  const balanceData = financial.data?.data;
  const employees = numberOrNull(sub?.empleados_activos);
  const monthly = numberOrNull(sub?.mensualidad_actual);
  const balance = numberOrNull(balanceData?.saldo_pendiente);
  const periods = numberOrNull(balanceData?.periodos_con_saldo);
  const validity = getValidity(sub);
  const subPending = (
    <PendingValue
      loading={subscription.isLoading}
      error={subscription.error}
      retry={() => subscription.mutate().catch(() => {})}
    />
  );
  const phone = String(item.celular || "").replace(/[^\d+]/g, "");
  const balanceLabel =
    balanceData?.estatus_financiero ||
    (balance === 0
      ? "Sin saldo pendiente"
      : balance > 0
      ? "Pendiente de pago"
      : "Saldo a favor");
  return (
    <TableRow>
      <TableCell className={styles.company}>
        <button
          className={styles.companyName}
          onClick={() => setSelected(item, "datos")}
        >
          {item.nombre_empresa}
        </button>
        <div className={styles.contact}>
          <span className={styles.owner}>
            {item.nombre_duenio || "Sin dueño registrado"}
          </span>
          {phone && (
            <a
              href={`tel:${phone}`}
              title={item.celular}
              aria-label={`Llamar a ${item.nombre_empresa}: ${item.celular}`}
            >
              <Phone size={13} />
            </a>
          )}
          {item.correo_empresa && (
            <a
              href={`mailto:${item.correo_empresa}`}
              title={item.correo_empresa}
              aria-label={`Correo de ${item.nombre_empresa}: ${item.correo_empresa}`}
            >
              <Mail size={13} />
            </a>
          )}
        </div>
      </TableCell>
      <TableCell>
        {subscription.error || employees === null ? (
          subPending
        ) : (
          <>
            <span className={styles.number}>
              {employees.toLocaleString("es-MX")}
            </span>
          </>
        )}
      </TableCell>
      <TableCell>
        {subscription.error || monthly === null ? (
          subPending
        ) : (
          <span className={styles.number}>{money(monthly)}</span>
        )}
      </TableCell>
      <TableCell>
        {financial.error || balance === null ? (
          <PendingValue
            loading={financial.isLoading}
            error={financial.error}
            retry={() => financial.mutate().catch(() => {})}
          />
        ) : (
          <>
            <button
              className={`${styles.balanceButton} ${
                balance > 0 ? styles.debt : styles.clear
              }`}
              aria-label={`Ver saldo de ${item.nombre_empresa}: ${money(
                balance
              )}`}
              onClick={() => setSelected(item, "suscripcion")}
            >
              {money(balance)}
            </button>
            <span className={styles.secondary} title={balanceLabel}>
              {balance > 0 && periods !== null && periods > 0
                ? `${periods} ${
                    periods === 1 ? "periodo pendiente" : "periodos pendientes"
                  }`
                : balanceLabel}
            </span>
          </>
        )}
      </TableCell>
      <TableCell>
        {subscription.isLoading || subscription.error ? (
          subPending
        ) : !sub ? (
          <span className={styles.missing}>Sin suscripción</span>
        ) : validity ? (
          <>
            <div className={styles.date}>{validity.date}</div>
            <span className={styles[validity.tone]}>{validity.label}</span>
          </>
        ) : (
          <span className={styles.missing}>Sin fecha registrada</span>
        )}
      </TableCell>
      <TableCell>
        <div
          className={`${styles.access} ${
            item.estado === "Activo"
              ? styles.active
              : item.estado === "Suspendido"
              ? styles.suspended
              : ""
          }`}
        >
          {item.estado !== "Nuevo" && item.estado !== "Rechazado" && (
            <span>{item.estado || "Sin estado"}</span>
          )}
          {item.estado === "Rechazado" ? (
            <EstatusRechazado item={item} />
          ) : (
            <EstatusSwitch item={item} limit={limit} page={page} />
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="icon"
            title="Ver suscripción y saldo"
            aria-label={`Ver suscripción de ${item.nombre_empresa}`}
            onClick={() => setSelected(item, "suscripcion")}
          >
            <Eye size={17} className="text-blue-600" />
          </Button>
          {item.estado !== "Rechazado" && (
            <NuevaEmpresa editar values={item} limit={limit} page={page} />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

const EstatusSwitch = ({ item, limit, page }) => {
  const isActive = status[item.estado];
  const isNew = item.estado === "Nuevo";
  const [loading, setLoading] = useState(false);
  const token = Cookies.get("token");

  const handleChangeStatus = async () => {
    try {
      setLoading(true);
      await axios.put(
        `/empresas/cambiar-estado/${item.id_empresa}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await mutate(`/empresas?page=${page}&limit=${limit}`, () =>
        fetcherWithToken(`/empresas?page=${page}&limit=${limit}`)
      );
      setLoading(false);
      enqueueSnackbar("Se cambió el estado correctamente", {
        variant: "success",
      });
    } catch (error) {
      setLoading(false);
      console.error("Error al agregar:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.error || "Error al cambiar estado";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  return isNew ? (
    <div className="flex justify-center gap-1">
      <EstatusAceptar item={item} limit={limit} page={page} />
      <RechazarEmpresa item={item} limit={limit} page={page} />
    </div>
  ) : (
    <Switch
      aria-label={`Cambiar acceso de ${item.nombre_empresa}`}
      disabled={loading}
      checked={isActive}
      onCheckedChange={handleChangeStatus}
    />
  );
};
const EstatusAceptar = ({ item, limit, page }) => {
  const [loading, setLoading] = useState(false);
  const token = Cookies.get("token");

  const handleActivate = async () => {
    try {
      setLoading(true);
      await axios.put(
        `/empresas/activar-nueva/${item.id_empresa}`,
        {
          tipo_contratacion: "Normal",
          meses_contratados: 1,
          empleados: Number(prompt("Empleados de referencia", "0") || 0),
          precio_base_mensual: Number(prompt("Precio base mensual", "0") || 0),
          empleados_incluidos: Number(prompt("Empleados incluidos", "0") || 0),
          precio_empleado_extra: Number(
            prompt("Precio por empleado extra", "60") || 60
          ),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await mutate(`/empresas?page=${page}&limit=${limit}`, () =>
        fetcherWithToken(`/empresas?page=${page}&limit=${limit}`)
      );
      setLoading(false);
      enqueueSnackbar("Se activó correctamente", {
        variant: "success",
      });
    } catch (error) {
      setLoading(false);
      console.error("Error al agregar:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.error || "Error al cambiar estado";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  return (
    <Button
      className="h-7 bg-blue-400"
      onClick={handleActivate}
      aria-label={`Aceptar empresa ${item.nombre_empresa}`}
      startIcon={<Check />}
      disabled={loading}
    />
  );
};
const EstatusRechazado = ({ item, limit, page }) => {
  return (
    <div>
      <p className="text-red-500 font-semibold text-sm">{item.estado}</p>
      <p
        title={item.motivo_rechazo}
        className="text-gray-500 text-sm w-[170px] overflow-hidden text-ellipsis whitespace-nowrap"
      >
        {item.motivo_rechazo}
      </p>
    </div>
  );
};
