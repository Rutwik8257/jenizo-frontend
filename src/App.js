<<<<<<< HEAD
// src/App.js
=======
>>>>>>> 05e41a57fbcc9d4c256146fdb6c976117aa0dc31
import { useState } from "react";
import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";

import AboutUs from "./Pages/AboutUs";
import Careers from "./Pages/Careers";
import Contact from "./Pages/Contact";
import Home from "./Pages/Home";
import ServiceDetail from "./Pages/ServiceDetail";
import Services from "./Pages/Services";

import Privacy from "./Pages/Privacy";
import Terms from "./Pages/Terms";

<<<<<<< HEAD
import StartYourProject from "./Pages/StartYourProject"; // <-- new

=======
>>>>>>> 05e41a57fbcc9d4c256146fdb6c976117aa0dc31
import "./App.css";

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen(prev => !prev);
  const closeMobile = () => setMobileOpen(false);

  return (
    <Router>
      {/* FONT AWESOME ICONS */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
      />

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="nav-left">
          <Link to="/" onClick={closeMobile} className="brand">
<<<<<<< HEAD
            <img src="images/logo-2.png" alt="Jenizo Logo" className="logo-img" />
=======
            <img src="images/j.png" alt="Jenizo Logo" className="logo-img" />
>>>>>>> 05e41a57fbcc9d4c256146fdb6c976117aa0dc31
          </Link>
        </div>

        {/* HAMBURGER MENU */}
        <button
          className={`menu-toggle ${mobileOpen ? "open" : ""}`}
          onClick={toggleMobile}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>

        {/* LINKS */}
        <ul className={`nav-links ${mobileOpen ? "active" : ""}`}>
          <li><Link to="/" onClick={closeMobile}>Home</Link></li>
          <li><Link to="/about" onClick={closeMobile}>About Us</Link></li>
          <li><Link to="/services" onClick={closeMobile}>Services</Link></li>
          <li><Link to="/careers" onClick={closeMobile}>Careers</Link></li>
          <li><Link to="/contact" onClick={closeMobile}>Contact</Link></li>
<<<<<<< HEAD

          {/* SPA route link for Start Your Project */}
          <li><Link to="/start-your-project" onClick={closeMobile}>Start Your Project</Link></li>
=======
>>>>>>> 05e41a57fbcc9d4c256146fdb6c976117aa0dc31
        </ul>
      </nav>

      {/* ROUTES */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/services" element={<Services />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />

        {/* Start Your Project route */}
        <Route path="/start-your-project" element={<StartYourProject />} />
      </Routes>

      {/* FOOTER */}
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
