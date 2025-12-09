import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar({ mobileOpen, toggleMobile, closeMobile }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  // Listen for manual changes (Login / Logout)
  useEffect(() => {
    const sync = () => {
      setToken(localStorage.getItem("token"));
      try {
        const u = localStorage.getItem("user");
        setUser(u ? JSON.parse(u) : null);
      } catch {
        setUser(null);
      }
    };

    window.addEventListener("authChanged", sync);
    return () => window.removeEventListener("authChanged", sync);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("awaiting_submission");

    window.dispatchEvent(new Event("authChanged"));

    window.location.href = "/";
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" onClick={closeMobile} className="brand">
          <img src="/images/logo-2.png" alt="Jenizo Logo" className="logo-img" />
        </Link>
      </div>

      <button className={`menu-toggle ${mobileOpen ? "open" : ""}`} onClick={toggleMobile}>
        <span className="bar" />
        <span className="bar" />
        <span className="bar" />
      </button>

      <ul className={`nav-links ${mobileOpen ? "active" : ""}`}>
        <li><Link to="/" onClick={closeMobile}>Home</Link></li>
        <li><Link to="/about" onClick={closeMobile}>About Us</Link></li>
        <li><Link to="/services" onClick={closeMobile}>Services</Link></li>
        <li><Link to="/careers" onClick={closeMobile}>Careers</Link></li>
        <li><Link to="/contact" onClick={closeMobile}>Contact</Link></li>

        {/* ⭐ Conditional rendering based on login */}
        {!token ? (
          <>
            <li><Link to="/login" onClick={closeMobile}>Login</Link></li>
            <li><Link to="/register" onClick={closeMobile}>Register</Link></li>
          </>
        ) : (
          <>
            <li className="user-tag">Hi, {user?.name || user?.email}</li>
            <li><button onClick={logout} className="logout-btn">Logout</button></li>
          </>
        )}

        <li><Link to="/start-your-project" onClick={closeMobile}>Start Your Project</Link></li>
      </ul>
    </nav>
  );
}
