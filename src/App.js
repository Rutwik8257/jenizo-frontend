import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";

import AboutUs from "./Pages/AboutUs";
import Careers from "./Pages/Careers";
import Contact from "./Pages/Contact";
import Home from "./Pages/Home";
import Services from "./Pages/Services";

import Privacy from "./Pages/Privacy";
import Terms from "./Pages/Terms";


import "./App.css";

function App() {
  return (
    <Router>

      {/* FONT AWESOME ICONS */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
      />

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="left">
          <img
            src="images/j.png"
            alt="Jenizo Logo"
            className="logo-img"
          />
        </div>

        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/about">About Us</Link></li>
          <li><Link to="/services">Services</Link></li>
          <li><Link to="/careers">Careers</Link></li>
          <li><Link to="/contact">Contact</Link></li>
         
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
