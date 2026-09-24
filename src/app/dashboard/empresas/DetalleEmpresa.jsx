"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatearFecha } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  UserRound,
  MapPin,
  Globe,
  CreditCard,
  ReceiptText,
  Wallet,
  CalendarDays,
  Users,
  FileText,
} from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";
import useSWR from "swr";
import FacturasEmpresaTab from "./FacturasEmpresaTab";
import SuscripcionEmpresaTab from "./SuscripcionEmpresaTab";
import PagosEmpresaTab from "./PagosEmpresaTab";
import PagoAdelantadoEmpresaTab from "./PagoAdelantadoEmpresaTab";
import NuevaEmpresa from "./NuevaEmpresa";
import { fetchCompanySummary, getValidity, money } from "./empresaResumen";
import styles from "./detalleEmpresa.module.css";

const sections = [
  { value: "datos", label: "Información", icon: Building2 },
  { value: "suscripcion", label: "Suscripción", icon: CreditCard },
  { value: "facturas", label: "Facturas", icon: ReceiptText },
  { value: "pagos", label: "Pagos", icon: Wallet },
  {
    value: "pagoAdelantado",
    label: "Anticipos y cobertura",
    icon: CalendarDays,
  },
];

export default function DetalleEmpresa({
  item,
  setSelected,
  initialTab = "datos",
}) {
  const [tab, setTab] = useState(initialTab);
  return (
    <section
      className={styles.detailShell}
      aria-label={`Detalle de ${item.nombre_empresa}`}
    >
      <button
        className={styles.back}
        aria-label="Volver a empresas"
        onClick={() => setSelected(null)}
      >
        <ArrowLeft size={16} />
        Todas las empresas
      </button>
      <header className={styles.hero}>
        <div className={styles.identity}>
          <div className={styles.logo}>
            {item.url_imagen ? (
              <Image
                alt={`Logo de ${item.nombre_empresa}`}
                src={item.url_imagen}
                fill
                sizes="72px"
                className="object-contain"
              />
            ) : (
              <Building2 size={30} />
            )}
          </div>
          <div className={styles.heroText}>
            <span className={styles.eyebrow}>Ficha de empresa</span>
            <h1>{item.nombre_empresa}</h1>
            <div className={styles.heroMeta}>
              <span className={styles.status} data-status={item.estado}>
                {item.estado || "Sin estado"}
              </span>
              <span>{item.giro || "Giro sin registrar"}</span>
              <span>
                Alta:{" "}
                {item.createdAt ? formatearFecha(item.createdAt) : "Sin fecha"}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.heroActions}>
          <NuevaEmpresa editar values={item} triggerLabel="Editar empresa" />
          <Button onClick={() => setTab("facturas")}>
            <FileText size={16} />
            Ver facturas
          </Button>
        </div>
      </header>
      <Tabs value={tab} onValueChange={setTab} className={styles.detailTabs}>
        <div className={styles.tabScroll}>
          <TabsList
            className={styles.tabs}
            aria-label="Secciones de la empresa"
          >
            {sections.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value}>
                <Icon size={17} />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="datos">
          <CompanySnapshot companyId={item.id_empresa} />
          <div className={styles.infoLayout}>
            <section className={styles.panel}>
              <SectionTitle
                icon={UserRound}
                title="Contacto y responsable"
                description="Los datos principales para comunicarte con la empresa."
              />
              <dl className={styles.infoGrid}>
                <Info label="Dueño / responsable" value={item.nombre_duenio} />
                <Info label="Teléfono" value={item.celular} />
                <Info
                  label="Correo electrónico"
                  value={item.correo_empresa}
                  wide
                />
              </dl>
            </section>
            <section className={styles.panel}>
              <SectionTitle
                icon={MapPin}
                title="Datos de la empresa"
                description="Actividad y ubicación registradas."
              />
              <dl className={styles.infoGrid}>
                <Info label="Giro" value={item.giro} />
                <Info label="Estado de acceso" value={item.estado} />
                <Info label="Dirección" value={item.direccion} wide />
              </dl>
            </section>
            <section className={`${styles.panel} ${styles.widePanel}`}>
              <SectionTitle
                icon={Globe}
                title="Presencia digital"
                description="Redes sociales y sitio web de la empresa."
              />
              <dl className={`${styles.infoGrid} ${styles.threeColumns}`}>
                <Info label="Facebook" value={item.facebook} />
                <Info
                  label="Instagram"
                  value={item.instagram || item.instagran}
                />
                <Info label="Página web" value={item.pagina_web} />
              </dl>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="suscripcion">
          <SuscripcionEmpresaTab empresa={item} />
        </TabsContent>
        <TabsContent value="facturas">
          <FacturasEmpresaTab empresa={item} />
        </TabsContent>
        <TabsContent value="pagos">
          <PagosEmpresaTab empresa={item} />
        </TabsContent>
        <TabsContent value="pagoAdelantado">
          <PagoAdelantadoEmpresaTab empresa={item} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function CompanySnapshot({ companyId }) {
  const subscription = useSWR(
    `/empresas/${companyId}/suscripcion`,
    fetchCompanySummary
  );
  const financial = useSWR(
    `/empresas/${companyId}/resumen-financiero`,
    fetchCompanySummary
  );
  const sub = subscription.data?.data;
  const validity = getValidity(sub);
  const value = (query, content) =>
    query.error ? "No disponible" : query.isLoading ? "…" : content;
  const metrics = [
    {
      label: "Empleados activos",
      icon: Users,
      value: value(subscription, sub?.empleados_activos ?? "Sin dato"),
      note: "Personal registrado",
    },
    {
      label: "Mensualidad actual",
      icon: CreditCard,
      value: value(subscription, money(sub?.mensualidad_actual)),
      note: "Importe mensual · MXN",
    },
    {
      label: "Saldo pendiente",
      icon: Wallet,
      value: value(financial, money(financial.data?.data?.saldo_pendiente)),
      note: "Cobranza registrada",
      featured: true,
    },
    {
      label: "Vigencia administrativa",
      icon: CalendarDays,
      value: value(subscription, validity?.date || "Sin fecha"),
      note: subscription.error
        ? "Consulta no disponible"
        : validity?.label || "Fecha registrada",
    },
  ];
  return (
    <div className={styles.snapshot}>
      {metrics.map(({ label, icon: Icon, value, note, featured }) => (
        <div
          key={label}
          className={styles.metric}
          data-featured={featured || undefined}
        >
          <span>
            <Icon size={16} />
            {label}
          </span>
          <strong>{value}</strong>
          <small>{note}</small>
        </div>
      ))}
    </div>
  );
}
function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className={styles.sectionHeading}>
      <span className={styles.sectionIcon}>
        <Icon size={19} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
function Info({ label, value, wide }) {
  return (
    <div className={wide ? styles.wideField : undefined}>
      <dt>{label}</dt>
      <dd>{value || <span className={styles.muted}>Sin registrar</span>}</dd>
    </div>
  );
}
