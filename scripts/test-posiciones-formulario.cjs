const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { transform } = require("next/dist/build/swc");

// Render the real tab layouts; replace external controls and network hooks only.
const Control = ({ children }) => React.createElement("div", null, children);
const FormField = ({ name }) => React.createElement("span", { "data-standard": name });
const controls = new Proxy({ FormField }, { get: (target, key) => target[key] || Control });
async function loadTab(name) {
  const filename = path.resolve(__dirname, "../src/app/panel/empleados/tabs", `${name}.jsx`);
  return (await loadModule(filename)).default;
}
async function loadModule(filename, overrides = {}) {
  const { code } = await transform(fs.readFileSync(filename, "utf8"), {
    filename,
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } },
    module: { type: "commonjs" },
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    process,
    console,
    require: id => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id === "react" || id.startsWith("react/")) return require(id);
      if (id === "notistack") return { useSnackbar: () => ({ enqueueSnackbar() {} }) };
      if (id === "swr") return { __esModule: true, default: () => ({ data: { data: [] } }) };
      if (id.includes("useEmpresaDependencias")) return { __esModule: true, default: () => ({ sucursales: [], departamentos: [] }), useEmpresaDependencias: () => ({ sucursales: [], departamentos: [] }) };
      return controls;
    },
  }, { filename });
  return exports;
}

function renderTab(Tab, values = {}) {
  return renderToStaticMarkup(React.createElement(Tab, {
    form: {
      watch: key => values[key],
      getValues: key => values[key],
      control: {},
      formState: { errors: {}, isSubmitted: false },
      setValue() {},
    },
    soloLectura: false,
    renderCampos: position => React.createElement("span", { "data-custom": position }),
  }));
}

test("Datos personales inserta exactamente después de Nombre y entre campos mapeados", async () => {
  const html = renderTab(await loadTab("TabPersonales"));
  const ordered = [
    'data-standard="nombre"', 'data-custom="nombre"',
    'data-standard="apellido_paterno"', 'data-custom="apellido_paterno"',
    'data-standard="apellido_materno"',
  ];
  for (let i = 1; i < ordered.length; i++) assert.ok(html.indexOf(ordered[i - 1]) < html.indexOf(ordered[i]), ordered[i]);
  assert.equal(html.split('data-custom="nombre"').length - 1, 1);
  assert.ok(html.includes('data-custom="documento_curp"'));
});

test("todas las posiciones de pestañas de captura se renderizan una sola vez", async () => {
  const positions = require("../src/lib/posicionesCampos.json");
  for (const [name, tab] of [["TabPersonales", "personales"], ["TabLaborales", "laborales"], ["TabNomina", "nomina"], ["TabCuentasBancarias", "cuentas"], ["TabJornada", "jornada"]]) {
    const html = renderTab(await loadTab(name), { forma_calculo: "Ambos", horarios: [] });
    for (const position of ["inicio", ...positions[tab].map(([key]) => key), "fin"]) {
      assert.equal(html.split(`data-custom="${position}"`).length - 1, 1, `${tab}: ${position}`);
    }
  }
});

test("posiciones de sueldo y otro banco no desaparecen al ocultarse esos controles", async () => {
  for (const [name, position] of [["TabNomina", "sueldo"], ["TabCuentasBancarias", "otro_banco"]]) {
    const html = renderTab(await loadTab(name));
    assert.ok(!html.includes(`data-standard="${position}"`));
    assert.ok(html.includes(`data-custom="${position}"`));
  }
});

test("los valores reales se muestran en la posición elegida, respetando el orden y la lectura", async () => {
  const api = await import("../src/lib/camposPersonalizados.mjs");
  const { CamposEmpleado } = await loadModule(path.resolve(__dirname, "../src/components/CamposEmpleado.jsx"), {
    "@/lib/camposPersonalizados.mjs": api,
    "@/components/ui/input": { Input: props => React.createElement("input", props) },
  });
  const Tab = await loadTab("TabPersonales");
  const values = { primero: "Valor guardado", segundo: "Otro valor" };
  const form = { watch: key => key === "campos_personalizados" ? values : undefined, control: {} };
  const base = { activo: true, formulario: true, pestana: "personales", despues_de: "nombre", tipo: "texto", opciones: [] };
  for (const soloLectura of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(Tab, {
      form, soloLectura,
      renderCampos: (despuesDe, agrupar) => React.createElement(CamposEmpleado, {
        form, soloLectura, pestana: "personales", despuesDe, agrupar,
        campos: [{ ...base, id: "segundo", nombre: "Segundo", orden: 2 }, { ...base, id: "primero", nombre: "Primero", orden: 1 }],
      }),
    }));
    assert.ok(html.indexOf('data-standard="nombre"') < html.indexOf("Primero"));
    assert.ok(html.indexOf("Primero") < html.indexOf("Segundo"));
    assert.ok(html.indexOf("Segundo") < html.indexOf('data-standard="apellido_paterno"'));
    assert.equal(html.split("Valor guardado").length - 1, 1);
    assert.equal(html.includes('id="campo-empleado-primero"'), !soloLectura);
  }
});

test("sin campos visibles no se reserva una fila ni un contenedor vacío", async () => {
  const api = await import("../src/lib/camposPersonalizados.mjs");
  const { CamposEmpleado } = await loadModule(path.resolve(__dirname, "../src/components/CamposEmpleado.jsx"), {
    "@/lib/camposPersonalizados.mjs": api,
  });
  const base = { activo: true, formulario: true, pestana: "personales", despues_de: "nombre", tipo: "texto", opciones: [] };
  for (const campos of [[], [{ ...base, activo: false }], [{ ...base, formulario: false }], [{ ...base, pestana: "nomina" }]]) {
    const html = renderToStaticMarkup(React.createElement(CamposEmpleado, {
      form: { watch: () => ({}) }, campos, pestana: "personales", despuesDe: "nombre", agrupar: true,
    }));
    assert.equal(html, "");
  }
});

test("Subir y Bajar cambian la vista previa y respetan los extremos de la lista", async () => {
  const { vistaOrdenCampo } = await import("../src/lib/camposPersonalizados.mjs");
  const { default: Editor } = await loadModule(path.resolve(__dirname, "../src/components/OrdenCamposEditor.jsx"));
  const base = { activo: true, formulario: true, id_empresa: 5, pestana: "personales", despues_de: "nombre" };
  const fields = [{ ...base, id: "a", nombre: "A" }, { ...base, id: "b", nombre: "B" }];
  function button(node, label) {
    if (!node || typeof node !== "object") return null;
    if (node.props?.["aria-label"] === label) return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const found = button(child, label);
      if (found) return found;
    }
    return null;
  }
  let antesDe;
  const props = () => ({ campos: vistaOrdenCampo(fields, { ...base, nombre: "B" }, "b", antesDe), onChange: value => { antesDe = value; }, disabled: false });
  let tree = Editor(props());
  assert.equal(button(tree, "Bajar este campo").props.disabled, true);
  button(tree, "Subir este campo").props.onClick();
  assert.equal(antesDe, "a");
  assert.deepEqual(props().campos.map(c => c.id), ["b", "a"]);
  tree = Editor(props());
  assert.equal(button(tree, "Subir este campo").props.disabled, true);
  button(tree, "Bajar este campo").props.onClick();
  assert.equal(antesDe, null);
  assert.deepEqual(props().campos.map(c => c.id), ["a", "b"]);
  assert.equal(Editor({ campos: [{ ...base, id: "b", actual: true }], disabled: false, onChange() {} }), null);
});

test("el diálogo sólo elimina campos sin datos y ofrece desactivar los que tienen información", async () => {
  const id = "00000000-0000-0000-0000-000000000001";
  for (const count of [0, 2]) {
    const calls = [];
    let state = 0;
    const usage = { id, nombre: "Campo", activo: true, empleados_con_valor: count };
    const { default: Dialog } = await loadModule(path.resolve(__dirname, "../src/components/EliminarCampoDialog.jsx"), {
      react: { ...React, useEffect() {}, useState: initial => [state++ === 0 ? usage : initial, () => {}] },
      "@/lib/axios": { __esModule: true, default: { delete: async (...args) => calls.push(["delete", ...args]), put: async (...args) => calls.push(["put", ...args]) } },
    });
    const tree = Dialog({ campo: { id }, empresa: 5, onClose: () => calls.push(["close"]), onComplete: () => calls.push(["refresh"]) });
    const html = renderToStaticMarkup(tree);
    assert.ok(html.includes(count ? "Desactivar campo" : "Eliminar campo"));
    if (count) assert.ok(html.includes("2 empleados"));
    function findAction(node) {
      if (!node || typeof node !== "object") return null;
      if (node.props?.variant === (count ? "default" : "destructive") && node.props?.onClick) return node;
      for (const child of React.Children.toArray(node.props?.children)) {
        const found = findAction(child);
        if (found) return found;
      }
      return null;
    }
    await findAction(tree).props.onClick();
    assert.equal(calls[0][0], count ? "put" : "delete");
    if (count) assert.equal(calls[0][2].activo, false);
    assert.deepEqual(JSON.parse(JSON.stringify(calls[0].at(-1))), { params: { empresa: 5 } });
    assert.ok(calls.some(call => call[0] === "refresh"));
  }
});
