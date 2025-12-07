

import { Link, useParams } from "react-router-dom";
import "./ServiceDetail.css";


const SERVICE_CONTENT = {
  "mobile-app-development": {
    title: "Mobile App Development",
    img: "/images/appdev.jpeg",
    intro:
      "We develop scalable, secure, and user-friendly mobile applications designed to deliver seamless digital experiences...",
    offers: [
      "Android & iOS app development",
      "UI/UX design for mobile interfaces",
      "API & backend development",
      "App optimization & performance tuning",
      "App maintenance & updates",
      "Deployment on Google Play & App Store",
    ],
    reasons: [
      "Clean, modern, and intuitive user experience",
      "High performance & security",
      "Tailored to your business goals",
      "Fast development cycle",
      "Scalable architecture for future growth",
    ],
  },

  "website-development": {
    title: "Website Development",
    img: "/images/webdev.jpeg",
    intro:
      "We build modern, responsive, and SEO-friendly websites tailored to your business needs...",
    offers: [
      "Modern and responsive web design",
      "SEO-friendly architecture",
      "Fast, secure, and scalable websites",
      "Custom features & integrations",
      "CMS setup",
      "Ongoing maintenance",
    ],
    reasons: [
      "Professional UI/UX design",
      "Optimized for performance & SEO",
      "Tailored solutions",
      "Clean and reliable code",
    ],
  },

  "ui-ux-design": {
    title: "UI/UX Designing",
    img: "/images/uidev.jpeg",
    intro:
      "We design clean, intuitive interfaces that deliver a seamless and meaningful user experience...",
    offers: [
      "UI design",
      "UX design",
      "Wireframing",
      "Prototyping",
      "Design systems",
      "UX research",
    ],
    reasons: [
      "Modern and elegant design style",
      "Focus on clarity and usability",
      "Pixel-perfect design",
      "Enhances engagement and satisfaction",
    ],
  },

  "ui-automation": {
    title: "UI Automation",
    img: "/images/uiautomation.jpeg",
    intro:
      "We automate UI testing to ensure smooth, consistent, and error-free performance across your applications...",
    offers: [
      "Automated UI testing",
      "Cross-browser compatibility",
      "Regression automation",
      "Framework setup",
      "CI/CD integration",
      "Bug tracking",
    ],
    reasons: [
      "Faster releases",
      "Higher accuracy",
      "Early bug detection",
      "Stable long-term results",
      "Improved reliability",
    ],
  },

  "digital-marketing": {
    title: "Digital Marketing",
    img: "/images/digitalmarketing.jpeg",
    intro:
      "We help businesses grow online with targeted digital strategies that drive visibility and conversions...",
    offers: [
      "Social media marketing",
      "SEO",
      "Performance ads",
      "Content creation",
      "Email campaigns",
      "Analytics tracking",
    ],
    reasons: [
      "ROI-focused strategies",
      "Brand growth",
      "Data-driven decisions",
      "Creative content",
      "Transparent reporting",
    ],
  },

  "ecommerce-development": {
    title: "E-Commerce Development",
    img: "/images/ecommerce.jpeg",
    intro:
      "We build powerful, secure, and user-friendly e-commerce platforms that help businesses sell online confidently...",
    offers: [
      "Custom eCommerce websites",
      "Shopify/WooCommerce",
      "Payment gateway integration",
      "Product catalog setup",
      "Checkout optimization",
      "Admin dashboard",
      "SEO for eCommerce",
    ],
    reasons: [
      "Smooth buying experience",
      "Secure & scalable",
      "Designed to increase sales",
      "Easy backend management",
      "Built for your business model",
    ],
  },
};

export default function ServiceDetail() {
  const { slug } = useParams();
  const content = SERVICE_CONTENT[slug];

  if (!content) {
    return (
      <main className="service-detail-container">
        <h2>Service not found</h2>
        <p>
          The requested service was not found.{" "}
          <Link to="/services">Back to services</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="service-detail-container">
      <header className="service-header">
        <h1 style={{ color: "#00eaff", marginBottom: 6 }}>{content.title}</h1>
        <p
          style={{ color: "#d6f3ff", maxWidth: 820, margin: "0 auto" }}
        >
          {content.intro}
        </p>
      </header>

      {content.img && (
        <div className="service-image-wrapper">
          <img
            src={content.img}
            alt={content.title}
            className="service-image"
          />
        </div>
      )}

      <section className="service-section">
        <h3 style={{ color: "#bff6ff" }}>What We Offer</h3>
        <ul>
          {content.offers.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>

        <h3 style={{ marginTop: 16, color: "#bff6ff" }}>Why Choose Us</h3>
        <ul>
          {content.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        <div style={{ marginTop: 22, display: "flex", gap: 12 }}>
          <Link to="/start-your-project" className="view-more-btn">
            Start your project
          </Link>

          <Link
            to="/contact"
            style={{ color: "#cfefff", textDecoration: "underline" }}
          >
            Contact sales
          </Link>
        </div>
      </section>
    </main>
  );
}
