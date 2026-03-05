import React from "react";
import { Routes, Route } from "react-router-dom";

import RequireAuth from "../auth/RequireAuth";
import RequireGuest from "../auth/RequireGuest";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/Dashboard";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<RequireGuest />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<div>Not Found</div>} />
    </Routes>


  );
}