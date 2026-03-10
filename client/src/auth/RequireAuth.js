import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "./useAuth";

export default function RequireAuth() {
  const { isAuthed, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) return <div>Loading...</div>;
  if (!isAuthed) return <Navigate to="/" replace state={{ from: location }} />;
console.log("isAuthed:", isAuthed);
  return <Outlet />;
}