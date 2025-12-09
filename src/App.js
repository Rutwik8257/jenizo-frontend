// src/App.js
import { useState } from "react";
import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";

import AboutUs from "./Pages/AboutUs";
import ApplicationForm from "./Pages/ApplicationForm";
import Careers from "./Pages/Careers";
import Contact from "./Pages/Contact";
import Home from "./Pages/Home";
import Login from "./Pages/Login";
import Privacy from "./Pages/Privacy";
import Register from "./Pages/Register";
import ServiceDetail from "./Pages/ServiceDetail";
import Services from "./Pages/Services";
import StartYourProject from "./Pages/StartYourProject";
import Terms from "./Pages/Terms";

import "./App.css";

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen(prev => !prev);
  const closeMobile = () => setMobileOpen(false);

  return (
    <Router>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
      />

      {/* single navbar component */}
      <Navbar
        mobileOpen={mobileOpen}
        toggleMobile={toggleMobile}
        closeMobile={closeMobile}
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/services" element={<Services />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />
        <Route path="/start-your-project" element={<StartYourProject />} />

        {/* ⭐ Application Form Route */}
        <Route path="/application-form" element={<ApplicationForm />} />
      </Routes>

      <footer className="main-footer">
        <div className="footer-left">
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>

        <div className="footer-right">
          <i className="fab fa-linkedin social"></i>
          <i className="fab fa-instagram social"></i>
          <i className="fab fa-twitter social"></i>
          <i className="fab fa-facebook social"></i>
        </div>
      </footer>
    </Router>
  );
}

export default App;
