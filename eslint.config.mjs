import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const sinUsar = { args: "none", ignoreRestSiblings: true, varsIgnorePattern: "^_", caughtErrors: "none" };

// Módulos escritos desde cero (nov. 2026): ahí una variable o import sin usar es error; en el resto del código, aviso
// mientras se limpia (había ~190 casos heredados).
const MODULOS_NUEVOS = [
  "src/app/dashboard/popups", "src/app/dashboard/whatsapp", "src/app/panel/horas-extra", "src/app/panel/turnos-extra",
  "src/app/rostro", "src/components/cambios", "src/components/firma", "src/components/ia", "src/components/landing/home",
  "src/components/landing/popups", "src/components/landing/sitio", "src/components/legal", "src/components/modulos",
  "src/components/nomina", "src/components/tareas", "src/components/whatsapp", "src/lib/asistencia",
  "src/lib/diagnostico-reloj", "src/lib/firma", "src/lib/legal", "src/lib/modulos", "src/lib/reloj", "src/lib/rostro",
  "src/lib/sitio", "src/lib/tareas", "src/lib/whatsapp",
].map((d) => `${d}/**/*.{js,jsx,mjs}`);

const eslintConfig = [
  // ESLint 9 (config plana) solo revisa *.js/*.mjs/*.cjs si no se declaran otras extensiones: sin esto, las pantallas
  // .jsx quedaban fuera de `npm run lint`.
  { files: ["**/*.{js,jsx,mjs,cjs}"] },
  ...compat.extends("next/core-web-vitals"),
  ...compat.env({ browser: true, node: true, es2024: true }),
  {
    files: ["src/**/*.{js,jsx,mjs}"],
    rules: {
      // Un nombre sin definir es un ReferenceError en ejecución.
      "no-undef": "error",
      "no-unused-vars": ["warn", sinUsar],
    },
  },
  { files: MODULOS_NUEVOS, rules: { "no-unused-vars": ["error", sinUsar] } },
];

export default eslintConfig;
