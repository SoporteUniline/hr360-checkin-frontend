"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
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
      setIsLoggedIn(false);
      setDataUser(null);
      setIsAuthChecked(true);
      return;
    }

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/users/verify/token`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 200) {
        setDataUser(res.data.user);
        setIsLoggedIn(true);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        Cookies.remove("token");
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
    Cookies.set("token", token);
    setIsLoggedIn(true);
    await verifyToken();
  };

  const logout = () => {
    Cookies.remove("token");
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
