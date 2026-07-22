"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import axios, { setAuthToken } from "@/lib/axios"; // ← USAR TU INSTANCE
import { SnackbarProvider } from "notistack";
import { useRouter } from "next/navigation";

const AuthContext = createContext({
  dataUser: null,
  isLoggedIn: false,
  isAuthChecked: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [dataUser, setDataUser] = useState(null);
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

  const logout = () => {
    Cookies.remove("token");
    setAuthToken(null);
    setIsLoggedIn(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isAuthChecked,
        dataUser,
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
