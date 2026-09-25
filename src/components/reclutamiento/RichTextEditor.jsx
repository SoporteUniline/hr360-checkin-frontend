"use client";

import { createElement, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  RemoveFormatting,
} from "lucide-react";
import s from "./reclutamiento.module.css";

// Se guarda un árbol de contenido, nunca HTML arbitrario. No se aceptan atributos,
// enlaces, imágenes, estilos ni eventos. La API deberá validar el árbol también.
const allowed = new Set(["p", "h3", "ul", "ol", "li", "strong", "em", "u", "br"]);
const aliases = { b: "strong", i: "em", div: "p", h1: "h3", h2: "h3", h4: "h3" };
function readNodes(element, depth = 0) {
  if (depth > 12) return [];
  return Array.from(element.childNodes).flatMap((node) => {
    if (node.nodeType === 3) return [{ text: node.textContent }];
    if (
      node.nodeType !== 1 ||
      ["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG"].includes(node.nodeName)
    )
      return [];
    const tag = node.nodeName.toLowerCase();
    const type = aliases[tag] || tag;
    const children = readNodes(node, depth + 1);
    return allowed.has(type) ? [{ type, children }] : children;
  });
}
function appendNodes(parent, nodes, depth = 0) {
  if (depth > 12 || !Array.isArray(nodes)) return;
  nodes.forEach((node) => {
    if (typeof node.text === "string") parent.appendChild(document.createTextNode(node.text));
    else if (allowed.has(node.type)) {
      const element = document.createElement(node.type);
      appendNodes(element, node.children, depth + 1);
      parent.appendChild(element);
    }
  });
}
function renderNodes(nodes, depth = 0) {
  if (depth > 12 || !Array.isArray(nodes)) return null;
  return nodes.map((node, index) =>
    typeof node.text === "string"
      ? node.text
      : allowed.has(node.type)
      ? createElement(
          node.type,
          { key: index },
          node.type === "br" ? undefined : renderNodes(node.children, depth + 1)
        )
      : null
  );
}
export function RichDescription({ value }) {
  return <div className={s.prose}>{renderNodes(value)}</div>;
}
export default function RichTextEditor({ value, onChange, id, ...ariaProps }) {
  const ref = useRef(null);
  const initial = useRef(value);
  useEffect(() => {
    ref.current.replaceChildren();
    appendNodes(ref.current, initial.current);
  }, []);
  const sync = () => onChange(readNodes(ref.current));
  const command = (name, argument) => {
    ref.current.focus();
    document.execCommand(name, false, argument);
    sync();
  };
  const controls = [
    ["Negrita", Bold, "bold"],
    ["Cursiva", Italic, "italic"],
    ["Subrayado", Underline, "underline"],
    ["Encabezado", Heading2, "formatBlock", "h3"],
    ["Lista con viñetas", List, "insertUnorderedList"],
    ["Lista numerada", ListOrdered, "insertOrderedList"],
    ["Quitar formato", RemoveFormatting, "removeFormat"],
  ];
  return (
    <div className={s.editor}>
      <div className={s.toolbar} role="group" aria-label="Formato del puesto">
        {controls.map(([label, Icon, name, argument]) => (
          <button
            key={name}
            type="button"
            className={s.iconButton}
            title={label}
            aria-label={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command(name, argument)}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        id={id}
        {...ariaProps}
        role="textbox"
        aria-multiline="true"
        aria-label="Acerca del puesto"
        className={s.editable}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onPaste={(event) => {
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
          sync();
        }}
        onDrop={(event) => event.preventDefault()}
      />
    </div>
  );
}
