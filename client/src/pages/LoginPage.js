import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import useAuth from "../auth/useAuth";
import "../styles/App.css";
import "../styles/login.css";

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
    <div className="container d-flex justify-content-center align-items-center vh-80 mt-5">
<div className="card shadow p-4" style={{width:"350px"}}>
    <h3 className="text-center mb-3">Login</h3>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} name="email" placeholder="Email" autoComplete="email" className="form-control mb-3" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" className="form-control mb-3" />
       <div style={{ textAlign: "right", fontSize: "0.9rem" }}>
            <Link to={`/forgot-password?email=${encodeURIComponent(email)}`}>
              Forgot password?
            </Link>
          </div>
       
        <button type="submit" className="btn btn-primary w-100">Sign in</button>
      </form>
   <button
  className="google-btn"
  onClick={() => window.location.href = "http://localhost:5050/auth/google"}
>
  <img
    src="/logos/google_logo.svg"
    alt="Google"
    className="google-icon"
  />
  Continue with Google
</button>

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
      {debug ? <pre style={{ background: "#f6f6f6", padding: 10 }}>{debug}</pre> : null}
      </div>
    </div>
  );
}