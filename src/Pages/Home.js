import React from "react";
import "./Home.css";

export default function Home() {
  return (
    <>
      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-card">
          <h1>Empowering Digital Transformation</h1>
          <p>Your trusted partner for IT, Cloud, AI, and Custom Software Solutions</p>
          <a href="/services" className="hero-btn">Explore Services</a>
        </div>
      </section>


      {/* FEATURES SECTION */}
      <section className="features">
        <h2>Our Core Features</h2>
        <div className="features-container">
          <div className="feature-card">
            <h3>Cloud Solutions</h3>
            <p>Scalable cloud infrastructure for modern businesses.</p>
          </div>
          <div className="feature-card">
            <h3>AI & Automation</h3>
            <p>Leverage AI to automate tasks and enhance efficiency.</p>
          </div>
          <div className="feature-card">
            <h3>Custom Software</h3>
            <p>Tailored software solutions to meet your unique needs.</p>
          </div>
        </div>
      </section>

      {/* CLIENT TESTIMONIALS */}
      <section className="testimonials">
        <h2>What Our Clients Say</h2>
        <div className="testimonial-cards">
          <div className="testimonial-card">
            <img
              src="https://randomuser.me/api/portraits/men/32.jpg"
              alt="John Doe"
              className="testimonial-img"
            />
            <p>"Exceptional service and support. They transformed our business."</p>
            <h4>- John Doe, CEO</h4>
          </div>
          <div className="testimonial-card">
            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              alt="Jane Smith"
              className="testimonial-img"
            />
            <p>"Innovative solutions and highly skilled team. Highly recommended."</p>
            <h4>- Jane Smith, CTO</h4>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="cta">
        <h2>Ready to Transform Your Business?</h2>
        <a href="/contact" className="cta-btn">Get in Touch</a>
      </section>
    </>
  );
}

