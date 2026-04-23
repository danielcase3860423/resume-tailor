"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getCookie } from "cookies-next";
import { COOKIE_USER_KEY } from "@/config/constants";

export const GlobalContext = createContext({});

export function useGlobalContext() {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
}

export default function GlobalProvider({ children }) {
  const [loginUser, setLoginUser] = useState({ isLoggedIn: false, user: null });

  useEffect(() => {
    // if (typeof window !== "undefined") {
    //   const user = JSON.parse(localStorage.getItem("user"));
    //   if (user) {
    //     setLoginUser({ isLoggedIn: true, user });
    //   }
    // }

    const cookie_data = getCookie(COOKIE_USER_KEY) || null;
    const user = JSON.parse(cookie_data);
    if (user) {
      setLoginUser({ isLoggedIn: true, user });
    }
  }, []);
  // Providing an object makes it easier to read and extend in the future
  const value = { loginUser, setLoginUser };
  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
}
