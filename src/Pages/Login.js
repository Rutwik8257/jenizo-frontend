// src/Pages/Login.jsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Login.css";

const API_BASE = "https://jenizo-backend.onrender.com"; // << hardcoded for quick test
console.log("TEST API_BASE (hardcoded):", API_BASE);

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const position = location.state?.position || "";

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      if (!res.ok) {
        const txt = await res.text();
        let payload;
        try { payload = JSON.parse(txt); } catch { payload = { message: txt }; }
        throw new Error(payload.error || payload.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      // store token & user — adapt keys to match your backend response
      if (data.token) localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user || { email: form.email }));

      // notify other parts of app (Navbar)
      window.dispatchEvent(new Event("authChanged"));

      // go to application form (preserve position if any)
      navigate("/application-form", { state: { position } });
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Login</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Enter Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Enter Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}

        <p className="login-link">
          Don’t have an account?{" "}
          <Link to="/register" state={{ position }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
