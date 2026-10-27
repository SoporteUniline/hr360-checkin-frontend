# Orden de columnas de empleados

En **Empleados → Columnas**, activa las columnas que necesitas y arrastra desde
el icono de agarre para cambiar el orden de las columnas visibles. También se puede
usar espacio para tomar/soltar y las flechas para moverlas.

El orden se aplica a encabezados y celdas, permite mezclar campos estándar y
personalizados y se guarda junto con la visibilidad en el almacenamiento del
navegador. Al volver a activar una columna se agrega al final, sin cambiar el orden
de las demás. Se conservan al menos dos columnas y Acciones queda fija a la derecha.
Las vistas guardadas existentes utilizan la misma lista de columnas visibles.
Los selectores de otros módulos conservan su comportamiento anterior.

Verificación:

- `node --test scripts/test-columnas-empleados.mjs scripts/test-campos-personalizados.mjs`: 10 pruebas correctas.
- Lint de los archivos modificados sin errores, con un aviso anterior.
- Navegador local con API simulada: arrastre por ratón, reordenamiento por teclado,
  columnas personalizadas intercaladas, correspondencia de encabezados/celdas,
  ocultar/mostrar sin restablecer el orden, persistencia tras recargar y filtros.
- Compilación en copia temporal completada con código 0. Se mantienen los avisos
  existentes de face-api y los de enlaces de standalone en el entorno temporal Windows.

No se modificaron bases de datos ni se realizó deploy. Las capturas locales están
en `C:\Users\LUISAN~1\AppData\Local\Temp\campos-ui-TJnNVa`.
