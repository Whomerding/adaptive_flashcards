import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../auth/useAuth";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [birthday, setBirthday] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await register(email, password, birthday);
      navigate("/", { replace: true });
    } catch (e) {

      setError(e.message|| e.userMessage );
      
    }
  }

 return (
  <div className="container d-flex justify-content-center align-items-center vh-80 mt-5">
    <div className="card shadow p-4" style={{ width: "350px" }}>
      <h3 className="text-center mb-3">Create Account</h3>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="form-control mb-3"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="form-control mb-3"
        />
         <label htmlFor="birth_date" className="form-label">
            Birthday
          </label>
          <input
            id="birth_date"
            type="date"
            value={birthday}
            required
            onChange={(e) => setBirthday(e.target.value)}
            className="form-control mb-3"
          />
        {error && <p className="text-danger">{error}</p>}

        <button type="submit" className="btn btn-primary w-100">
          Register
        </button>
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
      <p className="text-center mt-3 mb-0">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  </div>
);
}