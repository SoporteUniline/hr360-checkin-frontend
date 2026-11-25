"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import axios, { setAuthToken, ensureOfflineCache } from "@/lib/axios"; // ← USAR TU INSTANCE
import { SnackbarProvider } from "notistack";
import { useRouter } from "next/navigation";
import { avisarCierreDeSesion } from "@/lib/passkeys/api";

const AuthContext = createContext({
  dataUser: null,
  modulosSesion: null,
  permisosSesion: null,
  isLoggedIn: false,
  isAuthChecked: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [dataUser, setDataUser] = useState(null);
  // Módulos activos de las empresas de la sesión (los manda /users/verify/token). Llegan junto con el
  // usuario, así el menú se arma de una vez (sin mostrar y luego ocultar). null = servidor viejo: no se filtra nada.
  const [modulosSesion, setModulosSesion] = useState(null);
  // (16/12/2026) Usuario con acceso: { plantilla, modulos: {área: nivel}, empresas } de /users/verify/token.
  // null = dueño (o servidor viejo): no se filtra nada por permisos. Ver src/lib/permisos/permisos.mjs.
  const [permisosSesion, setPermisosSesion] = useState(null);
  const router = useRouter();

  const verifyToken = async () => {
    const token = Cookies.get("token");

    if (!token) {
      setAuthToken(null); // ← limpia el axios
      setIsLoggedIn(false);
      setDataUser(null);
      setIsAuthChecked(true);
      return;
    }

    try {
      setAuthToken(token); // ← **PONE EL TOKEN EN AXIOS**

      const res = await axios.get("/users/verify/token");

      if (res.status === 200) {
        setModulosSesion(res.data.modulos ?? null);
        setPermisosSesion(res.data.user?.esAcceso ? res.data.permisos ?? null : null);
        setDataUser(res.data.user);
        setIsLoggedIn(true);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        Cookies.remove("token");
        setAuthToken(null);
        setIsLoggedIn(false);
        setDataUser(null);
      }
    } finally {
      setIsAuthChecked(true);
    }
  };

  useEffect(() => {
    verifyToken();
  }, []);

  const login = async (token) => {
    Cookies.set("token", token, { expires: 365 });
    setAuthToken(token); // ← token para todo axios instance
    setIsLoggedIn(true);
    await verifyToken();
  };

  // destino (opcional): a dónde ir después (p. ej. el login con aviso). Si llega un evento (onClick={logout}), /login.
  const logout = (destino) => {
    const previousToken = Cookies.get('token');
    // (25/11/2026) El servidor cierra ESTA sesión (el token deja de servir aunque alguien lo hubiera copiado).
    void avisarCierreDeSesion(previousToken);
    void ensureOfflineCache().then(cache => cache?.clearSession(previousToken)).catch(() => {});
    import(/* webpackIgnore: true */ '/offline-clock/store.mjs?v=4')
      .then(store => store.clearConfig()).catch(() => {});
    Cookies.remove("token");
    setAuthToken(null);
    setIsLoggedIn(false);
    setDataUser(null);
    setModulosSesion(null);
    setPermisosSesion(null);
    // Con destino (sesión cerrada por el servidor): navegación completa, para que el aviso gane a la guardia del panel
    // (SesionPanel manda a /login?next=… al ver que ya no hay sesión).
    if (typeof destino === "string" && destino.startsWith("/login")) window.location.assign(destino);
    else router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isAuthChecked,
        dataUser,
        modulosSesion,
        permisosSesion,
        login,
        logout,
      }}
    >
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        autoHideDuration={3000}
      >
        {children}
      </SnackbarProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Devuelve la zona horaria de la empresa activa.
 * Si idEmpresa es null / "all", usa la zona de la primera empresa del usuario.
 */
export function useEmpresaTimezone(idEmpresa) {
  const { dataUser } = useContext(AuthContext);
  if (idEmpresa && idEmpresa !== "all") {
    const empresa = dataUser?.empresas_detalle?.find(
      (e) => String(e.id_empresa) === String(idEmpresa),
    );
    if (empresa?.zona_horaria) return empresa.zona_horaria;
  }
  return dataUser?.zona_horaria || "America/Mexico_City";
}
