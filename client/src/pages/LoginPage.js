import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";


export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [debug, setDebug] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setDebug("");
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e.userMessage || e.message || "Login failed");
    }
  }



  return (
    <div style={{ maxWidth: 380, margin: "40px auto" }}>
      <h1>Login</h1>


      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} name="email" placeholder="Email" autoComplete="email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" />
        <button type="submit">Sign in</button>
      </form>

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
      {debug ? <pre style={{ background: "#f6f6f6", padding: 10 }}>{debug}</pre> : null}
    </div>
  );
}