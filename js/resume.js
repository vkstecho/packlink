/**
 * Make my Resume – simple dropdowns & ticks for shop-floor users.
 * Templates lazy-loaded from resume-templates.js
 */
import { $, $$, esc, toast } from "./utils.js";

const STEPS = ["Template", "Personal", "Experience", "Education", "Skills", "Preview"];

let TEMPLATES = [];
let HEADLINE_HINTS = {};
let SKILL_HINTS = {};
let SUMMARY_HINTS = {};
let CERT_HINTS = "";
let JOB_TITLES = [];
let HEADLINES = [];
let LOCATIONS = [];
let DEGREES = [];
let YEARS = [];
let YEAR_END = [];
let SKILL_OPTIONS = [];
let SKILL_LEVELS = ["Basic", "Good", "Expert"];
let CERT_OPTIONS = [];
let ACHIEVEMENT_OPTIONS = [];
let templatesReady = null;

function loadTemplates() {
  if (!templatesReady) {
    templatesReady = import("./resume-templates.js").then((mod) => {
      TEMPLATES = mod.TEMPLATES;
      HEADLINE_HINTS = mod.HEADLINE_HINTS || {};
      SKILL_HINTS = mod.SKILL_HINTS || {};
      SUMMARY_HINTS = mod.SUMMARY_HINTS || {};
      CERT_HINTS = mod.CERT_HINTS || "";
      JOB_TITLES = mod.JOB_TITLES || [];
      HEADLINES = mod.HEADLINES || [];
      LOCATIONS = mod.LOCATIONS || [];
      DEGREES = mod.DEGREES || [];
      YEARS = mod.YEARS || [];
      YEAR_END = mod.YEAR_END || [];
      SKILL_OPTIONS = mod.SKILL_OPTIONS || [];
      SKILL_LEVELS = mod.SKILL_LEVELS || ["Basic", "Good", "Expert"];
      CERT_OPTIONS = mod.CERT_OPTIONS || [];
      ACHIEVEMENT_OPTIONS = mod.ACHIEVEMENT_OPTIONS || [];
      return mod;
    });
  }
  return templatesReady;
}

const defaultData = () => ({
  template: "packops",
  fullName: "",
  headline: "",
  headlineOther: "",
  email: "",
  phone: "",
  location: "",
  locationOther: "",
  linkedin: "",
  summary: "",
  experience: [{ company: "", title: "", titleOther: "", start: "", end: "Present", bullets: "", picks: [] }],
  education: [{ school: "", degree: "", degreeOther: "", year: "", detail: "" }],
  skillPicks: [],
  skillsOther: "",
  skillsOtherLevel: "Good",
  certPicks: [],
  certificationsOther: "",
});

let data = defaultData();
let step = 0;
let meRef = null;

function optLabel(v) {
  if (v && typeof v === "object") return v.label || "";
  return String(v ?? "");
}
function optIcon(v) {
  if (v && typeof v === "object") return v.icon || "";
  return "";
}
function optDisplay(v) {
  const ic = optIcon(v);
  const lb = optLabel(v);
  return ic ? `${ic}  ${lb}` : lb;
}
function selOptions(list, selected, placeholder) {
  const opts = [`<option value="">${esc(placeholder || "— Select —")}</option>`];
  list.forEach((v) => {
    const label = optLabel(v);
    opts.push(`<option value="${esc(label)}" ${selected === label ? "selected" : ""}>${esc(optDisplay(v))}</option>`);
  });
  return opts.join("");
}

function isOther(v) {
  return v && String(v).startsWith("Other");
}

export async function initResume(me) {
  meRef = me;
  const root = $("#resumeRoot");
  if (root) root.innerHTML = `<div class="empty">Loading easy resume form…</div>`;

  try {
    await loadTemplates();
  } catch (e) {
    console.error(e);
    if (root) root.innerHTML = `<div class="empty">Could not load form. Check internet and try again.</div>`;
    toast("Failed to load resume form");
    return;
  }

  if (me) {
    data.fullName = data.fullName || me.name || "";
    data.phone = data.phone || me.id || "";
    if (me.designation && !data.headline) {
      const match = HEADLINES.find((h) => optLabel(h).toLowerCase().includes(String(me.designation).toLowerCase()));
      if (match) data.headline = optLabel(match);
      else {
        data.headline = "Other (type below)";
        data.headlineOther = me.designation;
      }
    }
    if (me.company && !data.experience[0].company) {
      data.experience[0].company = me.company;
      if (me.designation) {
        const tm = JOB_TITLES.find((t) => optLabel(t).toLowerCase() === String(me.designation).toLowerCase());
        if (tm) data.experience[0].title = optLabel(tm);
        else {
          data.experience[0].title = "Other (type below)";
          data.experience[0].titleOther = me.designation;
        }
      }
    }
  }
  render();
}

export function renderResumePage() {
  if (TEMPLATES.length) render();
  else initResume(meRef);
}

function render() {
  const root = $("#resumeRoot");
  if (!root) return;

  const stepsHtml = STEPS.map(
    (s, i) => `<span class="${i === step ? "on" : i < step ? "done" : ""}">${i + 1}. ${s}</span>`
  ).join("");

  let body = "";
  if (step === 0) body = renderTemplateStep();
  else if (step === 1) body = renderPersonalStep();
  else if (step === 2) body = renderExperienceStep();
  else if (step === 3) body = renderEducationStep();
  else if (step === 4) body = renderSkillsStep();
  else body = renderPreviewStep();

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  root.innerHTML = `
    <div class="resume-hero">
      <h3>Make my Resume</h3>
      <p>Simple form — mostly <b>select from list</b>. Little typing needed.</p>
    </div>
    <div class="wizard-steps">${stepsHtml}</div>
    <div class="card" id="wizardBody">${body}</div>
    <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
      ${!isFirst ? `<button type="button" class="btn ghost" id="resBack" style="width:auto;padding:12px 20px">← Back</button>` : ""}
      <button type="button" class="btn" id="resNext" style="width:auto;padding:12px 24px;flex:1;max-width:280px">${isLast ? "Download / Print" : "Continue →"}</button>
    </div>
  `;

  bindStepEvents();
}

function renderTemplateStep() {
  return `
    <h3 style="margin:0 0 4px;font-size:16px">1. Choose resume style</h3>
    <p style="color:var(--muted);font-size:13px;margin:0 0 12px">Tap one box. You can change later.</p>
    <div class="tpl-grid">
      ${TEMPLATES.map(
        (t) => `
        <button type="button" class="tpl-card ${data.template === t.id ? "on" : ""}" data-tpl="${t.id}">
          <div class="tpl-preview"><div class="mini">${t.mini}</div></div>
          <div class="t">${esc(t.name)}</div>
          <div class="s">${esc(t.desc)}</div>
        </button>`
      ).join("")}
    </div>
  `;
}

function renderPersonalStep() {
  const showHeadlineOther = isOther(data.headline);
  const showLocOther = isOther(data.location);
  return `
    <h3 style="margin:0 0 8px;font-size:16px">2. About you</h3>
    <p style="color:var(--muted);font-size:13px;margin:0 0 14px">Select from the list wherever you can.</p>

    <div class="field"><label>Full name *</label>
      <input id="rName" maxlength="80" value="${esc(data.fullName)}" placeholder="Your full name"></div>

    <div class="field"><label>Your role / headline *</label>
      <select id="rHeadline">${selOptions(HEADLINES, data.headline, "— Select your role —")}</select></div>
    <div class="field ${showHeadlineOther ? "" : "hide"}" id="rHeadlineOtherWrap">
      <label>Type your role</label>
      <input id="rHeadlineOther" value="${esc(data.headlineOther)}" placeholder="e.g. Senior Operator – Extrusion">
    </div>

    <div class="field"><label>Email *</label>
      <input id="rEmail" type="email" value="${esc(data.email)}" placeholder="you@gmail.com"></div>

    <div class="field"><label>Phone</label>
      <input id="rPhone" type="tel" value="${esc(data.phone)}" placeholder="+91 …"></div>

    <div class="field"><label>City / location</label>
      <select id="rLoc">${selOptions(LOCATIONS, data.location, "— Select city —")}</select></div>
    <div class="field ${showLocOther ? "" : "hide"}" id="rLocOtherWrap">
      <label>Type your city</label>
      <input id="rLocOther" value="${esc(data.locationOther)}" placeholder="City, State">
    </div>

    <div class="field"><label>LinkedIn (optional)</label>
      <input id="rLink" value="${esc(data.linkedin)}" placeholder="Leave blank if none"></div>

    <div class="field"><label>Short about you (optional)</label>
      <textarea id="rSum" rows="3" maxlength="500" placeholder="Or tap button below to fill">${esc(data.summary)}</textarea>
      <button type="button" class="link" id="useSummaryHint" style="font-size:13px;padding:6px 0">Fill suggested text</button>
    </div>
  `;
}

function renderExperienceStep() {
  const blocks = data.experience
    .map((ex, i) => {
      const showTitleOther = isOther(ex.title);
      const picks = new Set(ex.picks || []);
      const achHtml = ACHIEVEMENT_OPTIONS.map((raw) => {
        const a = optLabel(raw);
        const ic = optIcon(raw);
        return `<label class="pick"><input type="checkbox" data-ach="${i}" value="${esc(a)}" ${picks.has(a) ? "checked" : ""}> <span>${ic ? esc(ic) + " " : ""}${esc(a)}</span></label>`;
      }).join("");
      return `
    <div class="exp-block" data-i="${i}">
      ${data.experience.length > 1 ? `<button type="button" class="rm" data-rm-exp="${i}" aria-label="Remove">×</button>` : ""}
      <div class="field"><label>Job title *</label>
        <select data-ex="title" data-i="${i}">${selOptions(JOB_TITLES, ex.title, "— Select job title —")}</select></div>
      <div class="field ${showTitleOther ? "" : "hide"}" data-title-other="${i}">
        <label>Type job title</label>
        <input data-ex="titleOther" data-i="${i}" value="${esc(ex.titleOther || "")}" placeholder="Your job title">
      </div>
      <div class="field"><label>Company name *</label>
        <input data-ex="company" data-i="${i}" value="${esc(ex.company)}" placeholder="Company name"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="field" style="flex:1;min-width:120px"><label>From year</label>
          <select data-ex="start" data-i="${i}">${selOptions(YEARS, ex.start, "Year")}</select></div>
        <div class="field" style="flex:1;min-width:120px"><label>To year</label>
          <select data-ex="end" data-i="${i}">${selOptions(YEAR_END, ex.end || "Present", "Year")}</select></div>
      </div>
      <div class="field"><label>What did you do? (tick all that apply)</label>
        <div class="pick-grid">${achHtml}</div>
      </div>
      <div class="field"><label>Any other point (optional)</label>
        <input data-ex="bullets" data-i="${i}" value="${esc(ex.bullets)}" placeholder="One more line if needed">
      </div>
    </div>`;
    })
    .join("");
  return `
    <h3 style="margin:0 0 8px;font-size:16px">3. Work experience</h3>
    <p style="color:var(--muted);font-size:13px;margin:0 0 12px">Select title & years. Tick achievements — no long writing.</p>
    ${blocks}
    <button type="button" class="btn sm ghost" id="addExp">+ Add another job</button>
  `;
}

function renderEducationStep() {
  const blocks = data.education
    .map((ed, i) => {
      const showDegOther = isOther(ed.degree);
      return `
    <div class="edu-block" data-i="${i}">
      ${data.education.length > 1 ? `<button type="button" class="rm" data-rm-edu="${i}" aria-label="Remove">×</button>` : ""}
      <div class="field"><label>School / college / ITI</label>
        <input data-ed="school" data-i="${i}" value="${esc(ed.school)}" placeholder="Name of school or college"></div>
      <div class="field"><label>Qualification</label>
        <select data-ed="degree" data-i="${i}">${selOptions(DEGREES, ed.degree, "— Select —")}</select></div>
      <div class="field ${showDegOther ? "" : "hide"}" data-deg-other="${i}">
        <label>Type qualification</label>
        <input data-ed="degreeOther" data-i="${i}" value="${esc(ed.degreeOther || "")}" placeholder="Your qualification">
      </div>
      <div class="field"><label>Passing year</label>
        <select data-ed="year" data-i="${i}">${selOptions(YEARS, ed.year, "Year")}</select></div>
      <div class="field"><label>Extra (optional)</label>
        <input data-ed="detail" data-i="${i}" value="${esc(ed.detail)}" placeholder="e.g. First class / percentage"></div>
    </div>`;
    })
    .join("");
  return `
    <h3 style="margin:0 0 8px;font-size:16px">4. Education</h3>
    <p style="color:var(--muted);font-size:13px;margin:0 0 12px">Select qualification from list.</p>
    ${blocks}
    <button type="button" class="btn sm ghost" id="addEdu">+ Add more education</button>
  `;
}

function skillLevelMap() {
  const m = {};
  (data.skillPicks || []).forEach((x) => {
    if (typeof x === "string") m[x] = "Good";
    else if (x && x.name) m[x.name] = x.level || "Good";
  });
  return m;
}

function levelOptions(selected) {
  return SKILL_LEVELS.map((lv) => {
    const label = optLabel(lv);
    return `<option value="${esc(label)}" ${selected === label ? "selected" : ""}>${esc(optDisplay(lv))}</option>`;
  }).join("");
}

function renderSkillsStep() {
  const levels = skillLevelMap();
  const skillSet = new Set(Object.keys(levels));
  const certSet = new Set(data.certPicks || []);
  const skillHtml = SKILL_OPTIONS.map((g) => {
    const items = g.items
      .map((raw) => {
        const s = optLabel(raw);
        const ic = optIcon(raw);
        const on = skillSet.has(s);
        const lv = levels[s] || "Good";
        return `<div class="pick skill-row ${on ? "on" : ""}">
          <label class="pick-main"><input type="checkbox" data-skill value="${esc(s)}" ${on ? "checked" : ""}> <span>${ic ? esc(ic) + " " : ""}${esc(s)}</span></label>
          <select data-skill-level="${esc(s)}" class="level-sel" ${on ? "" : "disabled"} aria-label="Level for ${esc(s)}">${levelOptions(lv)}</select>
        </div>`;
      })
      .join("");
    return `<div class="pick-group"><div class="pick-group-title">${esc(g.group)}</div><div class="pick-grid skill-grid">${items}</div></div>`;
  }).join("");
  const certHtml = CERT_OPTIONS.map((raw) => {
    const c = optLabel(raw);
    const ic = optIcon(raw);
    return `<label class="pick"><input type="checkbox" data-cert value="${esc(c)}" ${certSet.has(c) ? "checked" : ""}> <span>${ic ? esc(ic) + " " : ""}${esc(c)}</span></label>`;
  }).join("");
  return `
    <h3 style="margin:0 0 8px;font-size:16px">5. Skills & certificates</h3>
    <p style="color:var(--muted);font-size:13px;margin:0 0 12px">Tick the skill, then choose level: <b>Basic</b> · <b>Good</b> · <b>Expert</b></p>
    ${skillHtml}
    <div class="field" style="margin-top:12px"><label>Any other skill (optional)</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input id="rSkillsOther" value="${esc(data.skillsOther || "")}" placeholder="Type if not in list" style="flex:1;min-width:160px">
        <select id="rSkillsOtherLevel" style="width:auto;min-width:110px">${levelOptions(data.skillsOtherLevel || "Good")}</select>
      </div>
    </div>
    <h3 style="margin:16px 0 8px;font-size:15px">Certificates</h3>
    <div class="pick-grid">${certHtml}</div>
    <div class="field" style="margin-top:10px"><label>Any other certificate (optional)</label>
      <input id="rCertsOther" value="${esc(data.certificationsOther || "")}" placeholder="Type if not in list"></div>
  `;
}

function resolveHeadline() {
  if (isOther(data.headline)) return data.headlineOther || data.headline;
  return data.headline;
}
function resolveLocation() {
  if (isOther(data.location)) return data.locationOther || data.location;
  return data.location;
}
function resolveTitle(ex) {
  if (isOther(ex.title)) return ex.titleOther || ex.title;
  return ex.title;
}
function resolveDegree(ed) {
  if (isOther(ed.degree)) return ed.degreeOther || ed.degree;
  return ed.degree;
}

function resolvedSkills() {
  const list = (data.skillPicks || []).map((x) => {
    if (typeof x === "string") return x;
    return x.level && x.level !== "Good" ? `${x.name} (${x.level})` : x.name;
  });
  if (data.skillsOther) {
    const lv = data.skillsOtherLevel || "Good";
    list.push(lv !== "Good" ? `${data.skillsOther} (${lv})` : data.skillsOther);
  }
  return list;
}
function resolvedCerts() {
  const list = [...(data.certPicks || [])];
  if (data.certificationsOther) list.push(data.certificationsOther);
  return list;
}

function renderPreviewStep() {
  return `
    <h3 style="margin:0 0 8px;font-size:16px">6. Preview</h3>
    <p style="color:var(--muted);font-size:13px;margin:0 0 12px">Check once. Then Download / Print → Save as PDF.</p>
    <div id="resumePreview"><div class="rv ${templateCssClass(data.template)}" id="resumePrintArea">${buildResumeHtml()}</div></div>
  `;
}

function templateCssClass(id) {
  return { packops: "classic", salesnet: "modern", techpack: "executive", leader: "sidebar" }[id] || "classic";
}

function collectCurrentStep() {
  if (step === 1) {
    data.fullName = $("#rName")?.value.trim() || "";
    data.headline = $("#rHeadline")?.value || "";
    data.headlineOther = $("#rHeadlineOther")?.value.trim() || "";
    data.email = $("#rEmail")?.value.trim() || "";
    data.phone = $("#rPhone")?.value.trim() || "";
    data.location = $("#rLoc")?.value || "";
    data.locationOther = $("#rLocOther")?.value.trim() || "";
    data.linkedin = $("#rLink")?.value.trim() || "";
    data.summary = $("#rSum")?.value.trim() || "";
  } else if (step === 2) {
    data.experience.forEach((ex, i) => {
      const titleEl = $(`select[data-ex="title"][data-i="${i}"]`);
      const companyEl = $(`input[data-ex="company"][data-i="${i}"]`);
      const startEl = $(`select[data-ex="start"][data-i="${i}"]`);
      const endEl = $(`select[data-ex="end"][data-i="${i}"]`);
      const bulletsEl = $(`input[data-ex="bullets"][data-i="${i}"]`);
      const titleOtherEl = $(`input[data-ex="titleOther"][data-i="${i}"]`);
      if (titleEl) ex.title = titleEl.value;
      if (titleOtherEl) ex.titleOther = titleOtherEl.value.trim();
      if (companyEl) ex.company = companyEl.value.trim();
      if (startEl) ex.start = startEl.value;
      if (endEl) ex.end = endEl.value;
      if (bulletsEl) ex.bullets = bulletsEl.value.trim();
      ex.picks = $$(`input[data-ach="${i}"]:checked`).map((c) => c.value);
    });
  } else if (step === 3) {
    data.education.forEach((ed, i) => {
      const schoolEl = $(`input[data-ed="school"][data-i="${i}"]`);
      const degreeEl = $(`select[data-ed="degree"][data-i="${i}"]`);
      const degreeOtherEl = $(`input[data-ed="degreeOther"][data-i="${i}"]`);
      const yearEl = $(`select[data-ed="year"][data-i="${i}"]`);
      const detailEl = $(`input[data-ed="detail"][data-i="${i}"]`);
      if (schoolEl) ed.school = schoolEl.value.trim();
      if (degreeEl) ed.degree = degreeEl.value;
      if (degreeOtherEl) ed.degreeOther = degreeOtherEl.value.trim();
      if (yearEl) ed.year = yearEl.value;
      if (detailEl) ed.detail = detailEl.value.trim();
    });
  } else if (step === 4) {
    data.skillPicks = $$("input[data-skill]:checked").map((c) => {
      const name = c.value;
      const sel = document.querySelector(`select[data-skill-level="${CSS.escape(name)}"]`);
      return { name, level: sel?.value || "Good" };
    });
    data.certPicks = $$("input[data-cert]:checked").map((c) => c.value);
    data.skillsOther = $("#rSkillsOther")?.value.trim() || "";
    data.skillsOtherLevel = $("#rSkillsOtherLevel")?.value || "Good";
    data.certificationsOther = $("#rCertsOther")?.value.trim() || "";
  }
}

function validateStep() {
  if (step === 0 && !data.template) {
    toast("Please choose a style");
    return false;
  }
  if (step === 1) {
    if (!data.fullName) {
      toast("Please enter your name");
      return false;
    }
    if (!data.headline) {
      toast("Please select your role");
      return false;
    }
    if (isOther(data.headline) && !data.headlineOther) {
      toast("Please type your role");
      return false;
    }
    if (!data.email) {
      toast("Please enter email");
      return false;
    }
  }
  if (step === 2) {
    const ex = data.experience[0];
    if (!ex || (!ex.title && !ex.company)) {
      toast("Please add at least one job (title + company)");
      return false;
    }
  }
  return true;
}

function bindOtherToggles() {
  $("#rHeadline")?.addEventListener("change", () => {
    const v = $("#rHeadline").value;
    $("#rHeadlineOtherWrap")?.classList.toggle("hide", !isOther(v));
  });
  $("#rLoc")?.addEventListener("change", () => {
    const v = $("#rLoc").value;
    $("#rLocOtherWrap")?.classList.toggle("hide", !isOther(v));
  });
  $$('select[data-ex="title"]').forEach((sel) => {
    sel.addEventListener("change", () => {
      const i = sel.dataset.i;
      const wrap = $(`[data-title-other="${i}"]`);
      if (wrap) wrap.classList.toggle("hide", !isOther(sel.value));
    });
  });
  $$('select[data-ed="degree"]').forEach((sel) => {
    sel.addEventListener("change", () => {
      const i = sel.dataset.i;
      const wrap = $(`[data-deg-other="${i}"]`);
      if (wrap) wrap.classList.toggle("hide", !isOther(sel.value));
    });
  });
}

function bindStepEvents() {
  $$(".tpl-card").forEach((btn) => {
    btn.onclick = () => {
      data.template = btn.dataset.tpl;
      render();
    };
  });

  $("#useSummaryHint")?.addEventListener("click", () => {
    const s = SUMMARY_HINTS[data.template];
    if (s && $("#rSum")) $("#rSum").value = s;
  });

  bindOtherToggles();

  // skill checkbox toggles level dropdown
  $$("input[data-skill]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const sel = document.querySelector(`select[data-skill-level="${CSS.escape(cb.value)}"]`);
      if (sel) sel.disabled = !cb.checked;
      cb.closest(".skill-row")?.classList.toggle("on", cb.checked);
    });
  });

  $("#addExp")?.addEventListener("click", () => {
    collectCurrentStep();
    data.experience.push({ company: "", title: "", titleOther: "", start: "", end: "Present", bullets: "", picks: [] });
    render();
  });
  $$("[data-rm-exp]").forEach((b) => {
    b.onclick = () => {
      collectCurrentStep();
      data.experience.splice(+b.dataset.rmExp, 1);
      if (!data.experience.length)
        data.experience.push({ company: "", title: "", titleOther: "", start: "", end: "Present", bullets: "", picks: [] });
      render();
    };
  });

  $("#addEdu")?.addEventListener("click", () => {
    collectCurrentStep();
    data.education.push({ school: "", degree: "", degreeOther: "", year: "", detail: "" });
    render();
  });
  $$("[data-rm-edu]").forEach((b) => {
    b.onclick = () => {
      collectCurrentStep();
      data.education.splice(+b.dataset.rmEdu, 1);
      if (!data.education.length) data.education.push({ school: "", degree: "", degreeOther: "", year: "", detail: "" });
      render();
    };
  });

  $("#resBack")?.addEventListener("click", () => {
    collectCurrentStep();
    step = Math.max(0, step - 1);
    render();
  });

  $("#resNext")?.addEventListener("click", () => {
    collectCurrentStep();
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      step++;
      render();
      $("#resumeRoot")?.closest(".scroll")?.scrollTo?.({ top: 0 });
    } else {
      downloadResume();
    }
  });
}

function buildResumeHtml() {
  const d = data;
  const cssClass = templateCssClass(d.template);
  const headline = resolveHeadline();
  const location = resolveLocation();
  const contact = [d.email, d.phone, location, d.linkedin].filter(Boolean).join(" · ");
  const skills = resolvedSkills();
  const certs = resolvedCerts();

  const expHtml = d.experience
    .filter((ex) => resolveTitle(ex) || ex.company)
    .map((ex) => {
      const title = resolveTitle(ex);
      const bullets = [...(ex.picks || [])];
      if (ex.bullets) bullets.push(ex.bullets);
      return `<div class="rv-item">
        <div class="h">${esc(title)}${ex.company ? " — " + esc(ex.company) : ""}</div>
        <div class="sub">${esc([ex.start, ex.end].filter(Boolean).join(" – "))}</div>
        ${bullets.length ? `<ul class="bul">${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
      </div>`;
    })
    .join("");

  const eduHtml = d.education
    .filter((ed) => ed.school || resolveDegree(ed))
    .map((ed) => {
      const deg = resolveDegree(ed);
      return `<div class="rv-item">
      <div class="h">${esc(deg)}${ed.school ? " — " + esc(ed.school) : ""}</div>
      <div class="sub">${esc([ed.year, ed.detail].filter(Boolean).join(" · "))}</div>
    </div>`;
    })
    .join("");

  const skillsHtml = skills.length
    ? `<div class="rv-skills">${skills.map((s) => `<span>${esc(s)}</span>`).join("<span>·</span>")}</div>`
    : "";
  const certsHtml = certs.length
    ? `<div class="rv-skills">${certs.map((s) => `<span>${esc(s)}</span>`).join("<span>·</span>")}</div>`
    : "";

  if (cssClass === "sidebar") {
    return `
      <div class="side">
        <div class="rv-name">${esc(d.fullName || "Your Name")}</div>
        <div class="rv-title">${esc(headline)}</div>
        <div class="rv-contact">${esc(contact)}</div>
        ${d.summary ? `<div class="rv-section"><h4>Profile</h4><div style="font-size:11.5px">${esc(d.summary)}</div></div>` : ""}
        ${skillsHtml ? `<div class="rv-section"><h4>Skills</h4>${skillsHtml}</div>` : ""}
        ${certsHtml ? `<div class="rv-section"><h4>Certificates</h4>${certsHtml}</div>` : ""}
      </div>
      <div class="main">
        ${expHtml ? `<div class="rv-section"><h4>Experience</h4>${expHtml}</div>` : ""}
        ${eduHtml ? `<div class="rv-section"><h4>Education</h4>${eduHtml}</div>` : ""}
      </div>`;
  }

  return `
    <div class="rv-name">${esc(d.fullName || "Your Name")}</div>
    <div class="rv-title">${esc(headline)}</div>
    <div class="rv-contact">${esc(contact)}</div>
    ${d.summary ? `<div class="rv-section"><h4>Summary</h4><div>${esc(d.summary)}</div></div>` : ""}
    ${expHtml ? `<div class="rv-section"><h4>Experience</h4>${expHtml}</div>` : ""}
    ${eduHtml ? `<div class="rv-section"><h4>Education</h4>${eduHtml}</div>` : ""}
    ${skillsHtml ? `<div class="rv-section"><h4>Skills</h4>${skillsHtml}</div>` : ""}
    ${certsHtml ? `<div class="rv-section"><h4>Certificates</h4>${certsHtml}</div>` : ""}
  `;
}

function downloadResume() {
  const html = buildResumeHtml();
  const tpl = templateCssClass(data.template);
  const name = (data.fullName || "Resume").replace(/[^\w\s-]/g, "").trim() || "Resume";

  const w = window.open("", "_blank");
  if (!w) {
    toast("Allow pop-ups to download resume");
    return;
  }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(name)} – Resume</title>
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: 12.5px; line-height: 1.45; color: #111; }
  .rv-name { font-size: 24px; font-weight: 700; margin: 0 0 2px; }
  .rv-title { font-size: 13px; color: #444; margin: 0 0 6px; }
  .rv-contact { font-size: 11px; color: #555; margin-bottom: 12px; }
  .rv-section { margin-top: 12px; }
  .rv-section h4 { margin: 0 0 5px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1.5px solid #222; padding-bottom: 2px; }
  .rv-item { margin-bottom: 7px; }
  .rv-item .h { font-weight: 700; }
  .rv-item .sub { font-size: 11px; color: #555; }
  .rv-item .bul { margin: 2px 0 0 14px; padding: 0; }
  .rv-item .bul li { margin: 1px 0; }
  .rv-skills { display: flex; flex-wrap: wrap; gap: 2px 8px; }
  .classic .rv-name { color: #0e3b2e; }
  .classic .rv-section h4 { color: #0e3b2e; border-color: #0e3b2e; }
  .modern { font-family: "Segoe UI", system-ui, sans-serif; }
  .modern .rv-name { font-size: 26px; }
  .modern .rv-section h4 { border: 0; background: #0e3b2e; color: #fff; padding: 3px 7px; border-radius: 2px; display: inline-block; }
  .executive { border-top: 4px solid #1a1a2e; padding-top: 10px; }
  .executive .rv-section h4 { border-color: #1a1a2e; color: #1a1a2e; }
  .sidebar { display: grid; grid-template-columns: 32% 1fr; min-height: 90vh; }
  .sidebar .side { background: #0e3b2e; color: #e8f0ec; padding: 22px 16px; }
  .sidebar .side .rv-name { color: #fff; font-size: 18px; }
  .sidebar .side .rv-title { color: #b9d3c8; }
  .sidebar .side .rv-contact { color: #c5d9cf; font-size: 10.5px; }
  .sidebar .side h4 { color: #f2a900; border-color: #f2a900; font-size: 10px; }
  .sidebar .main { padding: 22px 18px; }
  .sidebar .main .rv-section h4 { color: #0e3b2e; border-color: #0e3b2e; }
  .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #0e3b2e; color: #fff; padding: 10px 16px; display: flex; gap: 10px; align-items: center; z-index: 9; font-family: system-ui,sans-serif; }
  .toolbar button { background: #f2a900; color: #2a1d00; border: 0; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; }
  .toolbar span { flex: 1; font-size: 14px; }
  @media print { .toolbar { display: none !important; } }
</style></head><body>
<div class="toolbar"><span>${esc(name)} – Resume</span><button onclick="window.print()">Print / Save as PDF</button></div>
<div style="padding-top:56px"><div class="rv ${tpl}">${html}</div></div>
</body></html>`);
  w.document.close();
  toast("Resume opened — Print → Save as PDF");
}
