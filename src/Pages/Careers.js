// Careers.js

import { useNavigate } from "react-router-dom";
import "./Careers.css";

export default function Careers() {
  const navigate = useNavigate();

  // Always go to login first
  const handleApply = (position) => {
    navigate("/login", { state: { position } }); // pass position to login page
  };

  return (
    <div className="careers-page">
      <section className="careers-top">
        <h1>Careers at Jenizo</h1>
        <p>
          Build, innovate, and grow with a passionate team. At Jenizo, your ideas matter,
          your work creates impact, and your career moves forward with purpose.
        </p>
      </section>

      <div className="image-banner">
        <img src="/images/lap.jpeg" alt="career banner" />
      </div>

      <section className="why-join">
        <h2>Why Work With Us?</h2>
        <div className="underline"></div>
        <p>
          Nioos is not just a workplace — it’s a space where innovation thrives and talent grows.
          From collaborative teams to cutting-edge projects, we encourage creativity and support
          continuous learning. We value transparency, flexibility, and a culture where everyone
          feels appreciated.
        </p>

        <div className="why-cards">
          <div className="why-card">
            <h3>🌱 Growth Opportunities</h3>
            <p>Upskill with real projects, training sessions, and mentorship programs.</p>
          </div>
          <div className="why-card">
            <h3>🤝 Supportive Culture</h3>
            <p>Work with leaders who listen, guide, and value your contribution.</p>
          </div>
          <div className="why-card">
            <h3>💼 Flexible Workspace</h3>
            <p>Balance your personal and work life with hybrid work options.</p>
          </div>
          <div className="why-card">
            <h3>🚀 Modern Technology</h3>
            <p>Work using the latest tools and tech stacks to stay industry-ready.</p>
          </div>
        </div>
      </section>

      <div className="image-banner">
        <img src="/images/icons.jpeg" alt="contact banner" />
      </div>

      <section className="openings">
        <h2>Current Open Positions</h2>
        <div className="underline"></div>

        <div className="job-list">
          {[
            { title: "Frontend Developer", desc: "React.js • JavaScript • UI/UX • Responsive Design" },
            { title: "Backend Developer", desc: "Spring Boot • Java • REST APIs • Microservices" },
            { title: "HR Executive", desc: "Recruitment • Employee Handling • Payroll Basics" },
            { title: "Mobile App Developer", desc: "Flutter • Android • iOS • UI Components" },
            { title: "QA Tester", desc: "Manual Testing • Automation Basics • Bug Tracking" },
            { title: "Application Developer", desc: "Figma • Wireframes • Prototyping • User Research" },
            { title: "DevOps Engineer", desc: "AWS • CI/CD Pipelines • Docker • Monitoring Tools" },
            { title: "UI/UX Designer", desc: "Figma • Prototyping • Wireframing • Design Systems" },
          ].map((job, index) => (
            <div className="job-card" key={index}>
              <h3>{job.title}</h3>
              <p>{job.desc}</p>
              <button onClick={() => handleApply(job.title)}>Apply Now</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
