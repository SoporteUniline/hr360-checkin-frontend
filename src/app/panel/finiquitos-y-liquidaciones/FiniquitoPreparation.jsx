"use client";

import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  Loader2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/Combobox";
import FiniquitoResumen from "./FiniquitoResumen";
import styles from "./finiquitos-theme.module.css";
import dayjs from "dayjs";

function Field({
  label,
  name,
  values,
  onChange,
  type = "number",
  hint,
  step = "0.5",
  min,
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        name={name}
        aria-label={label}
        type={type}
        min={min ?? (type === "number" ? "0" : undefined)}
        step={type === "number" ? step : undefined}
        value={values[name]}
        onChange={(event) => onChange(name, event.target.value)}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function FiniquitoPreparation({
  values,
  onChange,
  unidadOptions,
  onUnidadChange,
  empSearch,
  onSearch,
  openSuggestions,
  onOpenSuggestions,
  suggestions,
  suggestionsLoading,
  onPickEmpleado,
  empleado,
  resultado,
  guardable,
  loading,
  employeeLoading,
  editingId,
  onBack,
  onCalculate,
  onSave,
}) {
  const busy = loading || employeeLoading;
  const field = (name, label, props = {}) => (
    <Field
      name={name}
      aria-label={label}
      label={label}
      values={values}
      onChange={onChange}
      {...props}
    />
  );

  return (
    <div className={styles.preparation}>
      <div className={styles.preparationHeading}>
        <div>
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={busy}
            className="mb-2 -ml-3 text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a finiquitos
          </Button>
          <h2>
            {editingId
              ? `Editar finiquito #${editingId}`
              : "Preparar finiquito"}
          </h2>
          <p>Revisa los datos, calcula el importe y continúa con la firma.</p>
        </div>
        <ol className={styles.workflow} aria-label="Progreso">
          <li aria-current="step">
            <span>1</span> Preparar
          </li>
          <li>
            <span>2</span> Revisar y firmar
          </li>
        </ol>
      </div>

      <div className={styles.preparationGrid}>
        <fieldset disabled={busy} className={styles.formColumn}>
          <section
            className={styles.formSection}
            aria-labelledby="datos-baja-title"
          >
            <div className={styles.sectionHeading}>
              <span>01</span>
              <div>
                <h3 id="datos-baja-title">Empleado y baja</h3>
                <p>Selecciona a quién corresponde el documento.</p>
              </div>
            </div>
            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <label htmlFor="finiquito-unidad">Unidad de negocio</label>
                <div>
                  <Combobox
                    name="finiquito-unidad"
                    disabled={!!editingId || busy}
                    options={unidadOptions}
                    value={values.unidadCalculo}
                    onChange={onUnidadChange}
                    placeholder="Selecciona una unidad"
                  />
                </div>
              </div>
              <div className={`${styles.field} ${styles.employeeSearch}`}>
                <label htmlFor="finiquito-empleado">Empleado</label>
                <input
                  id="finiquito-empleado"
                  placeholder={
                    values.unidadCalculo
                      ? "Buscar empleado…"
                      : "Selecciona una unidad primero"
                  }
                  value={empSearch}
                  disabled={!values.unidadCalculo || !!editingId}
                  autoComplete="off"
                  aria-controls="finiquito-sugerencias"
                  onChange={(e) => onSearch(e.target.value)}
                  onFocus={() => onOpenSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") onOpenSuggestions(false);
                  }}
                  onBlur={(e) => {
                    if (
                      !e.currentTarget.parentElement.contains(e.relatedTarget)
                    )
                      onOpenSuggestions(false);
                  }}
                />
                {openSuggestions && values.unidadCalculo && (
                  <div
                    id="finiquito-sugerencias"
                    className={styles.suggestions}
                  >
                    {suggestionsLoading ? (
                      <p>Buscando empleados…</p>
                    ) : suggestions.length ? (
                      suggestions.map((emp) => (
                        <button
                          type="button"
                          key={emp.id_empleado || emp.id}
                          onClick={() => onPickEmpleado(emp)}
                        >
                          {emp.nombre_completo}
                        </button>
                      ))
                    ) : (
                      <p>No se encontraron empleados.</p>
                    )}
                  </div>
                )}
              </div>
              {field("fechaBaja", "Fecha de baja", {
                type: "date",
                min: empleado?.fecha_ingreso
                  ? dayjs(empleado.fecha_ingreso).format("YYYY-MM-DD")
                  : undefined,
              })}
              <label className={styles.field}>
                <span>Tipo de cálculo</span>
                <select
                  aria-label="Tipo de cálculo"
                  value={values.tipoCalculo}
                  onChange={(e) => onChange("tipoCalculo", e.target.value)}
                >
                  <option value="finiquito">Finiquito</option>
                  <option value="liquidacion">Liquidación</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Tipo de terminación</span>
                <select
                  aria-label="Tipo de terminación"
                  value={values.tipoTerminacion}
                  onChange={(e) => onChange("tipoTerminacion", e.target.value)}
                >
                  {[
                    "Renuncia Voluntaria",
                    "Despido Justificado",
                    "Despido Injustificado",
                    "Mutuo Acuerdo",
                    "Fin de Contrato",
                    "Rescisión Artículo 51",
                    "Defunción",
                    "Otros",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              {empleado && (
                <div className={styles.employeeMeta}>
                  <UserRound size={18} />
                  <div>
                    <strong>{empleado.nombre_completo}</strong>
                    <span>
                      Ingreso:{" "}
                      {empleado.fecha_ingreso
                        ? dayjs(empleado.fecha_ingreso).format("DD/MM/YYYY")
                        : "—"}
                      {empleado.departamento
                        ? ` · ${empleado.departamento}`
                        : ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <label className={`${styles.field} ${styles.reasonField}`}>
              <span>
                Motivo de baja <small>Opcional</small>
              </span>
              <textarea
                value={values.motivoBaja}
                rows={2}
                placeholder="Agrega el motivo que aparecerá en el documento."
                onChange={(e) => onChange("motivoBaja", e.target.value)}
              />
            </label>
          </section>

          <section
            className={styles.formSection}
            aria-labelledby="importes-title"
          >
            <div className={styles.sectionHeading}>
              <span>02</span>
              <div>
                <h3 id="importes-title">Datos para el cálculo</h3>
                <p>Revisa los valores precargados del empleado.</p>
              </div>
            </div>
            {employeeLoading ? (
              <p className={styles.helpText}>
                <Loader2 size={16} className="animate-spin" /> Cargando salario
                y prestaciones…
              </p>
            ) : !values.idEmpleado ? (
              <p className={styles.emptyHint}>
                Selecciona un empleado para revisar su salario y prestaciones.
              </p>
            ) : (
              <>
                <div className={styles.fieldsGrid}>
                  {field("salarioDiario", "Salario diario", {
                    step: "0.01",
                    hint: "Importe en MXN",
                  })}
                  {field("diasSalarioPendiente", "Días de salario pendientes")}
                </div>
                <details className={styles.disclosure}>
                  <summary>Ajustes de vacaciones y aguinaldo</summary>
                  <p className={styles.helpText}>
                    Modifica estos valores cuando corresponda. El cálculo
                    proporcional se aplica al calcular.
                  </p>
                  <div className={styles.fieldsGrid}>
                    {field("diasNoTrabajados", "Días no trabajados", {
                      hint: "Reducen los proporcionales",
                    })}
                    {field("diasAguinaldo", "Días de aguinaldo anual")}
                    {field(
                      "diasVacAnteriores",
                      "Vacaciones pendientes de años anteriores"
                    )}
                    {field("diasVacLeyActual", "Días de vacaciones por año", {
                      step: "1",
                    })}
                    {field(
                      "diasVacYaGozadas",
                      "Vacaciones ya gozadas este año"
                    )}
                    {field("primaVacacional", "Prima vacacional (%)")}
                  </div>
                </details>
                {values.tipoCalculo === "liquidacion" && (
                  <div className={styles.liquidationField}>
                    {field("diasSalariosVencidos", "Días de salarios vencidos")}
                    <p className={styles.helpText}>
                      El resumen incluirá los conceptos adicionales de
                      liquidación.
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        </fieldset>

        <aside
          className={styles.summaryCard}
          aria-label="Resumen del finiquito"
        >
          <div className={styles.summaryHeading}>
            <h3>Resumen</h3>
            <span
              className={guardable ? styles.successBadge : styles.neutralBadge}
            >
              {guardable ? (
                <>
                  <Check size={13} /> Calculado
                </>
              ) : resultado ? (
                "Requiere recalcular"
              ) : (
                "Por calcular"
              )}
            </span>
          </div>
          <p className={styles.summaryEmployee}>
            {empleado?.nombre_completo || "Sin empleado seleccionado"}
          </p>
          <p className={styles.summaryType}>
            {values.tipoCalculo === "liquidacion" ? "Liquidación" : "Finiquito"}{" "}
            ·{" "}
            {values.fechaBaja
              ? dayjs(values.fechaBaja).format("DD/MM/YYYY")
              : "Sin fecha"}
          </p>
          <FiniquitoResumen data={guardable ? resultado : null} />
          <div className={styles.summaryActions}>
            {!guardable && (
              <p className={styles.helpText}>
                {resultado
                  ? "Cambiaste los datos. Vuelve a calcular para actualizar el importe."
                  : "Calcula para revisar los conceptos y el total."}
              </p>
            )}
            <Button
              type="button"
              onClick={guardable ? onSave : onCalculate}
              disabled={busy || !values.idEmpleado}
              className={styles.primaryButton}
            >
              {busy ? (
                <Loader2 className="animate-spin" size={17} />
              ) : guardable ? (
                <ArrowRight size={17} />
              ) : (
                <Calculator size={17} />
              )}
              {loading
                ? "Procesando…"
                : guardable
                ? "Guardar y continuar"
                : "Calcular finiquito"}
            </Button>
            {guardable && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={onCalculate}
              >
                Volver a calcular
              </Button>
            )}
            <p className={styles.nextStep}>
              Al guardar podrás solicitar la firma y descargar el documento.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
