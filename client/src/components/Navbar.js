import React from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth"; // or wherever your hook lives

export default function Navbar() {
  const navigate = useNavigate();
  const { logout } = useAuth(); // ✅ context logout clears parent state

  async function logOut() {
    try {
      await logout(); // calls authApi.logout + setParent(null)
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("Logout failed:", e);
    }
  }

  return (
    <nav style={{ padding: 16, borderBottom: "1px solid #ccc", marginBottom: 16 }}>
      <h2>Adaptive Flashcards</h2>
      <button type="button" onClick={logOut}>Log Out</button>
      <button type="button" onClick={() => navigate("/register")} style={{ marginLeft: 8 }}>Register</button>
     {/* Add more nav links/buttons as needed */} 
    </nav>
  );
}