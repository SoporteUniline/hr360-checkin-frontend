// src/hooks/useDebounce.js
import { useState, useEffect } from "react";

export default function useDebounce(value, delay) {
  // Estado para almacenar el valor debounced
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Configura un temporizador para actualizar el valor debounced
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpia el temporizador si el valor o el retardo cambian
    // Esto asegura que el temporizador se reinicie en cada pulsación de tecla
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  // Retorna el valor debounced (el cual solo se actualiza después del delay)
  return debouncedValue;
}
