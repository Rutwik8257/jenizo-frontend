import { useState } from "react";
import "./Contact.css";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  
  const [errors, setErrors] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    
    setErrors(prev => ({ ...prev, [e.target.name]: undefined }));
    setServerMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setServerMessage("");

    try {
      // add near top:
const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch(`${API}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    // Try to read JSON (server returns { errors } on 400)
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Server responded:", response.status, data);
      if (data && data.errors) {
        // display the first server validation message
        const firstKey = Object.keys(data.errors)[0];
        alert(data.errors[firstKey]);
      } else if (data && data.error) {
        alert(data.error);
      } else {
        alert("Failed to send message. Please check the form and try again.");
      }
      return;
    }

    // success
    setShowPopup(true);
    setForm({ name: "", email: "", phone: "", message: "" });
    setTimeout(() => setShowPopup(false), 3000);

  } catch (err) {
    console.error("Network error:", err);
    alert("Network error. Please try again later.");
  }
};

  return (
    <div className="contact-page">
      {/* CONTACT INFO */}
      <div className="contact-info">
        <div className="info-card">
          <i className="fas fa-phone-alt info-icon"></i>
          <h3>Phone Number</h3>
          <p>+91 8179785211</p>
        </div>

        <div className="info-card">
          <i className="fas fa-envelope info-icon"></i>
          <h3>Email</h3>
          <p>info@jenizo.in</p>
        </div>

        <div className="info-card">
          <i className="fas fa-map-marker-alt info-icon"></i>
          <h3>Office Location</h3>
          <a
            href="https://maps.app.goo.gl/bjrhSL3tQx1xg7rh7"
            target="_blank"
            rel="noopener noreferrer"
            className="location-link"
          >
            Hyderabad, Near Raidurg Metro Station
          </a>
        </div>

        <a
          className="info-card whatsapp-card"
          href="https://wa.me/919876543210"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fab fa-whatsapp info-icon whatsapp-icon"></i>
          <h3>WhatsApp</h3>
          <p>Chat / Call Us</p>
        </a>
      </div>

      {/* CONTACT FORM */}
      <div className="form-section">
        <h2>Send Us a Message</h2>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={form.name}
            onChange={handleChange}
            aria-invalid={!!errors.name}
            required
          />
          {errors.name && <div className="field-error">{errors.name}</div>}

          <input
            type="email"
            name="email"
            placeholder="Your Email"
            value={form.email}
            onChange={handleChange}
            aria-invalid={!!errors.email}
            required
          />
          {errors.email && <div className="field-error">{errors.email}</div>}

          <input
            type="text"
            name="phone"
            placeholder="Phone Number"
            value={form.phone}
            onChange={handleChange}
            aria-invalid={!!errors.phone}
            required
          />
          {errors.phone && <div className="field-error">{errors.phone}</div>}

          <textarea
            name="message"
            placeholder="Your Message"
            value={form.message}
            onChange={handleChange}
            aria-invalid={!!errors.message}
            required
          ></textarea>
          {errors.message && <div className="field-error">{errors.message}</div>}

          {serverMessage && <div className="server-message">{serverMessage}</div>}

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Sending..." : "Submit"}
          </button>
        </form>

        {showPopup && <div className="popup-message">Message sent successfully!</div>}
      </div>
    </div>
  );
}
