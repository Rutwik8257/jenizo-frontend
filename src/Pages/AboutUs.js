import { useState } from "react";
import "./AboutUs.css";

export default function AboutUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    budget: "",
    contact: "",
    description: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    
    const API = process.env.REACT_APP_API_URL || "http://localhost:8080";
const apiUrl = `${API}/api/inquiries`;



    console.log("Submitting to:", apiUrl);
    console.log("Form Data:", formData);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        alert("Your project details have been submitted successfully!");
        setFormData({
          name: "",
          email: "",
          budget: "",
          contact: "",
          description: "",
        });
      } else {
        const text = await response.text();
        console.error("Error response:", text);
        alert("Failed to submit. Please try again.");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert("Error submitting form.");
    }
  };

  return (
    <div className="about-container">
      
      <div className="mv-section-new">
        <div className="mv-box">
          <img src="/images/mission.jpeg" alt="mission" className="mv-icon-new" />
          <h3>Our Mission</h3>
          <p>
            To empower businesses through innovative, scalable, and high-quality technology solutions.
          </p>
        </div>
        <div className="mv-box">
          <img src="/images/vission.jpeg" alt="vision" className="mv-icon-new" />
          <h3>Our Vision</h3>
          <p>
            To become a global leader in providing secure and future-ready digital solutions.
          </p>
        </div>
        <div className="mv-box">
          <img src="/images/diamond.jpeg" alt="values" className="mv-icon-new" />
          <h3>Our Values</h3>
          <p>
            Innovation, transparency, customer-first approach, and strong ethics.
          </p>
        </div>
      </div>

      <div className="different-section">
        <h2>Why JENIZO is Different</h2>
        <p>
          Jenizo delivers modern, clean, and high-performing digital experiences that help brands grow online. Every website is custom-built based on client needs, ensuring creativity with strong technology.
        </p>
        <p>
          We focus on speed, SEO, UI clarity, and performance. With transparent workflows, consistent updates, and reliable post-launch support, we ensure future-ready solutions for every business.
        </p>
      </div>


      <section className="services-mini">
        <h2 className="section-title">What We Do</h2>
        <div className="service-icons">
          <div className="service-item">
            <img src="/images/ux.jpeg" alt="Design" />
            <h3>UI/UX Design</h3>
          </div>
          <div className="service-item">
            <img src="/images/cloud.jpeg" alt="Cloud" />
            <h3>Cloud Solutions</h3>
          </div>
          <div className="service-item">
            <img src="/images/seo.jpeg" alt="SEO" />
            <h3>SEO Optimization</h3>
          </div>
        </div>
      </section>
       <section className="stats-section">
        <div className="stat-box">
          <h3>40+</h3>
          <p>Projects Delivered</p>
        </div>
        <div className="stat-box">
          <h3>20+</h3>
          <p>Happy Clients</p>
        </div>
        <div className="stat-box">
          <h3>98%</h3>
          <p>Satisfaction Rate</p>
        </div>
      </section>

      <div className="project-section">
        <h2>Connect with Us</h2>

        <p> Jenizo IT Tech Pvt Ltd</p>
        <p> Email: info@jenizo.in</p>
        <p> Contact : +91 8179785211</p>
        <p> Address: Plot:- 18/2, Huda Techno Enclave Rd, Phase 2, HITECH CITY, PINAKIN Building, 5th Floor , Hyderabad, Telangana 500081.</p>
        <a href="tel:+919876543210" className="call-btn">
            📞 Call Us Now
          </a>
        
      </div>
    </div>
  );
}
