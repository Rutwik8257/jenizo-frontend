// src/Pages/StartYourProject.js
import React from "react";
import "./start-your-project.css";

const TPL = `...`; // we'll use the same template as you had; below we reuse it programmatically

// (inline template string exact content)
const TEMPLATE = `
  <div class="start-project-wrap" id="startProjectWrap">
    <h1>Start Your Project</h1>
    <p class="intro">Share a few details — we'll review and get back within 1 business day.</p>

    <form id="startProjectForm" class="talk-form" novalidate>
      <div class="full-row">
        <label for="fullName">Full Name</label>
        <input id="fullName" name="fullName" type="text" placeholder="e.g., Raj Shekar" required />
        <div class="field-error" data-for="fullName"></div>
      </div>

      <div>
        <label for="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@company.com" required />
        <div class="field-error" data-for="email"></div>
      </div>

      <div>
        <label for="phone">Phone Number</label>
        <input id="phone" name="phone" type="text" placeholder="+91 93989 49451" required />
        <small class="note">Include country code if outside India.</small>
        <div class="field-error" data-for="phone"></div>
      </div>

      <div class="full-row">
        <label for="projectType">Project Type</label>
        <select id="projectType" name="projectType" required>
          <option value="">Select a project type</option>
          <option>Website Development</option>
          <option>Mobile App</option>
          <option>UI/UX Design</option>
          <option>Cloud Setup</option>
          <option>SEO Services</option>
          <option>Other</option>
        </select>
        <div class="field-error" data-for="projectType"></div>
      </div>

      <div class="full-row">
        <label for="budget">Estimated Project Budget</label>
        <select id="budget" name="budget" required>
          <option value="">Select a budget range</option>
          <option>₹20,000 - ₹50,000</option>
          <option>₹50,000 - ₹1,00,000</option>
          <option>₹1,00,000 - ₹3,00,000</option>
          <option>₹3,00,000+</option>
        </select>
        <div class="field-error" data-for="budget"></div>
      </div>

      <div class="full-row">
        <label for="description">Brief Project Description</label>
        <textarea id="description" name="description" rows="4" placeholder="Short description of the project (what you need, goals, must-have features)"></textarea>
        <div class="field-error" data-for="description"></div>
      </div>

      <div class="form-actions">
        <button type="button" class="reset-btn" id="resetBtn">Reset</button>
        <button type="submit" class="submit-btn" id="submitBtn">Submit Inquiry</button>
      </div>

      <div class="success-box" id="successBox" role="status" aria-live="polite" style="display:none;">
        <strong>Thanks —</strong> your inquiry has been submitted. We'll contact you soon.
      </div>

    </form>
  </div>
`;

function injectCss(href) {
  if (!document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

async function fetchText(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const txt = await r.text();
    if ((txt || "").trim().startsWith("<")) return null; // probably HTML error page
    return txt;
  } catch {
    return null;
  }
}

function ensurePlaceholder(container) {
  const id = "start-project-root";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    if (container && container.appendChild) container.appendChild(el);
    else document.body.appendChild(el);
  } else {
    if (container && el.parentNode !== container) container.appendChild(el);
  }
  return el;
}

function placeholderHasForm() {
  const root = document.getElementById("start-project-root");
  if (!root) return false;
  return !!(root.querySelector("#startProjectWrap") || root.querySelector("#startProjectForm"));
}

function attachHandlers(root) {
  const form = root.querySelector("#startProjectForm");
  if (!form) return;
  const successBox = root.querySelector("#successBox");
  const submitBtn = root.querySelector("#submitBtn");
  const resetBtn = root.querySelector("#resetBtn");

  const fallbackLocal = "http://localhost:8080";
  const apiBase = (window && window.__API_URL__) || process.env.REACT_APP_API_URL || fallbackLocal;
  const API_ENDPOINT = apiBase.replace(/\/$/, "") + "/api/inquiries";

  function clearErrors() {
    root.querySelectorAll(".field-error").forEach(n => (n.textContent = ""));
  }

  function validate() {
    clearErrors();
    const values = {
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      projectType: form.projectType.value,
      budget: form.budget.value,
      description: form.description ? form.description.value.trim() : ""
    };
    const errors = {};
    if (!values.fullName) errors.fullName = "Please enter your full name.";
    if (!values.email) errors.email = "Please enter your email.";
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Enter a valid email.";
    if (!values.phone) errors.phone = "Please enter your phone number.";
    else if (!/^[+0-9\s\-()]{7,30}$/.test(values.phone)) errors.phone = "Enter a valid phone number.";
    if (!values.projectType) errors.projectType = "Please select a project type.";
    if (!values.budget) errors.budget = "Please select a budget range.";
    Object.keys(errors).forEach(k => {
      const el = root.querySelector(`.field-error[data-for="${k}"]`);
      if (el) el.textContent = errors[k];
    });
    return { valid: Object.keys(errors).length === 0, values };
  }

  resetBtn.addEventListener("click", () => {
    form.reset();
    clearErrors();
    if (successBox) successBox.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Inquiry";
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (successBox) successBox.style.display = "none";
    const { valid, values } = validate();
    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const resp = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      if (!resp.ok) {
        let errText = "Failed to submit. Please try again.";
        try {
          const j = await resp.json();
          if (j && j.errors) {
            Object.keys(j.errors).forEach(k => {
              const el = root.querySelector(`.field-error[data-for="${k}"]`);
              if (el) el.textContent = j.errors[k];
            });
            errText = "Please correct the highlighted fields.";
          } else if (j && j.error) errText = j.error;
        } catch (e) { /* ignore */ }
        alert(errText);
        return;
      }

      if (successBox) successBox.style.display = "block";
      form.reset();
      submitBtn.textContent = "Submitted";
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Inquiry";
      }, 2000);
    } catch (err) {
      console.error("Network error:", err);
      alert("Network error. Please try again later.");
    } finally {
      if (!submitBtn.disabled) submitBtn.disabled = false;
    }
  });
}

export default function StartYourProject() {
  React.useEffect(() => {
    // try CSS candidates (harmless if 404)
    injectCss("/startyourproject.css");
    injectCss("/start-your-project.css");

    // try to fetch an external JS that might render the form; if not, fallback
    (async () => {
      const jsCandidates = ["/startyourproject.js", "/start-your-project.js", "/startyourproject.min.js"];
      for (const s of jsCandidates) {
        const txt = await fetchText(s);
        if (txt) {
          // inject script blob and let it run
          const blob = new Blob([txt], { type: "application/javascript" });
          const blobUrl = URL.createObjectURL(blob);
          const script = document.createElement("script");
          script.src = blobUrl;
          script.defer = true;
          script.onload = () => URL.revokeObjectURL(blobUrl);
          document.body.appendChild(script);
          // wait briefly to allow external script to render
          await new Promise((r) => setTimeout(r, 220));
          if (placeholderHasForm()) return;
        }
      }

      // fallback: inject template + handlers
      const container = document.getElementById("__start_project_container__");
      const root = ensurePlaceholder(container);
      if (!placeholderHasForm()) {
        root.innerHTML = TEMPLATE;
        attachHandlers(root);
        const sb = root.querySelector("#successBox");
        if (sb) sb.style.display = "none";
      }
    })();
  }, []);

  const title = React.createElement("h1", { className: "project-page-title", style: { marginBottom: 8 } }, "Start Your Project");
  const desc = React.createElement("p", { className: "project-page-desc", style: { marginBottom: 22 } }, "Fill the form below and we will get back to you shortly.");
  const wrapper = React.createElement("div", { id: "__start_project_container__" });

  return React.createElement("main", { style: { padding: 24 } },
    React.createElement("div", { style: { maxWidth: 980, margin: "0 auto" } }, title, desc, wrapper)
  );
}
