import React from "react";
import { Routes, Route } from "react-router-dom";

import RequireAuth from "../auth/RequireAuth";
import RequireGuest from "../auth/RequireGuest";
import ResetPassword from "../pages/ResetPassword";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/Dashboard";
import ChildDeckPage from "../pages/ChildDeckPage";
import LandingPage from "../pages/LandingPage";
import ForgotPassword from "../pages/ForgotPassword";
import CompleteProfile from "../pages/CompleteProfile";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
     
      <Route element={<RequireGuest />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<RequireAuth />}>
         <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/children/:childId/decks/:deckId" element={<ChildDeckPage />} />
      </Route>

      <Route path="*" element={<div>Not Found</div>} />
    </Routes>


  );
}