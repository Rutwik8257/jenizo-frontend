// src/Pages/ApplicationForm.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ApplicationForm.css";

export default function ApplicationForm() {
  const navigate = useNavigate();
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
    github: ""
  });
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // fill email from logged-in user if available
  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) {
        const user = JSON.parse(u);
        if (user.email) setForm(prev => ({ ...prev, email: user.email }));
      }
    } catch {}
  }, []);

  // If the Google Form confirmation link returns with ?submitted=1
  useEffect(() => {
    const qp = new URLSearchParams(window.location.search);
    if (qp.get("submitted") === "1") {
      // logout the user and clear awaiting flag
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("awaiting_submission");
      window.dispatchEvent(new Event("authChanged"));
      setInfo("Thanks — your application was received. You have been logged out.");
      // clear query param
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      setTimeout(() => navigate("/login"), 2500);
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Google Form base (use your actual prefill base)
  const GOOGLE_FORM_BASE = "https://docs.google.com/forms/d/e/1FAIpQLSciNNPc24HpQRVrS7ZsNEn6riJm5LFoVUc5Idz3rFH5DBhBKw/viewform";
  const ENTRY = {
    fullName: "entry.114660488",
    email: "entry.417408789",
    phone: "entry.248848093",
    college: "entry.532216682",
    cgpa: "entry.1878924051",
    skills: "entry.1938146617",
    domain: "entry.1974268023",
    github: "entry.000000000" // replace if you have an entry id for github
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // basic validation
    if (!form.fullName || !form.email || !form.domain) {
      setError("Please fill required fields.");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    params.append("usp", "pp_url");
    params.append(ENTRY.fullName, form.fullName);
    params.append(ENTRY.email, form.email);
    params.append(ENTRY.phone, form.phone);
    params.append(ENTRY.college, form.college);
    params.append(ENTRY.cgpa, form.cgpa);
    params.append(ENTRY.skills, form.skills);
    params.append(ENTRY.domain, form.domain === "other" ? form.otherDomain : form.domain);
    if (ENTRY.github) params.append(ENTRY.github, form.github);

    const finalURL = `${GOOGLE_FORM_BASE}?${params.toString()}`;

    // mark awaiting submission so we know user opened the Google Form from our flow
    localStorage.setItem("awaiting_submission", "1");

    // Open Google Form in new tab
    window.open(finalURL, "_blank");

    setInfo("Google Form opened in a new tab. After submitting, please click the 'Return to Jenizo' link or visit Jenizo to complete (you will be logged out automatically).");
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

        {/* Full Name */}
        <div className="form-card">
          <label className="question">Full Name <span className="required">*</span></label>
          <input name="fullName" type="text" className="text-input" placeholder="Your answer" value={form.fullName} onChange={handleChange} />
        </div>

        {/* Email */}
        <div className="form-card">
          <label className="question">Email Address <span className="required">*</span></label>
          <input name="email" type="email" className="text-input" placeholder="Your answer" value={form.email} onChange={handleChange} />
        </div>

        {/* Phone */}
        <div className="form-card">
          <label className="question">Phone Number</label>
          <input name="phone" type="text" className="text-input" placeholder="Your answer" value={form.phone} onChange={handleChange} />
        </div>

        {/* College */}
        <div className="form-card">
          <label className="question">College/University Name</label>
          <input name="college" type="text" className="text-input" placeholder="Your answer" value={form.college} onChange={handleChange} />
        </div>

        {/* CGPA */}
        <div className="form-card">
          <label className="question">CGPA/Percentage</label>
          <input name="cgpa" type="text" className="text-input" placeholder="Your answer" value={form.cgpa} onChange={handleChange} />
        </div>

        {/* Degree */}
        <div className="form-card">
          <label className="question">Degree/Program</label>
          <input name="degree" type="text" className="text-input" placeholder="Your answer" value={form.degree} onChange={handleChange} />
        </div>

        {/* Skills */}
        <div className="form-card">
          <label className="question">Technical Skills</label>
          <input name="skills" type="text" className="text-input" placeholder="E.g., React, Node, Python" value={form.skills} onChange={handleChange} />
        </div>

        {/* Domain */}
        <div className="form-card">
          <label className="question">Preferred Internship Domain <span className="required">*</span></label>
          <div className="radio-group">
            {["Web Development","App Development","QA Tester","DevOps Engineer"].map(d => (
              <label key={d}>
                <input type="radio" name="domain" value={d} checked={form.domain === d} onChange={handleChange} />
                {" "}{d}
              </label>
            ))}

            <label className="other-option">
              <input type="radio" name="domain" value="other" checked={form.domain === "other"} onChange={handleChange} /> Other:
              <input name="otherDomain" className="other-input" placeholder="Your answer" value={form.otherDomain} onChange={handleChange} />
            </label>
          </div>
        </div>

        {/* Resume note */}
        <div className="form-card">
          <label className="question">Upload Resume ( PDF Only )</label>
          <input type="file" className="file-input" disabled title="Please attach your resume on the Google Form after it opens" />
          <p style={{ fontSize: 12, color: "#666" }}>Resume upload is disabled here — attach it on the Google Form page.</p>
        </div>

        {/* GitHub */}
        <div className="form-card">
          <label className="question">Portfolio / GitHub Link (Optional)</label>
          <input name="github" type="text" className="text-input" placeholder="Your answer" value={form.github} onChange={handleChange} />
        </div>

        <div className="form-card submit-card">
          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? "Opening Google Form..." : "Submit — Open Google Form"}
          </button>
          <p className="powered-by">Never submit passwords through this form.</p>
        </div>

        {error && <div className="form-card" style={{ borderLeft: "4px solid #e74c3c" }}><p style={{ color: "#e74c3c" }}>{error}</p></div>}
        {info && <div className="form-card" style={{ borderLeft: "4px solid #2ecc71" }}><p style={{ color: "#2ecc71" }}>{info}</p></div>}
      </form>
    </div>
  );
}
