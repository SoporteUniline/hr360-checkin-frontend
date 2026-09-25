"use client";

import { useState } from "react";
import { Plus, MapPin, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uid, normalize } from "@/lib/reclutamiento/model";
import { Field, Modal } from "./RecruitmentUI";
import s from "./reclutamiento.module.css";

export default function CatalogDialog({ data, onSave, onClose }) {
  const [name, setName] = useState("");
  const [requiresBranch, setRequiresBranch] = useState(true);
  const [error, setError] = useState("");
  return (
    <Modal
      title="Catálogos de la vacante"
      description="Ubicación y modalidad son datos independientes."
      onClose={onClose}
      footer={
        <>
          <span className={s.small}>Catálogos de ejemplo</span>
          <Button variant="outline" onClick={onClose}>
            Listo
          </Button>
        </>
      }
    >
      <div className={s.formGrid}>
        <section>
          <h3 className={`${s.personName} ${s.row}`}>
            <MapPin size={16} />
            Sucursales
          </h3>
          <p className={s.muted}>La ubicación se toma de Sucursales.</p>
          {data.branches.map((branch) => (
            <div key={branch.id} className={s.catalogRow}>
              <div>
                <p className={s.personName}>{branch.name}</p>
                <p className={s.small}>{branch.address}</p>
              </div>
            </div>
          ))}
          <div className={s.formHint} style={{ marginTop: 16 }}>
            Al integrar, se usarán las sucursales de la empresa. No se creará otro catálogo de
            ubicaciones.
          </div>
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
              </span>
            </div>
          ))}
          <form
            className={s.stack}
            style={{ marginTop: 20, gap: 12 }}
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              if (data.modalities.some((item) => normalize(item.name) === normalize(name.trim()))) {
                setError("Ya existe una modalidad con ese nombre.");
                return;
              }
              if (onSave({ id: uid(), name: name.trim(), requiresBranch })) {
                setName("");
                setError("");
              } else setError("No se pudo guardar esta modalidad.");
            }}
          >
            <Field label="Agregar modalidad de prueba">
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
            <Button type="submit" variant="outline">
              <Plus size={14} />
              Agregar modalidad
            </Button>
          </form>
        </section>
      </div>
    </Modal>
  );
}
