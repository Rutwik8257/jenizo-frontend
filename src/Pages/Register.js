// src/Pages/Register.jsx
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const API_BASE = "http://localhost:8080"; // change as needed

  const handleChange = (e) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (form.password !== form.confirmPassword) {
      setErr("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const text = await resp.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = { ok: resp.ok, message: text }; }

      if (!resp.ok) {
        setErr(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      // If backend returns token/user, auto-login
      const token = data.token || data.accessToken || null;
      const user = data.user || { name: form.name, email: form.email };

      if (token) {
        login(token, user);
        navigate("/application-form");
      } else {
        // otherwise redirect to login page
        navigate("/login");
      }
    } catch (err) {
      console.error("Register error:", err);
      setErr("Network or server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Create Account</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
          />

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
            placeholder="Create Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </button>
        </form>

        {err && <p style={{ color: "red", marginTop: 10 }}>{err}</p>}

        <p className="register-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
