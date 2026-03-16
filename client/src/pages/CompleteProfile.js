import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { useNavigate } from "react-router-dom";
import BirthdayField from "../utils/BirthdayField";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [birthday, setBirthday] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadMe() {
      try {
        const data = await apiFetch("/auth/me");
console.log("Profile data:", data);
        if (ignore) return;

        if (data?.birth_date) {
          navigate("/dashboard", { replace: true });
          return;
        }

        setLoading(false);
      } catch (err) {
        if (!ignore) {
          setError("Unable to load profile.");
          setLoading(false);
        }
      }
    }

    loadMe();
    return () => {
      ignore = true;
    };
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!birthday) {
      setError("Birthday is required.");
      return;
    }

    try {
      await apiFetch("/auth/me/birth_date", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birth_date: birthday }),
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.userMessage || "Unable to save birthday.");
    }
  }

  if (loading) return <div className="container py-4">Loading...</div>;

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h1 className="mb-3">Complete Your Profile</h1>
          <p className="text-muted">
           Parent/Guardian Date of Birth Required
           </p>
           <p>
To finish setting up your account, please enter your own date of birth (not your child’s).
</p>
          <form onSubmit={handleSubmit}>
            <BirthdayField value={birthday} onChange={setBirthday} error={error} />

            {error ? <div className="alert alert-danger">{error}</div> : null}

            <button type="submit" className="btn btn-primary">
              Save and Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}