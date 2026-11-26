import Cookies from "js-cookie-original";
import { demoBasePath, nombreCookieSesion } from "./demo-base-path.mjs";

const atributos = { path: demoBasePath };
const nombre = (clave) => clave === "token" ? nombreCookieSesion : clave;

const cookiesDemo = {
  get(clave) {
    return Cookies.get(nombre(clave));
  },
  set(clave, valor, opciones) {
    return Cookies.set(nombre(clave), valor, { ...opciones, ...atributos });
  },
  remove(clave, opciones) {
    return Cookies.remove(nombre(clave), { ...opciones, ...atributos });
  },
};

export default cookiesDemo;
