"use client";

// Catálogos de reclutamiento. Sucursales = catálogo «Sucursales» de la empresa (solo lectura aquí); modalidades =
// las tres base de ADAMIA más las propias de la empresa.
import { useState } from "react";
import Link from "next/link";
import { Plus, MapPin, Layers, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalize } from "@/lib/reclutamiento/model";
import { Field, Modal, PageSurface } from "./RecruitmentUI";
import s from "./reclutamiento.module.css";

export default function CatalogDialog({ data, onSave, onClose, embedded = false }) {
  const Surface = embedded ? PageSurface : Modal;
  const [name, setName] = useState("");
  const [requiresBranch, setRequiresBranch] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Surface
      title="Catálogos de la vacante"
      description="Ubicación y modalidad son datos independientes."
      onClose={onClose}
      footer={
        embedded ? null : (
          <>
            <span className={s.small}>Los cambios los ve todo tu equipo.</span>
            <Button variant="outline" onClick={onClose}>
              Listo
            </Button>
          </>
        )
      }
    >
      <div className={s.formGrid}>
        <section>
          <h3 className={`${s.personName} ${s.row}`}>
            <MapPin size={16} />
            Sucursales
          </h3>
          <p className={s.muted}>La ubicación de la vacante se toma de tus Sucursales.</p>
          {!data.branches.length && (
            <p className={s.muted} style={{ marginTop: 12 }}>
              Aún no tienes sucursales. Agrégalas para publicar vacantes presenciales.
            </p>
          )}
          {data.branches.map((branch) => (
            <div key={branch.id} className={s.catalogRow}>
              <div>
                <p className={s.personName}>{branch.name}</p>
                <p className={s.small}>{branch.address}</p>
              </div>
            </div>
          ))}
          <Button variant="outline" asChild style={{ marginTop: 16 }}>
            <Link href="/panel/catalogos/unidades-de-negocio">
              <ExternalLink size={14} />
              Administrar sucursales
            </Link>
          </Button>
        </section>
        <section>
          <h3 className={`${s.personName} ${s.row}`}>
            <Layers size={16} />
            Modalidades
          </h3>
          <p className={s.muted}>Cada modalidad indica si requiere sucursal.</p>
          {data.modalities.map((modality) => (
            <div key={modality.id} className={s.catalogRow}>
              <p className={s.personName}>{modality.name}</p>
              <span className={s.small}>
                {modality.requiresBranch ? "Con sucursal" : "Sucursal opcional"}
                {modality.own ? " · propia" : " · base"}
              </span>
            </div>
          ))}
          <form
            className={s.stack}
            style={{ marginTop: 20, gap: 12 }}
            onSubmit={async (event) => {
              event.preventDefault();
              if (!name.trim() || saving) return;
              if (data.modalities.some((item) => normalize(item.name) === normalize(name.trim()))) {
                setError("Ya existe una modalidad con ese nombre.");
                return;
              }
              setSaving(true);
              const answer = await onSave({ nombre: name.trim(), requiere_sucursal: requiresBranch });
              setSaving(false);
              if (answer?.ok) {
                setName("");
                setError("");
              } else setError(answer?.message || "No se pudo guardar esta modalidad.");
            }}
          >
            <Field label="Agregar modalidad">
              {(props) => (
                <input
                  {...props}
                  required
                  value={name}
                  maxLength={40}
                  placeholder="Ej. En campo"
                  onChange={(event) => setName(event.target.value)}
                />
              )}
            </Field>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={requiresBranch}
                onChange={(event) => setRequiresBranch(event.target.checked)}
              />
              Requiere una sucursal
            </label>
            {error && (
              <p role="alert" className={s.fieldError}>
                {error}
              </p>
            )}
            <Button type="submit" variant="outline" loading={saving} disabled={saving}>
              <Plus size={14} />
              Agregar modalidad
            </Button>
          </form>
        </section>
      </div>
    </Surface>
  );
}
