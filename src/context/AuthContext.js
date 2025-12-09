// src/context/AuthContext.jsx
import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext({
  token: null,
  user: null,
  login: (token, user) => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const v = localStorage.getItem("user");
    try { return v ? JSON.parse(v) : null; } catch { return null; }
  });

  useEffect(() => {
    // keep localStorage in sync if changes originate outside this provider
    function onStorage(e) {
      if (e.key === "token") setToken(localStorage.getItem("token"));
      if (e.key === "user") {
        try { setUser(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null); }
        catch { setUser(null); }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = (newToken, newUser) => {
    if (newToken) {
      localStorage.setItem("token", newToken);
      setToken(newToken);
    }
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);
    }
    // notify any non-react listeners
    window.dispatchEvent(new Event("authChanged"));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // optional: remove awaiting_submission
    localStorage.removeItem("awaiting_submission");
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event("authChanged"));
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
