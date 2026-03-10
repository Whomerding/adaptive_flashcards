import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../auth/AuthProvider";
import "../styles/navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { logout, isAuthed } = React.useContext(AuthContext);

  async function handleLogOut() {
  await logout();
  navigate("/login");
}
  return (
    <div className="container">
     
      <header className="d-flex flex-wrap justify-content-center align-items-center pt-3 border-bottom">
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

        <ul className="nav nav-pills align-items-center">
          <li className="nav-item">
            <Link to="/" className="nav-link">
              Home
            </Link>
          </li>

          
{isAuthed? (
            <li className="nav-item ms-2">
              <button
                type="button"
                onClick={handleLogOut}
                className="btn btn-outline-dark"
              >
                Log Out
              </button>
            </li>
            
          ): ( <><li className="nav-item">
            <Link to="/login" className="nav-link">
              Login
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/register" className="nav-link">
              Register
            </Link>
          </li>
          </>)
          }
        </ul>
      </header>
    </div>
  );
}
