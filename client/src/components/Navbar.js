import React from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Navbar({ logOut }) {
  const navigate = useNavigate();

  return (
    <div className="container">
     
      <header className="d-flex flex-wrap justify-content-center align-items-center py-3 mb-4 border-bottom">
        <Link
          to="/"
          className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none"
        >
          <img src="/img/logo.png" height="48" alt="True North Math" />
          <span className="fs-4 fw-semibold text-dark">Adaptive Flashcards</span>
        </Link>

        <ul className="nav nav-pills align-items-center">
          <li className="nav-item">
            <Link to="/" className="nav-link">
              Home
            </Link>
          </li>

          <li className="nav-item">
            <Link to="/register" className="nav-link">
              Register
            </Link>
          </li>

          <li className="nav-item ms-2">
            <button
              type="button"
              onClick={logOut}
              className="btn btn-outline-dark"
            >
              Log Out
            </button>
          </li>
        </ul>
      </header>
    </div>
  );
}