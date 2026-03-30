import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../auth/AuthProvider";
import "../styles/navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { logout, isAuthed } = React.useContext(AuthContext);

  async function handleLogOut() {
  await logout();
  navigate("/");
}
  return (
     <nav className="navbar navbar-expand-md navbar-light border-bottom py-0">
    <div className="container">
     
        <Link
          to="/"
          className="d-flex align-items-center mb-md-0 me-md-auto text-decoration-none"
        >
          <img src="/img/logo.png" height="100" alt="True North Math" />
          <div className="log-text">
        <h3 className="cinzel-decorative-bold true-north">True 🧭 North</h3>
        <h2 className="px-4 medievalsharp-regular">Fact Quest</h2>
        </div>
        </Link>

      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
      >
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav ms-auto align-items-md-center">

          {isAuthed ? (
            <li className="nav-item">
              <Link to="/dashboard" className="nav-link">
                Dashboard
              </Link>
            </li>
          ) : (
            <li className="nav-item">
              <Link to="/" className="nav-link">
                Home
              </Link>
            </li>
          )}

          {isAuthed ? (
            <li className="nav-item ms-md-2 mt-2 mt-md-0">
              <button
                type="button"
                onClick={handleLogOut}
                className="btn btn-outline-dark w-100"
              >
                Log Out
              </button>
            </li>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link">
                  Login
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-link">
                  Register
                </Link>
              </li>
            </>
          )}

        </ul>
      </div>
    </div>
  </nav>
);
}
