import React from "react";

export default function BirthdayField({ value, onChange, error }) {
  return (
    <div className="mb-3">
      <label htmlFor="birth_date" className="form-label">
        Date of Birth
      </label>

      <input
        id="birth_date"
        name="birth_date"
        type="date"
        className={`form-control ${error ? "is-invalid" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />

      {error ? <div className="invalid-feedback">{error}</div> : null}
    </div>
  );
}