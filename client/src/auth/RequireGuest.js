import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import useAuth from "./useAuth";

export default function RequireGuest() {
  const { isAuthed, isBootstrapping } = useAuth();

  if (isBootstrapping) return <div>Server Loading...</div>;
  if (isAuthed) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}