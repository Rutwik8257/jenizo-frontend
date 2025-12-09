// src/Pages/Login.jsx
import { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);

  const position = location.state?.position || "";

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const API_BASE = "http://localhost:8080"; // change if backend runs elsewhere

  const handleChange = (e) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const text = await resp.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = { ok: resp.ok, message: text }; }

      if (!resp.ok) {
        setErr(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // on success: prefer server token+user; if not present store email as user
      const token = data.token || data.accessToken || null;
      const user = data.user || { email: form.email };

      if (token) login(token, user);
      else {
        // still set localStorage so context/readers can work
        login(null, user);
      }

      // navigate to application form (forwarding position if any)
      navigate("/application-form", { state: { position } });
    } catch (err) {
      console.error("Login error:", err);
      setErr("Network or server error");
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
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {err && <p style={{ color: "red", marginTop: 10 }}>{err}</p>}

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
