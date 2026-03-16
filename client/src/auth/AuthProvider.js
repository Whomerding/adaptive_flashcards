import React, { createContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/authApi";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [parent, setParent] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

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

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setParent(null);
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
  }),
  [parent, isAuthed, isBootstrapping]
);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}