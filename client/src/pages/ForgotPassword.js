import React from "react";
import { apiFetch } from "../utils/api";
import { useSearchParams } from "react-router-dom";

export default function ForgotPassword() {

  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const [searchParams] = useSearchParams();
const initialEmail = searchParams.get("email") || "";

const [email, setEmail] = React.useState(initialEmail);

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading || cooldown > 0) return;

    setLoading(true);
    setMessage("");

    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setMessage(
        "If an account with that email exists, a password reset link has been sent."
      );

      // start cooldown
      setCooldown(30);
    } catch (err) {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // countdown timer
  React.useEffect(() => {
    if (cooldown === 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  return (
    <div className="container mt-5" style={{ maxWidth: "400px" }}>
      <h2>Forgot Password</h2>

      {message && <div className="alert alert-info">{message}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>Email address</label>
          <input
            className="form-control"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary w-100"
          disabled={loading || cooldown > 0}
        >
          {loading
            ? "Sending..."
            : cooldown > 0
            ? `Try again in ${cooldown}s`
            : "Send reset link"}
        </button>
      </form>
    </div>
  );
}