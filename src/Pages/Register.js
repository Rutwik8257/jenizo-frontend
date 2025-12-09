// src/Pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });

      if (!res.ok) {
        const txt = await res.text();
        let payload;
        try { payload = JSON.parse(txt); } catch { payload = { message: txt }; }
        throw new Error(payload.error || payload.message || `HTTP ${res.status}`);
      }

      // If register succeeded, redirect to login
      navigate("/login");
    } catch (err) {
      console.error("Register error:", err);
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Create Account</h2>

        <form onSubmit={handleSubmit}>
          <input type="text" name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Enter Email" value={form.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Create Password" value={form.password} onChange={handleChange} required />
          <input type="password" name="confirmPassword" placeholder="Confirm Password" value={form.confirmPassword} onChange={handleChange} required />

          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? "Creating…" : "Register"}
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}

        <p className="register-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
