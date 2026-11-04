/**
 * Packaging-industry resume templates + easy dropdown options
 * (for operators / supervisors – pick from lists, minimal typing)
 */

export const TEMPLATES = [
  {
    id: "packops",
    name: "Packaging Ops",
    desc: "Plant · production · quality",
    industry: "Operations & Quality",
    mini: "<div style='font-weight:700;font-size:8px;color:#0e3b2e'>YOUR NAME</div><div>Packaging Manager</div><div style='margin-top:3px;border-top:1px solid #0e3b2e;font-size:6px'>EXPERIENCE</div><div style='font-size:6px'>Plant Lead · OEE ↑</div>",
  },
  {
    id: "salesnet",
    name: "Sales & Network",
    desc: "BD · accounts · distributors",
    industry: "Sales & Business Development",
    mini: "<div style='font-weight:700;font-size:8px'>YOUR NAME</div><div style='font-size:6px'>Regional Sales Head</div><div style='margin-top:3px;background:#0e3b2e;color:#fff;display:inline;padding:1px 3px;font-size:5px'>SALES</div>",
  },
  {
    id: "techpack",
    name: "Tech & Design",
    desc: "R&D · structures · quality lab",
    industry: "Technical & R&D",
    mini: "<div style='border-top:3px solid #1a1a2e;padding-top:2px;font-weight:700;font-size:8px'>YOUR NAME</div><div style='font-size:6px'>Packaging Technologist</div>",
  },
  {
    id: "leader",
    name: "Industry Leader",
    desc: "GM · multi-plant · leadership",
    industry: "Leadership",
    mini: "<div style='display:flex;height:100%'><div style='width:34%;background:#0e3b2e;color:#fff;padding:3px;font-size:5px'><b>NAME</b><br>COO</div><div style='flex:1;padding:3px;font-size:5px'><b>EXPERIENCE</b></div></div>",
  },
];

export const HEADLINE_HINTS = {
  packops: "Packaging Production Manager | Lean · OEE · Quality",
  salesnet: "Regional Sales Manager – Flexible Packaging",
  techpack: "Packaging Technologist | Structures & Films",
  leader: "General Manager – Packaging Operations",
};

export const SKILL_HINTS = {
  packops: "OEE, Lean, Six Sigma, ISO 9001, ISO 22000, HACCP, BRC, 5S, Kaizen, Film extrusion, Pouching, Quality control",
  salesnet: "Key accounts, Distributor network, Negotiation, CRM, Flexible packaging, Rigid packaging, Corrugated",
  techpack: "Packaging design, Barrier films, Sustainability, ASTM tests, CAD, ArtiosCAD, FSSAI, FDA",
  leader: "P&L, Multi-plant, Team leadership, Capex, Cost reduction, SAP, Safety",
};

export const SUMMARY_HINTS = {
  packops:
    "Packaging operations professional with hands-on experience in film conversion, pouching and quality systems. Improved OEE, reduced waste and implemented ISO/BRC standards on the shop floor.",
  salesnet:
    "Packaging sales professional with strong relationships across brand owners and converters. Focused on key accounts and distributor growth in flexible and rigid packaging.",
  techpack:
    "Packaging technologist working on structures, barrier films and cost-optimized designs for food and personal care packaging.",
  leader:
    "Senior packaging leader with multi-plant experience. Built teams, improved cost and quality, and scaled film and converting operations.",
};

export const CERT_HINTS =
  "Six Sigma Green Belt, ISO 9001, ISO 22000, BRC Packaging, HACCP, IOSH";

/* ---------- DROPDOWN / CHIP LISTS (easy pick) ---------- */

export const JOB_TITLES = [
  { icon: "⚙️", label: "Machine Operator" },
  { icon: "⚙️", label: "Senior Machine Operator" },
  { icon: "👷", label: "Shift Supervisor" },
  { icon: "👷", label: "Production Supervisor" },
  { icon: "👷", label: "Production In-charge" },
  { icon: "🏭", label: "Production Manager" },
  { icon: "🏭", label: "Packaging Production Manager" },
  { icon: "✅", label: "Quality Inspector" },
  { icon: "✅", label: "Quality Supervisor" },
  { icon: "✅", label: "Quality Assurance Executive" },
  { icon: "✅", label: "Quality Manager" },
  { icon: "🔧", label: "Maintenance Technician" },
  { icon: "🔧", label: "Maintenance Supervisor" },
  { icon: "🔧", label: "Maintenance Manager" },
  { icon: "🖨️", label: "Printing Operator" },
  { icon: "🖨️", label: "Printing Supervisor" },
  { icon: "📄", label: "Lamination Operator" },
  { icon: "📄", label: "Lamination Supervisor" },
  { icon: "📦", label: "Pouching Operator" },
  { icon: "✂️", label: "Slitting Operator" },
  { icon: "📦", label: "Warehouse Executive" },
  { icon: "📦", label: "Store In-charge" },
  { icon: "🛒", label: "Purchase Executive" },
  { icon: "🛒", label: "Purchase Manager" },
  { icon: "🤝", label: "Sales Executive" },
  { icon: "🤝", label: "Sales Officer" },
  { icon: "📊", label: "Area Sales Manager" },
  { icon: "📊", label: "Regional Sales Manager" },
  { icon: "⭐", label: "Key Account Manager" },
  { icon: "📈", label: "Business Development Manager" },
  { icon: "🧪", label: "Packaging Development Executive" },
  { icon: "🧪", label: "Packaging Technologist" },
  { icon: "🔬", label: "R&D Executive" },
  { icon: "🏢", label: "Plant Head" },
  { icon: "🏢", label: "Works Manager" },
  { icon: "👔", label: "General Manager" },
  { icon: "✏️", label: "Other (type below)" },
];

export const HEADLINES = [
  { icon: "⚙️", label: "Machine Operator – Flexible Packaging" },
  { icon: "👷", label: "Shift Supervisor – Production" },
  { icon: "👷", label: "Production Supervisor – Packaging" },
  { icon: "🏭", label: "Production Manager – Flexible Packaging" },
  { icon: "✅", label: "Quality Inspector – Packaging" },
  { icon: "✅", label: "Quality Supervisor" },
  { icon: "✅", label: "Quality Assurance Manager" },
  { icon: "🔧", label: "Maintenance Supervisor – Packaging Plant" },
  { icon: "🖨️", label: "Printing / Lamination Supervisor" },
  { icon: "🤝", label: "Sales Executive – Packaging" },
  { icon: "📊", label: "Area Sales Manager – Packaging" },
  { icon: "📊", label: "Regional Sales Manager – Flexible Packaging" },
  { icon: "⭐", label: "Key Account Manager – Packaging" },
  { icon: "🧪", label: "Packaging Technologist" },
  { icon: "🛒", label: "Purchase Executive – Packaging Materials" },
  { icon: "🏢", label: "Plant Head – Packaging Unit" },
  { icon: "👔", label: "General Manager – Packaging Operations" },
  { icon: "✏️", label: "Other (type below)" },
];

export const LOCATIONS = [
  { icon: "📍", label: "Mumbai, Maharashtra" },
  { icon: "📍", label: "Pune, Maharashtra" },
  { icon: "📍", label: "Vapi, Gujarat" },
  { icon: "📍", label: "Silvassa / DNH" },
  { icon: "📍", label: "Ahmedabad, Gujarat" },
  { icon: "📍", label: "Vadodara, Gujarat" },
  { icon: "📍", label: "Rajkot, Gujarat" },
  { icon: "📍", label: "Chennai, Tamil Nadu" },
  { icon: "📍", label: "Coimbatore, Tamil Nadu" },
  { icon: "📍", label: "Bengaluru, Karnataka" },
  { icon: "📍", label: "Hyderabad, Telangana" },
  { icon: "📍", label: "Delhi NCR" },
  { icon: "📍", label: "Gurgaon, Haryana" },
  { icon: "📍", label: "Noida, Uttar Pradesh" },
  { icon: "📍", label: "Rudrapur, Uttarakhand" },
  { icon: "📍", label: "Baddi, Himachal Pradesh" },
  { icon: "📍", label: "Kolkata, West Bengal" },
  { icon: "📍", label: "Indore, Madhya Pradesh" },
  { icon: "📍", label: "Jaipur, Rajasthan" },
  { icon: "✏️", label: "Other (type below)" },
];

export const DEGREES = [
  { icon: "📘", label: "Below 10th" },
  { icon: "📘", label: "10th Pass" },
  { icon: "📗", label: "12th Pass" },
  { icon: "🔧", label: "ITI" },
  { icon: "📜", label: "Diploma – Mechanical" },
  { icon: "📜", label: "Diploma – Electrical" },
  { icon: "🖨️", label: "Diploma – Printing Technology" },
  { icon: "📦", label: "Diploma – Packaging Technology" },
  { icon: "📜", label: "Diploma – Other" },
  { icon: "🎓", label: "B.Sc" },
  { icon: "🎓", label: "B.Com" },
  { icon: "🎓", label: "B.A" },
  { icon: "🎓", label: "B.Tech / B.E. – Mechanical" },
  { icon: "🎓", label: "B.Tech / B.E. – Chemical" },
  { icon: "🎓", label: "B.Tech – Printing / Packaging" },
  { icon: "🎓", label: "B.Tech / B.E. – Other" },
  { icon: "🎓", label: "M.Tech / M.E." },
  { icon: "💼", label: "MBA" },
  { icon: "✏️", label: "Other (type below)" },
];

export const YEARS = (() => {
  const y = [];
  const now = new Date().getFullYear();
  for (let i = now; i >= 1980; i--) y.push({ icon: "📅", label: String(i) });
  return y;
})();

export const YEAR_END = [{ icon: "✅", label: "Present" }, ...YEARS];

export const SKILL_LEVELS = [
  { icon: "🌱", label: "Basic" },
  { icon: "👍", label: "Good" },
  { icon: "⭐", label: "Expert" },
];

/** Skills as simple tick options (grouped) */
export const SKILL_OPTIONS = [
  { group: "🏭 Shop floor", items: [
    { icon: "⚙️", label: "Machine operation" },
    { icon: "🎞️", label: "Film extrusion" },
    { icon: "🖨️", label: "Printing" },
    { icon: "📄", label: "Lamination" },
    { icon: "📦", label: "Pouching" },
    { icon: "✂️", label: "Slitting" },
    { icon: "📦", label: "Cartoning" },
    { icon: "📦", label: "Corrugation" },
    { icon: "🔧", label: "Injection moulding" },
  ]},
  { group: "✅ Quality", items: [
    { icon: "🔍", label: "Quality checking" },
    { icon: "📥", label: "Incoming inspection" },
    { icon: "🔎", label: "In-process quality" },
    { icon: "🧪", label: "Lab testing" },
    { icon: "🧼", label: "GMP" },
    { icon: "5️⃣", label: "5S" },
  ]},
  { group: "📋 Systems", items: [
    { icon: "📜", label: "ISO 9001" },
    { icon: "🍽️", label: "ISO 22000" },
    { icon: "⚠️", label: "HACCP" },
    { icon: "📦", label: "BRC Packaging" },
    { icon: "📉", label: "Lean" },
    { icon: "σ", label: "Six Sigma" },
    { icon: "💡", label: "Kaizen" },
    { icon: "📊", label: "OEE tracking" },
  ]},
  { group: "🔧 Maintenance", items: [
    { icon: "🛠️", label: "Breakdown maintenance" },
    { icon: "🗓️", label: "Preventive maintenance" },
    { icon: "⚡", label: "Utilities" },
    { icon: "🦺", label: "Safety" },
  ]},
  { group: "🤝 Sales & commercial", items: [
    { icon: "😊", label: "Customer handling" },
    { icon: "🚚", label: "Distributor handling" },
    { icon: "📞", label: "Order follow-up" },
    { icon: "💬", label: "Negotiation" },
    { icon: "💻", label: "CRM" },
  ]},
  { group: "📁 Other", items: [
    { icon: "💾", label: "SAP / ERP" },
    { icon: "📊", label: "MS Excel" },
    { icon: "👥", label: "Team handling" },
    { icon: "🕐", label: "Shift handling" },
    { icon: "📦", label: "Store / inventory" },
    { icon: "🛒", label: "Purchase" },
  ]},
];

export const CERT_OPTIONS = [
  { icon: "🔧", label: "ITI Certificate" },
  { icon: "📜", label: "Diploma Certificate" },
  { icon: "🟡", label: "Six Sigma Yellow Belt" },
  { icon: "🟢", label: "Six Sigma Green Belt" },
  { icon: "📋", label: "ISO 9001 awareness" },
  { icon: "🍽️", label: "ISO 22000 awareness" },
  { icon: "⚠️", label: "HACCP" },
  { icon: "📦", label: "BRC Packaging" },
  { icon: "🔥", label: "Fire safety" },
  { icon: "🩹", label: "First aid" },
  { icon: "🚜", label: "Forklift license" },
  { icon: "✏️", label: "Other" },
];

/** Ready-made achievement lines – tick what applies */
export const ACHIEVEMENT_OPTIONS = [
  { icon: "🎯", label: "Handled shift production targets daily" },
  { icon: "⏱️", label: "Reduced machine downtime" },
  { icon: "📈", label: "Improved OEE / line efficiency" },
  { icon: "♻️", label: "Reduced film / material waste" },
  { icon: "✅", label: "Maintained quality as per customer standard" },
  { icon: "😊", label: "Zero major customer complaint in the period" },
  { icon: "5️⃣", label: "Followed 5S and safety on shop floor" },
  { icon: "👨‍🏫", label: "Trained new operators / helpers" },
  { icon: "📋", label: "Supported ISO / BRC / customer audits" },
  { icon: "💰", label: "Achieved monthly / annual sales target" },
  { icon: "🆕", label: "Developed new customers or distributors" },
  { icon: "📦", label: "Controlled inventory / store accurately" },
  { icon: "🔧", label: "Completed preventive maintenance on time" },
  { icon: "💡", label: "Implemented kaizen / improvement idea" },
];

