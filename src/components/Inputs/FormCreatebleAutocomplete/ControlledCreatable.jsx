"use client";
import React from "react";
import { Controller } from "react-hook-form";
import CreatableAsyncSelect from "react-select/async-creatable";

export default function ControlledCreatableAutocomplete({
  form = null,
  id = "automplete_id",
  name = "entidad",
  loadOptions = [],
  placeholder = "",
  disabled = false,
}) {
  const { control, watch, setValue } = form;
  const selectedValue = watch(name);

  return (
    <div className="w-full">
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          return (
            <CreatableAsyncSelect
              {...field}
              id={id}
              instanceId={id}
              isDisabled={disabled}
              value={field.value}
              placeholder={placeholder}
              loadOptions={(inputVal) =>
                loadOptions(inputVal, selectedValue?.value)
              }
              onChange={(option) => {
                field.onChange(option);
              }}
              onCreateOption={(inputValue) => {
                // Crea una nueva opción con lo que el usuario escribió
                const newOption = { label: inputValue, value: inputValue };
                setValue(name, newOption); // lo guarda en el form
              }}
              noOptionsMessage={() => "No hay resultados"}
              formatCreateLabel={(inputValue) => `Crear "${inputValue}"`}
            />
          );
        }}
      />
    </div>
  );
}
