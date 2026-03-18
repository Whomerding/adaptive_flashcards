import React, { createContext, useEffect, useMemo, useState, useContext, useRef } from "react";
import * as authApi from "../api/authApi";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [parent, setParent] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
const beforeLogoutRef = useRef(null); 
useEffect(() => {
  (async () => {
    try {
      const data = await authApi.bootstrapAuth();
      setParent(data?.parent ?? null);
    } catch {
      setParent(null);
    } finally {
      setIsBootstrapping(false);
    }
  })();
}, []);

async function login(email, password) {
  await authApi.login(email, password);

  // immediately re-check who we are using cookies
  const data = await authApi.bootstrapAuth();
  setParent(data?.parent ?? null);

  return data;
}

async function register(email, password, birth_date) {
  await authApi.register(email, password, birth_date);

  const data = await authApi.bootstrapAuth();
  setParent(data?.parent ?? null);

  return data;
}



function registerBeforeLogout(fn) {
    beforeLogoutRef.current = fn;
  }

  function clearBeforeLogout() {
    beforeLogoutRef.current = null;
  }

  async function logout() {
    try {
      if (beforeLogoutRef.current) {
        await beforeLogoutRef.current();
      }

      await authApi.logout();
    } finally {
      setParent(null);
      beforeLogoutRef.current = null;
    }
  }

const isAuthed = !!parent;

const value = useMemo(
  () => ({
    parent,
    isAuthed,
    isBootstrapping,
    login,
    register,
    logout,
    setParent,
    registerBeforeLogout,
    clearBeforeLogout,
  }),
  [parent,
    isAuthed,
    isBootstrapping,
    login,
    register,
    logout,
    registerBeforeLogout,
    clearBeforeLogout,]
);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}