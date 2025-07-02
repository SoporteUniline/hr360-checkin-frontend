import React from "react";
import { Controller } from "react-hook-form";
import AsyncSelect from "react-select/async";

export default function ControlledAutocomplete({
  form = null,
  id = "autocomplete_id",
  name = "entidad",
  loadOptions = [],
  placeholder = "",
  disabled = false,
  onChange,
}) {
  const { control } = form;

  return (
    <div className="w-full">
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          return (
            <AsyncSelect
              {...field}
              id={id}
              instanceId={id}
              loadOptions={(inputVal) => loadOptions(inputVal)}
              onChange={(value) => {
                field.onChange(value ?? null);
                if (onChange) onChange(value); // importante si quieres propagar cambios al padre
              }}
              value={field.value ?? null} // ✅ nunca undefined
              placeholder={placeholder}
              noOptionsMessage={() => "No hay resultados"}
              isDisabled={disabled}
              isClearable
            />
          );
        }}
      />
    </div>
  );
}
