// src/Pages/ApplicationForm.jsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./ApplicationForm.css";

export default function ApplicationForm() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    college: "",
    cgpa: "",
    degree: "",
    skills: "",
    domain: "",
    otherDomain: "",
    github: "",
  });

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // your Google form base (use your full real URL)
  const GOOGLE_FORM_BASE =
    "https://docs.google.com/forms/d/e/1FAIpQLSciNNPc24HpQRVrS7ZsNEn6riJm5LFoVUc5Idz3rFH5DBhBKw/viewform";

  const ENTRY = {
    fullName: "entry.114660488",
    email: "entry.417408789",
    phone: "entry.248848093",
    college: "entry.532216682",
    cgpa: "entry.1878924051",
    skills: "entry.1938146617",
    domain: "entry.1974268023",
  };

  // detect returned users from Google Form confirmation ( ?submitted=1 )
  useEffect(() => {
    const qp = new URLSearchParams(window.location.search);
    if (qp.get("submitted") === "1") {
      // log them out via context so navbar updates
      logout();
      // clear awaiting flag too
      localStorage.removeItem("awaiting_submission");

      setInfo("Thanks — your application was received. You have been logged out.");
      // clear query param so refresh doesn't repeat
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      // redirect to login after short delay
      setTimeout(() => {
        navigate("/login");
      }, 1900);
    }
  }, [logout, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    if (!form.fullName.trim()) return "Full name is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email.";
    if (!form.domain) return "Choose a preferred internship domain.";
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);

    const params = new URLSearchParams();
    params.append("usp", "pp_url");

    params.append(ENTRY.fullName, form.fullName || "");
    params.append(ENTRY.email, form.email || "");
    params.append(ENTRY.phone, form.phone || "");
    params.append(ENTRY.college, form.college || "");
    params.append(ENTRY.cgpa, form.cgpa || "");
    params.append(ENTRY.skills, form.skills || "");
    const domainValue = form.domain === "other" ? form.otherDomain : form.domain;
    params.append(ENTRY.domain, domainValue || "");

    const finalURL = `${GOOGLE_FORM_BASE}?${params.toString()}`;

    // mark that the user opened the Google Form from our flow
    localStorage.setItem("awaiting_submission", "1");

    // open in new tab so user can attach resume & submit
    window.open(finalURL, "_blank");

    setInfo(
      "Google Form opened in a new tab with your answers prefilled. Please attach your resume on the Google Form (if required) and submit the form there. Then click the 'Return to Jenizo' link on the confirmation page to finish."
    );

    setLoading(false);
  };

  return (
    <div className="form-bg">
      <div className="banner" />

      <form className="form-container" onSubmit={handleSubmit}>
        <div className="form-card">
          <h2 className="form-title">JENIZO IT TECH – Internship Application Form</h2>
          <p className="form-desc">
            Thank you for your interest in an internship at JENIZO IT TECH PVT Ltd.
            Your answers will be transferred to our Google Form for final submission.
          </p>

          <p className="required-note">* Indicates required question</p>
        </div>

        <div className="form-card">
          <label className="question">
            Full Name <span className="required">*</span>
          </label>
          <input
            name="fullName"
            type="text"
            className="text-input"
            placeholder="Your answer"
            value={form.fullName}
            onChange={handleChange}
          />
        </div>

        <div className="form-card">
          <label className="question">
            Email Address <span className="required">*</span>
          </label>
          <input
            name="email"
            type="email"
            className="text-input"
            placeholder="Your answer"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-card">
          <label className="question">Phone Number</label>
          <input
            name="phone"
            type="text"
            className="text-input"
            placeholder="Your answer"
            value={form.phone}
            onChange={handleChange}
          />
        </div>

        <div className="form-card">
          <label className="question">College/University Name</label>
          <input
            name="college"
            type="text"
            className="text-input"
            placeholder="Your answer"
            value={form.college}
            onChange={handleChange}
          />
        </div>

        <div className="form-card">
          <label className="question">CGPA/Percentage</label>
          <input
            name="cgpa"
            type="text"
            className="text-input"
            placeholder="Your answer"
            value={form.cgpa}
            onChange={handleChange}
          />
        </div>

        <div className="form-card">
          <label className="question">Degree/Program</label>
          <input
            name="degree"
            type="text"
            className="text-input"
            placeholder="Your answer"
            value={form.degree}
            onChange={handleChange}
          />
        </div>

        <div className="form-card">
          <label className="question">Technical Skills</label>
          <input
            name="skills"
            type="text"
            className="text-input"
            placeholder="E.g., React, Node, Python"
            value={form.skills}
            onChange={handleChange}
          />
        </div>

        <div className="form-card">
          <label className="question">
            Preferred Internship Domain <span className="required">*</span>
          </label>

          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="domain"
                value="Web Development"
                checked={form.domain === "Web Development"}
                onChange={handleChange}
              />{" "}
              Web Development
            </label>
            <label>
              <input
                type="radio"
                name="domain"
                value="App Development"
                checked={form.domain === "App Development"}
                onChange={handleChange}
              />{" "}
              App Development
            </label>
            <label>
              <input
                type="radio"
                name="domain"
                value="QA Tester"
                checked={form.domain === "QA Tester"}
                onChange={handleChange}
              />{" "}
              QA Tester
            </label>
            <label>
              <input
                type="radio"
                name="domain"
                value="DevOps Engineer"
                checked={form.domain === "DevOps Engineer"}
                onChange={handleChange}
              />{" "}
              DevOps Engineer
            </label>

            <label className="other-option">
              <input
                type="radio"
                name="domain"
                value="other"
                checked={form.domain === "other"}
                onChange={handleChange}
              />{" "}
              Other:
              <input
                name="otherDomain"
                className="other-input"
                placeholder="Your answer"
                value={form.otherDomain}
                onChange={handleChange}
              />
            </label>
          </div>
        </div>

        <div className="form-card">
          <label className="question">Upload Resume ( PDF Only )</label>
          <input
            type="file"
            className="file-input"
            disabled
            title="Please attach your resume on the Google Form after it opens"
          />
          <p style={{ fontSize: 12, color: "#666" }}>
            Resume upload is disabled here. After the Google Form opens, attach your resume there.
          </p>
        </div>

        <div className="form-card">
          <label className="question">Portfolio / GitHub Link (Optional)</label>
          <input
            name="github"
            type="text"
            className="text-input"
            placeholder="Your answer"
            value={form.github}
            onChange={handleChange}
          />
        </div>

        <div className="form-card submit-card">
          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? "Opening Google Form..." : "Submit — Open Google Form"}
          </button>
          <p className="powered-by">Never submit passwords through this form.</p>
        </div>

        {error && (
          <div className="form-card" style={{ borderLeft: "4px solid #e74c3c" }}>
            <p style={{ color: "#e74c3c" }}>{error}</p>
          </div>
        )}

        {info && (
          <div className="form-card" style={{ borderLeft: "4px solid #2ecc71" }}>
            <p style={{ color: "#2ecc71" }}>{info}</p>
          </div>
        )}
      </form>
    </div>
  );
}
