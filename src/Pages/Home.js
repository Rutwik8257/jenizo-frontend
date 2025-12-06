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

      {/* TRUST INDICATORS SECTION */}
     {/* LEADERSHIP SECTION (Replacing Trust Indicators) */}
<section className="trust">
  <h2>Our Leadership</h2>

  <div className="trust-box-container">

    {/* Founder */}
    <div className="trust-box">
      <img 
        src="images/elisharaju.jpeg"
        alt="Founder"
        className="leader-img"
      />
      <h3>P. Elisharaju</h3>
      <p className="role">Founder</p>
      <p>Visionary leader driving innovation and digital transformation.</p>
    </div>

    {/* CEO */}
    <div className="trust-box">
      <img 
        src="images/vinpaul.jpeg"
        alt="CEO"
        className="leader-img"
      />
      <h3>PIDIKELA VINPAUL</h3>
      <p className="role">CEO</p>
      <p>Leading Jenizo with strategy, clarity, and a strong technology vision.</p>
    </div>

    {/* HR */}
    <div className="trust-box">
      <img 
        src="images/bharath.jpeg" 
        alt="HR"
        className="leader-img"
      />
      <h3>GUGULOTH BHARATH</h3>
      <p className="role">Operations Lead</p>
      <p>Ensuring employee growth, culture, and smooth operations.</p>
    </div>

  </div>
</section>


        <section className="team-section">
        <h2 className="section-title">Leadership & Team</h2>

        <div className="team-grid">
          
          {/* EMPLOYEE 1 - VARDHAN */}
          <div className="team-card reverse">
            <div className="team-left">
              <h3 className="member-name">Vardhan – Design</h3>
              <p className="member-desc">
                Creative UI/UX designer transforming ideas into visually
                stunning, user-friendly digital experiences.
              </p>
            </div>

            <div className="team-right">
              <img
                src="images/vardhan.jpeg"
                alt="Designer Vardhan"
                className="team-img"
              />
            </div>
          </div>
<div className="team-card">
  <div className="team-left">
    <h3 className="member-name">R. Sruthi – Design</h3>
    <p className="member-desc">
      Passionate designer focused on crafting clean, modern, and
      user-centered visual experiences for web and mobile.
    </p>
  </div>

  <div className="team-right">
    <img
      src="images/shruthi.jpeg"
      alt="Designer Sruthi"
      className="team-img"
    />
  </div>
</div>


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

