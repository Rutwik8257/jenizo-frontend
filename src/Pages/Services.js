// src/Pages/Services.js
import { Link } from "react-router-dom";
import "./Services.css";

const services = [
  {
    slug: "mobile-app-development",
    title: "Mobile App Development",
    short: "We create fast, user-friendly mobile apps for Android and iOS.",
    img: "/images/appdev.jpeg",
  },
  {
    slug: "website-development",
    title: "Website Development",
    short: "We build modern, responsive, and SEO-friendly websites.",
    img: "/images/webdev.jpeg",
  },
  {
    slug: "ui-ux-design",
    title: "UI/UX Designing",
    short: "We design clean, intuitive interfaces for a better user experience.",
    img: "/images/uidev.jpeg",
  },
  {
    slug: "ui-automation",
    title: "UI Automation",
    short: "We automate UI testing to ensure smooth and error-free performance.",
    img: "/images/uiautomation.jpeg",
  },
  {
    slug: "digital-marketing",
    title: "Digital Marketing",
    short: "We help businesses grow online with targeted digital strategies.",
    img: "/images/digitalmarketing.jpeg",
  },
  {
    slug: "ecommerce-development",
    title: "E-Commerce Development",
    short: "We craft strong, memorable visual identities for brands.",
    img: "/images/ecommerce.jpeg",
  },
];

export default function Services() {
  return (
    <div className="services-page">
      <h1 className="services-title">Our Services</h1>

      <div className="services-grid">
        {services.map((s) => (
          <div className="service-card" key={s.slug}>
            <img src={s.img} alt={s.title} />
            <h3>{s.title}</h3>
            <p>{s.short}</p>

            <div className="card-actions">
              <Link to={`/services/${s.slug}`} className="view-more-btn">
                View more
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
