
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limit, startAfter, serverTimestamp, writeBatch }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref as sref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { firebaseConfig, SUPER_ADMIN, WA_CONTACT } from "./config.js";
import { $, $$, esc, linkify, colors, colorOf, initial, toast, sheet, closeSheet, confirmSheet, fmtTime, shrink } from "./utils.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); auth.languageCode = "en";
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const storage = getStorage(app);

/* ---------- device remember + PIN / fingerprint ---------- */
const DEV_KEY = "packlink_device_v1";
function loadDeviceCred() {
  try { return JSON.parse(localStorage.getItem(DEV_KEY) || "null"); } catch { return null; }
}
function saveDeviceCred(data) {
  localStorage.setItem(DEV_KEY, JSON.stringify(data));
}
function clearDeviceCred() {
  localStorage.removeItem(DEV_KEY);
}
async function hashPin(pin) {
  const enc = new TextEncoder().encode("packlink|" + pin);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function bioSupported() {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

/* splash safety – always clear after boot attempt */
setTimeout(() => {
  const s = document.getElementById("splash");
  if (s && getComputedStyle(s).display !== "none") {
    s.classList.add("out");
    setTimeout(() => (s.style.display = "none"), 260);
    if (!document.getElementById("app") || document.getElementById("app").classList.contains("hide")) {
      const land = document.getElementById("landing");
      if (land) land.classList.remove("hide");
      else document.getElementById("login")?.classList.remove("hide");
    }
  }
}, 6000);


/* ---------- theme ---------- */
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t === "dark" ? "dark" : "light");
  localStorage.setItem("packlink-theme", t);
  const btn = $("#themeBtn"); if (btn) btn.textContent = t === "dark" ? "Light mode" : "Dark mode";
}
(function initTheme() {
  const saved = localStorage.getItem("packlink-theme");
  const preferDark = matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (preferDark ? "dark" : "light"));
})();
document.addEventListener("click", (e) => { if (e.target.id === "themeBtn") applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"); });

/* ---------- notifications ---------- */
let notifEnabled = localStorage.getItem("packlink-notif") === "1";
function refreshNotifBtn() {
  const b = $("#notifBtn"); if (!b) return;
  if (!("Notification" in window)) { b.textContent = "Not supported"; b.disabled = true; return; }
  if (Notification.permission === "granted" && notifEnabled) b.textContent = "On";
  else if (Notification.permission === "denied") b.textContent = "Blocked";
  else b.textContent = notifEnabled ? "On" : "Enable";
}
async function enableNotifs() {
  if (!("Notification" in window)) return toast("Notifications not supported");
  if (Notification.permission === "denied") return toast("Notifications blocked in browser settings");
  const p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  notifEnabled = p === "granted";
  localStorage.setItem("packlink-notif", notifEnabled ? "1" : "0");
  refreshNotifBtn();
  toast(notifEnabled ? "Notifications enabled" : "Permission denied");
}
document.addEventListener("click", (e) => { if (e.target.id === "notifBtn") enableNotifs(); });
function notifyNewMsg(name, text) {
  if (!notifEnabled || Notification.permission !== "granted" || document.hasFocus() && curPage === "chat") return;
  try {
    const n = new Notification(name || "PackLink – Packaging Industry Network", { body: text || "New message", icon: "/Assets/icon-192.png", tag: "packlink-msg" });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {}
}

/* ---------- sheet + keyboard ---------- */
$("#scrim").addEventListener("click", (e) => { if (e.target.id === "scrim") closeSheet(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSheet();
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    if (curPage === "chat") $("#cSearch")?.focus();
    else if (curPage === "members") $("#mSearch")?.focus();
    else if (curPage === "jobs") $("#jSearch")?.focus();
    else if (curPage === "resume") $("#resumeRoot")?.querySelector("input,textarea")?.focus();
  }
});


/* ---------- PWA install + share (Man Power-style) ---------- */
let deferredPrompt = window.__plDeferredPrompt || null;
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = /android/i.test(navigator.userAgent);

function isStandaloneApp() {
  return standalone || window.__plPwaInstalled === true ||
    (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
}

function showInstallBar(v) {
  const bar = $("#installBar");
  if (bar) bar.classList.toggle("hide", !v);
  document.body.classList.toggle("hasBar", !!v);
}

function canOfferInstall() {
  if (isStandaloneApp()) return false;
  if (deferredPrompt || window.__plDeferredPrompt) return true;
  if (isIOS || isAndroid) return true;
  return true; // still show guidance on desktop browsers
}

function refreshInstallUI() {
  deferredPrompt = deferredPrompt || window.__plDeferredPrompt || null;
  const can = canOfferInstall();
  showInstallBar(can && !sessionStorage.getItem("barX") && !isStandaloneApp());
  const hideInstall = isStandaloneApp();
  ["installBtn2", "pwaInstallBtn", "loginPwaBtn", "ldInstallTop", "ldInstallHero"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (hideInstall) el.classList.add("hide");
    else el.classList.remove("hide");
  });
}
window.refreshInstallUI = refreshInstallUI;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.__plDeferredPrompt = e;
  refreshInstallUI();
});
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  window.__plDeferredPrompt = null;
  refreshInstallUI();
  toast("PackLink installed");
});

function openInstallHelpModal() {
  const modal = $("#fpInstallModal");
  const body = $("#fpInstallBody");
  if (!modal || !body) {
    toast(isIOS ? "iPhone: Share → Add to Home Screen" : "Browser menu → Install app / Add to Home screen");
    return;
  }
  if (isIOS) {
    body.innerHTML = `<p>Install PackLink on iPhone / iPad:</p>
      <ol>
        <li>Open this page in <b>Safari</b></li>
        <li>Tap the <b>Share</b> button</li>
        <li>Choose <b>Add to Home Screen</b></li>
        <li>Tap <b>Add</b></li>
      </ol>`;
  } else if (isAndroid) {
    body.innerHTML = `<p>Install PackLink on Android:</p>
      <ol>
        <li>Tap the browser menu <b>⋮</b></li>
        <li>Choose <b>Install app</b> or <b>Add to Home screen</b></li>
        <li>Confirm <b>Install</b></li>
      </ol>
      <p>Or use the Install button in the address bar if Chrome shows it.</p>`;
  } else {
    body.innerHTML = `<p>Install PackLink on this device:</p>
      <ol>
        <li>Look for an <b>Install</b> icon in the address bar</li>
        <li>Or open the browser menu → <b>Install app</b> / <b>Apps</b></li>
      </ol>`;
  }
  modal.classList.remove("hide");
}

async function doInstall() {
  const prompt = deferredPrompt || window.__plDeferredPrompt;
  if (prompt) {
    try {
      prompt.prompt();
      await prompt.userChoice;
    } catch (e) {}
    deferredPrompt = null;
    window.__plDeferredPrompt = null;
    refreshInstallUI();
    return;
  }
  openInstallHelpModal();
}
window.triggerFPInstall = doInstall;

async function shareApp() {
  const url = location.origin + "/";
  const data = {
    title: "PackLink – Packaging Industry Network",
    text: "Join PackLink — members-only network for flexible packaging professionals. Jobs, chats, members & resume tools.",
    url
  };
  try {
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied — share it with your team");
  } catch (e2) {
    toast(url);
  }
}
window.shareApp = shareApp;

function wireInstallShareClicks() {
  const map = [
    ["installBtn", doInstall],
    ["installBtn2", doInstall],
    ["loginPwaBtn", doInstall],
    ["pwaInstallBtn", doInstall],
    ["ldInstallTop", doInstall],
    ["ldInstallHero", doInstall],
    ["shareAppBtn", shareApp],
    ["loginShareBtn", shareApp],
    ["shareBtnProfile", shareApp],
    ["fpInstallClose", () => $("#fpInstallModal")?.classList.add("hide")],
  ];
  map.forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  });
  const x = $("#installX");
  if (x) x.onclick = () => { sessionStorage.setItem("barX", "1"); showInstallBar(false); };
  const modal = $("#fpInstallModal");
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hide"); });
}
wireInstallShareClicks();
refreshInstallUI();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));

/* ---------- Landing → Login ---------- */
function showLanding() {
  $("#landing")?.classList.remove("hide");
  $("#login")?.classList.add("hide");
  $("#app")?.classList.add("hide");
}
function showLoginFromLanding() {
  $("#landing")?.classList.add("hide");
  $("#login")?.classList.remove("hide");
  $("#app")?.classList.add("hide");
  try { window.scrollTo(0, 0); } catch (e) {}
  showDeviceOrPhoneStep();
}
function showDeviceOrPhoneStep() {
  const cred = loadDeviceCred();
  loginErr("");
  $("#stepOtp")?.classList.add("hide");
  $("#login")?.classList.remove("otp-step");
  if (cred && cred.phone && cred.pinHash) {
    $("#stepPhone")?.classList.add("hide");
    $("#stepDevice")?.classList.remove("hide");
    if ($("#devPhoneShow")) $("#devPhoneShow").value = cred.phone;
    if ($("#devPin")) $("#devPin").value = "";
    const bioBtn = $("#devBioLogin");
    if (bioBtn) bioBtn.style.display = (cred.bio && bioSupported()) ? "block" : "none";
  } else {
    $("#stepDevice")?.classList.add("hide");
    $("#stepPhone")?.classList.remove("hide");
  }
}
["ldLoginTop", "ldLoginHero", "ldLoginFoot"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.onclick = showLoginFromLanding;
});
const resumeScrollBtn = document.getElementById("resumeScrollBtn");
if (resumeScrollBtn) {
  resumeScrollBtn.onclick = () => {
    const root = document.getElementById("resumeRoot");
    if (root) root.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

/* ---------- country codes (auto-discover) ---------- */
const CC_NAMES = {
  "1": "USA/Canada", "7": "Russia/KZ", "20": "Egypt", "27": "S. Africa",
  "30": "Greece", "31": "Netherlands", "32": "Belgium", "33": "France",
  "34": "Spain", "36": "Hungary", "39": "Italy", "40": "Romania",
  "41": "Switzerland", "43": "Austria", "44": "UK", "45": "Denmark",
  "46": "Sweden", "47": "Norway", "48": "Poland", "49": "Germany",
  "51": "Peru", "52": "Mexico", "54": "Argentina", "55": "Brazil",
  "56": "Chile", "57": "Colombia", "60": "Malaysia", "61": "Australia",
  "62": "Indonesia", "63": "Philippines", "64": "New Zealand", "65": "Singapore",
  "66": "Thailand", "81": "Japan", "82": "S. Korea", "84": "Vietnam",
  "86": "China", "90": "Turkey", "91": "India", "92": "Pakistan",
  "93": "Afghanistan", "94": "Sri Lanka", "95": "Myanmar", "98": "Iran",
  "212": "Morocco", "213": "Algeria", "216": "Tunisia", "218": "Libya",
  "220": "Gambia", "221": "Senegal", "234": "Nigeria", "254": "Kenya",
  "255": "Tanzania", "256": "Uganda", "260": "Zambia", "263": "Zimbabwe",
  "351": "Portugal", "352": "Luxembourg", "353": "Ireland", "354": "Iceland",
  "358": "Finland", "380": "Ukraine", "381": "Serbia", "420": "Czechia",
  "421": "Slovakia", "880": "Bangladesh", "886": "Taiwan", "960": "Maldives",
  "961": "Lebanon", "962": "Jordan", "963": "Syria", "964": "Iraq",
  "965": "Kuwait", "966": "Saudi", "967": "Yemen", "968": "Oman",
  "970": "Palestine", "971": "UAE", "972": "Israel", "973": "Bahrain",
  "974": "Qatar", "975": "Bhutan", "976": "Mongolia", "977": "Nepal",
  "992": "Tajikistan", "993": "Turkmenistan", "994": "Azerbaijan",
  "995": "Georgia", "996": "Kyrgyzstan", "998": "Uzbekistan"
};
const DEFAULT_CCS = ["91","971","966","968","973","974","965","977","880","94","92","234","27","98","60","62","44","31","34","36","1"];
// longest-first for prefix matching
const CC_PREFIXES = Object.keys(CC_NAMES).sort((a, b) => b.length - a.length || a.localeCompare(b));

function loadExtraCCs() {
  try {
    const arr = JSON.parse(localStorage.getItem("packlink-ccs") || "[]");
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
  } catch { return []; }
}
function persistExtraCC(cc) {
  if (!cc || DEFAULT_CCS.includes(cc)) return;
  const extra = loadExtraCCs();
  if (extra.includes(cc)) return;
  extra.push(cc);
  try { localStorage.setItem("packlink-ccs", JSON.stringify(extra)); } catch {}
}
/** Extract dialing country code digits from an E.164 phone (+91..., +971...). */
function extractCC(e164) {
  const d = String(e164 || "").replace(/\D/g, "");
  if (!d) return null;
  for (const p of CC_PREFIXES) {
    if (d.startsWith(p) && d.length > p.length + 4) return p;
  }
  // heuristic fallback for unknown countries
  if (d.startsWith("1") && d.length >= 11) return "1";
  if (d.length >= 12) return d.slice(0, 3);
  if (d.length >= 11) return d.slice(0, 2);
  return null;
}
function registerCCFromPhone(e164) {
  const cc = extractCC(e164);
  if (!cc || DEFAULT_CCS.includes(cc)) return;
  persistExtraCC(cc);
}
function allCountryCodes() {
  const set = new Set(DEFAULT_CCS);
  loadExtraCCs().forEach((c) => set.add(c));
  try {
    for (const id of membersMap.keys()) {
      const cc = extractCC(id);
      if (cc) set.add(cc);
    }
  } catch {}
  return [...set];
}
function rebuildCCSelect() {
  const sel = document.getElementById("cc");
  if (!sel) return;
  const prev = sel.value || "+91";
  const codes = allCountryCodes().sort((a, b) => {
    if (a === "91") return -1;
    if (b === "91") return 1;
    const na = CC_NAMES[a] || a, nb = CC_NAMES[b] || b;
    return na.localeCompare(nb) || a.localeCompare(b);
  });
  sel.innerHTML = codes.map((c) => {
    const label = CC_NAMES[c] ? `+${c} ${CC_NAMES[c]}` : `+${c}`;
    return `<option value="+${c}">${label}</option>`;
  }).join("");
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
  else sel.value = "+91";
}
// initial populate (membersMap may be empty; still shows defaults + localStorage)
rebuildCCSelect();

/* ---------- login (OTP) ---------- */
let confirmation = null, verifier = null, resendT;
const loginErr = (m) => ($("#loginErr").textContent = m || "");
const niceErr = (e) => ({
  "auth/invalid-phone-number": "Enter a valid mobile number.",
  "auth/too-many-requests": "Too many attempts. Try again after some time.",
  "auth/invalid-verification-code": "Wrong OTP. Check and try again.",
  "auth/code-expired": "OTP expired. Tap Resend OTP.",
  "auth/network-request-failed": "No internet connection."
}[e.code] || e.message || "Something went wrong");

function startResendTimer() {
  let s = 30; const b = $("#resend"); b.disabled = true;
  clearInterval(resendT);
  resendT = setInterval(() => { s--; b.textContent = s > 0 ? `Resend in ${s}s` : "Resend OTP"; if (s <= 0) { b.disabled = false; clearInterval(resendT); } }, 1000);
  b.textContent = "Resend in 30s";
}
async function sendOtp() {
  const cc = $("#cc").value;
  let n = $("#phone").value.replace(/\D/g, "").replace(/^0+/, "");
  if (cc === "+91") { n = n.slice(-10); if (n.length !== 10) return loginErr("Enter your 10-digit mobile number."); }
  else if (n.length < 6 || n.length > 13) return loginErr("Enter a valid mobile number.");
  loginErr(""); $("#sendOtp").disabled = true; $("#sendOtp").textContent = "Sending…";
  try {
    try { verifier?.clear(); } catch {}
    $("#recaptcha").innerHTML = "";
    verifier = new RecaptchaVerifier(auth, "recaptcha", { size: "invisible" });
    confirmation = await signInWithPhoneNumber(auth, cc + n, verifier);
    $("#sentTo").textContent = cc + " " + n;
    $("#stepPhone").classList.add("hide"); $("#stepOtp").classList.remove("hide"); $("#login")?.classList.add("otp-step");
    $("#otp").focus(); startResendTimer();
  } catch (e) { loginErr(niceErr(e)); }
  $("#sendOtp").disabled = false; $("#sendOtp").textContent = "Send OTP";
}
$("#sendOtp").onclick = sendOtp;
$("#resend").onclick = sendOtp;
$("#changeNum").onclick = () => { $("#stepOtp").classList.add("hide"); $("#stepPhone").classList.remove("hide"); $("#login")?.classList.remove("otp-step"); loginErr(""); };
$("#phone").addEventListener("keydown", (e) => { if (e.key === "Enter") sendOtp(); });
let verifying = false;
async function verifyOtp() {
  if (verifying) return;
  const code = $("#otp").value.trim();
  if (code.length !== 6) return loginErr("Enter the 6-digit OTP.");
  verifying = true;
  loginErr(""); $("#verifyOtp").disabled = true; $("#verifyOtp").textContent = "Verifying…";
  try { await confirmation.confirm(code); } catch (e) { loginErr(niceErr(e)); }
  verifying = false;
  $("#verifyOtp").disabled = false; $("#verifyOtp").textContent = "Verify and sign in";
}
$("#verifyOtp").onclick = verifyOtp;
$("#otp").addEventListener("input", (e) => { if (e.target.value.length === 6) verifyOtp(); });

/* ---------- session ---------- */
let me = null, isAdmin = false, unsubs = [], booted = false;
const showSplash = (v) => { const s = $("#splash"); if (v) { s.classList.remove("out"); s.style.display = "flex"; } else { s.classList.add("out"); setTimeout(() => (s.style.display = "none"), 260); } };
const isUnlocked = () => sessionStorage.getItem("packlink_unlocked") === "1";
const setUnlocked = (v) => { if (v) sessionStorage.setItem("packlink_unlocked", "1"); else sessionStorage.removeItem("packlink_unlocked"); };

async function maybeShowAppLock(phone) {
  const cred = loadDeviceCred();
  if (!cred || !cred.pinHash || cred.phone !== phone) {
    setUnlocked(true);
    return false;
  }
  if (isUnlocked()) return false;
  $("#app")?.classList.add("hide");
  $("#login")?.classList.add("hide");
  $("#landing")?.classList.add("hide");
  $("#pending")?.classList.add("hide");
  $("#appLock")?.classList.remove("hide");
  if ($("#lockPin")) $("#lockPin").value = "";
  const bio = $("#lockBio");
  if (bio) bio.style.display = (cred.bio && bioSupported()) ? "block" : "none";
  return true;
}

async function tryUnlockWithPin(pin) {
  const cred = loadDeviceCred();
  if (!cred || !cred.pinHash) return true;
  const h = await hashPin(pin);
  return h === cred.pinHash;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    teardown();
    $("#app").classList.add("hide");
    $("#login").classList.add("hide");
    $("#pending")?.classList.add("hide");
    $("#landing")?.classList.remove("hide");
    showSplash(false);
    refreshInstallUI();
    return;
  }
  try {
    const phone = user.phoneNumber;
    const mref = doc(db, "members", phone);
    let snap = null;
    try { snap = await getDoc(mref); } catch {}
    if (phone === SUPER_ADMIN && !(snap && snap.exists())) {
      await setDoc(mref, {
        mobile: phone, name: "Admin", company: "", designation: "", department: "",
        role: "admin", active: true, createdAt: serverTimestamp()
      });
      snap = await getDoc(mref);
    }
    if (!snap || !snap.exists() || snap.data().active === false) {
      // Not registered / inactive → create access request and show pending screen
      try {
        await setDoc(doc(db, "accessRequests", phone), {
          mobile: phone,
          requestedAt: serverTimestamp(),
          status: "pending"
        }, { merge: true });
      } catch (_) {}
      showPending(phone);
      return;
    }
    // Registered and active
    $("#pending")?.classList.add("hide");
    if (booted) return;
    booted = true;
    me = { id: phone, ...snap.data() };
    isAdmin = me.role === "admin" || phone === SUPER_ADMIN;
    $("#login").classList.add("hide");
    $("#landing")?.classList.add("hide");

    // Remember this device phone for quick return
    const existing = loadDeviceCred() || {};
    saveDeviceCred({ ...existing, phone });

    const locked = await maybeShowAppLock(phone);
    if (!locked) {
      $("#appLock")?.classList.add("hide");
      $("#app").classList.remove("hide");
      // First OTP login on this device → gently offer PIN setup
      if (!existing.pinHash) {
        setTimeout(() => {
          toast("Tip: set a PIN in Profile so you can unlock this device without OTP every time");
        }, 1200);
      }
    }

    refreshInstallUI();
    $("#tabAdmin").classList.toggle("hide", !isAdmin);
    // mark online / last active
    updateDoc(mref, { lastActive: serverTimestamp() }).catch(() => {});
    setInterval(() => {
      if (me) updateDoc(doc(db, "members", me.id), { lastActive: serverTimestamp() }).catch(() => {});
    }, 120000);
    renderProfile(); startChat(); startChatSettings(); startJobs(); refreshNotifBtn();
    applyChatSendLock();
    // live watch of own record: removed or role changed by admin -> apply instantly
    unsubs.push(onSnapshot(mref, (d) => {
      if (!d.exists() || d.data().active === false) {
        if (phone !== SUPER_ADMIN) { signOut(auth); toast("You were removed by the admin"); }
        return;
      }
      me = { id: phone, ...d.data() };
      const a = me.role === "admin" || phone === SUPER_ADMIN;
      if (a !== isAdmin) {
        isAdmin = a;
        $("#tabAdmin").classList.toggle("hide", !a);
        $("#chatSettingsBtn")?.classList.toggle("hide", !a);
        renderJobs();
        applyChatSendLock();
      }
      renderProfile();
    }, () => { signOut(auth); }));
  } catch (e) {
    loginErr(niceErr(e));
    await signOut(auth);
  } finally {
    showSplash(false);
  }
});

function showPending(phone) {
  $("#login")?.classList.add("hide");
  $("#landing")?.classList.add("hide");
  $("#app")?.classList.add("hide");
  const pend = $("#pending");
  if (pend) {
    pend.classList.remove("hide");
    const waNum = WA_CONTACT.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hello Admin, I want to register for PackLink.\n\nMy mobile: ${phone}\n\nI am attaching my current employment proof and Resume.`
    );
    const waLink = `https://wa.me/91${waNum}?text=${msg}`;
    const linkEl = $("#pendingWaLink");
    if (linkEl) {
      linkEl.href = waLink;
      linkEl.textContent = `WhatsApp ${WA_CONTACT}`;
    }
    // Watch for approval: when member doc appears, reload into app
    const unsub = onSnapshot(doc(db, "members", phone), (d) => {
      if (d.exists() && d.data().active !== false) {
        unsub();
        // Re-trigger auth state by forcing a small delay then location reload or re-boot
        window.location.reload();
      }
    });
    unsubs.push(unsub);
  } else {
    // fallback
    loginErr(`You are not registered in the app. Send WhatsApp to admin ${WA_CONTACT} with current employment proof and Resume.`);
    signOut(auth);
  }
}
function teardown() {
  unsubs.forEach((u) => u()); unsubs = []; booted = false; me = null; membersStarted = false;
  $("#chatList").innerHTML = ""; nodes.clear(); jobsData = [];
  firstLoad = true; oldestSnap = null; hasMore = true; unread = 0; setBadge();
  if ($("#cSearch")) $("#cSearch").value = "";
  if ($("#jSearch")) $("#jSearch").value = "";
  if ($("#mSearch")) $("#mSearch").value = "";
  jobFilter = "all";
  memberDesFilter = "all";
}
$("#logout").onclick = () => {
  const cred = loadDeviceCred();
  const hasPin = !!(cred && cred.pinHash && me && cred.phone === me.id);
  if (hasPin) {
    // Soft lock: keep Firebase session → next time only PIN (no OTP)
    confirmSheet(
      "Lock PackLink?",
      "You stay signed in on this device. Next time only your PIN is needed — no OTP.",
      "Lock",
      () => {
        setUnlocked(false);
        $("#app")?.classList.add("hide");
        $("#login")?.classList.add("hide");
        $("#landing")?.classList.add("hide");
        $("#pending")?.classList.add("hide");
        $("#appLock")?.classList.remove("hide");
        if ($("#lockPin")) $("#lockPin").value = "";
        if ($("#lockErr")) $("#lockErr").textContent = "";
        const bio = $("#lockBio");
        if (bio) bio.style.display = (cred.bio && bioSupported()) ? "block" : "none";
        toast("Locked — unlock with your PIN");
      }
    );
  } else {
    confirmSheet(
      "Log out?",
      "No PIN is set on this device, so the next login will need OTP. Set a PIN in Profile first if you want PIN-only unlock next time.",
      "Log out",
      () => {
        setUnlocked(false);
        signOut(auth);
      }
    );
  }
};
document.addEventListener("click", (e) => {
  if (e.target.id === "pendingLogout") signOut(auth);
});

/* App lock unlock */
async function doUnlock() {
  const pin = ($("#lockPin")?.value || "").trim();
  if (pin.length < 4) {
    if ($("#lockErr")) $("#lockErr").textContent = "Enter your 4–8 digit PIN";
    return;
  }
  const ok = await tryUnlockWithPin(pin);
  if (!ok) {
    if ($("#lockErr")) $("#lockErr").textContent = "Wrong PIN";
    return;
  }
  setUnlocked(true);
  $("#appLock")?.classList.add("hide");
  if ($("#lockErr")) $("#lockErr").textContent = "";
  $("#app")?.classList.remove("hide");
}
$("#lockUnlock")?.addEventListener("click", doUnlock);
$("#lockPin")?.addEventListener("keydown", (e) => { if (e.key === "Enter") doUnlock(); });
// Full sign-out from lock screen → clears session; next login needs OTP (PIN can still be kept on device)
$("#lockLogout")?.addEventListener("click", () => {
  confirmSheet(
    "Sign out completely?",
    "This clears your session. Next login will need OTP. Your PIN on this device is kept so you can unlock after OTP.",
    "Sign out",
    () => {
      setUnlocked(false);
      signOut(auth);
    }
  );
});
$("#lockBio")?.addEventListener("click", async () => {
  // Soft biometric gate: if device supports WebAuthn, prompt a platform authenticator
  // (does not replace PIN; success unlocks this session)
  try {
    if (!bioSupported()) return toast("Not supported on this device");
    await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        timeout: 60000,
        userVerification: "required",
        rpId: location.hostname
      }
    }).catch(() => null);
    // Many browsers throw if no credential registered — treat PIN as primary
    toast("Use PIN if fingerprint is not set up yet");
  } catch {
    toast("Use your PIN to unlock");
  }
});

/* Device-step on login screen */
$("#devPinLogin")?.addEventListener("click", async () => {
  const pin = ($("#devPin")?.value || "").trim();
  if (pin.length < 4) return loginErr("Enter your PIN");
  const ok = await tryUnlockWithPin(pin);
  if (!ok) return loginErr("Wrong PIN");
  // PIN correct: still need an active Firebase session. If none, fall through to OTP for that number.
  const cred = loadDeviceCred();
  if (auth.currentUser && auth.currentUser.phoneNumber === cred?.phone) {
    setUnlocked(true);
    loginErr("");
    return; // onAuthStateChanged will open app
  }
  // Pre-fill and send OTP for remembered number
  loginErr("PIN OK. Sending OTP once to restore your session…");
  if (cred?.phone) {
    const digits = cred.phone.replace(/\D/g, "");
    const local = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits.slice(-10);
    if ($("#phone")) $("#phone").value = local;
    if ($("#cc") && cred.phone.startsWith("+")) {
      const ccVal = "+" + cred.phone.replace(/\D/g, "").slice(0, cred.phone.length - 10);
      // keep +91 default if present
    }
    $("#stepDevice")?.classList.add("hide");
    $("#stepPhone")?.classList.remove("hide");
    sendOtp();
  }
});
$("#devUseOtp")?.addEventListener("click", () => {
  const cred = loadDeviceCred();
  $("#stepDevice")?.classList.add("hide");
  $("#stepPhone")?.classList.remove("hide");
  if (cred?.phone && $("#phone")) {
    const digits = cred.phone.replace(/\D/g, "");
    $("#phone").value = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits.slice(-10);
  }
  loginErr("");
});
$("#devOtherNum")?.addEventListener("click", () => {
  $("#stepDevice")?.classList.add("hide");
  $("#stepPhone")?.classList.remove("hide");
  if ($("#phone")) $("#phone").value = "";
  loginErr("");
});

/* Profile: save PIN / bio / clear device / delete account */
$("#savePin")?.addEventListener("click", async () => {
  const p1 = ($("#ePin")?.value || "").trim();
  const p2 = ($("#ePin2")?.value || "").trim();
  if (p1.length < 4 || p1.length > 8 || !/^\d+$/.test(p1)) return toast("PIN must be 4–8 digits");
  if (p1 !== p2) return toast("PIN confirmation does not match");
  if (!me) return;
  const pinHash = await hashPin(p1);
  const prev = loadDeviceCred() || {};
  saveDeviceCred({ ...prev, phone: me.id, pinHash, bio: !!prev.bio });
  if ($("#ePin")) $("#ePin").value = "";
  if ($("#ePin2")) $("#ePin2").value = "";
  setUnlocked(true); // stay inside the app after saving PIN (you are already logged in)
  toast("PIN saved. Use Log out to lock — next time only PIN, no OTP");
  refreshBioBtn();
});
function refreshBioBtn() {
  const b = $("#bioBtn");
  if (!b) return;
  const cred = loadDeviceCred();
  if (!bioSupported()) {
    b.textContent = "Not supported";
    b.disabled = true;
    return;
  }
  b.disabled = false;
  b.textContent = cred?.bio ? "On · tap to disable" : "Enable";
}
$("#bioBtn")?.addEventListener("click", () => {
  if (!bioSupported()) return toast("Fingerprint / face not available in this browser");
  const prev = loadDeviceCred() || {};
  if (!prev.pinHash) return toast("Set a PIN first");
  const next = !prev.bio;
  saveDeviceCred({ ...prev, bio: next });
  toast(next ? "Fingerprint / face unlock preferred on this device" : "Fingerprint unlock disabled");
  refreshBioBtn();
});
$("#clearDeviceLogin")?.addEventListener("click", () => {
  clearDeviceCred();
  setUnlocked(false);
  if ($("#ePin")) $("#ePin").value = "";
  if ($("#ePin2")) $("#ePin2").value = "";
  refreshBioBtn();
  toast("Saved login removed from this device");
});
$("#deleteAccount")?.addEventListener("click", () => {
  if (!me) return;
  sheet(`<h3>Delete account</h3>
    <p style="margin:0 0 12px;font-size:14px;color:var(--muted)">This permanently removes <b>${esc(me.id)}</b> from PackLink. You will need admin approval to join again.</p>
    <div class="field"><label>Type DELETE to confirm</label><input id="delConfirm" maxlength="10" placeholder="DELETE" autocomplete="off"></div>
    <div class="acts">
      <button class="btn sm danger" id="delGo">Delete forever</button>
      <button class="btn sm ghost" id="delNo">Cancel</button>
    </div>`);
  $("#delNo").onclick = () => closeSheet();
  $("#delGo").onclick = async () => {
    if (($("#delConfirm")?.value || "").trim() !== "DELETE") return toast('Type DELETE in capital letters');
    try {
      const id = me.id;
      const b = writeBatch(db);
      b.delete(doc(db, "members", id));
      b.delete(doc(db, "memberPrivate", id));
      b.delete(doc(db, "accessRequests", id));
      await b.commit();
      clearDeviceCred();
      setUnlocked(false);
      closeSheet();
      toast("Account deleted");
      await signOut(auth);
    } catch {
      toast("Could not delete account");
    }
  };
});
// refresh bio button when profile opens
const _origTabs = $("#tabs");
document.addEventListener("click", (e) => {
  if (e.target.closest?.("#tabs button[data-p='profile']")) setTimeout(refreshBioBtn, 50);
});

/* ---------- tabs ---------- */
const titles = { chat: "Chats", members: "Members", jobs: "Jobs", resume: "Resume", profile: "Profile", admin: "Admin" };
let curPage = "chat";
$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return; const p = b.dataset.p; curPage = p;
  $$("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
  $$(".page").forEach((x) => x.classList.toggle("on", x.id === "page-" + p));
  $("#pageTitle").textContent = titles[p];
  if (p === "chat") { markRead(); scrollDown(); }
  if (p === "members" || p === "admin") startMembers();
  if (p === "admin") startPending();
  if (p === "profile") refreshNotifBtn();
  if (p === "resume") loadResume();
});
document.addEventListener("click", (e) => {
  if (e.target.id === "goProfile") {
    const btn = $("#tabs button[data-p='profile']");
    if (btn) btn.click();
  }
});

/* ==================== CHAT ==================== */
const PAGE = 40;
const REACT_EMOJIS = ["👍", "❤️", "👏", "🔥"];
const nodes = new Map();
let oldestSnap = null, hasMore = true, loadingOlder = false, firstLoad = true, unread = 0, lastReadMs = 0;
const list = $("#chatList");
const nearBottom = () => list.scrollHeight - list.scrollTop - list.clientHeight < 120;
const scrollDown = () => requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; $("#toBottom").classList.add("hide"); markRead(); });
const setBadge = () => { const b = $("#unread"); b.textContent = unread > 99 ? "99+" : unread; b.classList.toggle("hide", !unread); };
const tsOf = (d) => (d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : Number.MAX_SAFE_INTEGER);

function markRead() {
  if (!me) return;
  const now = Date.now();
  if (now - lastReadMs < 3000) return;
  lastReadMs = now;
  unread = 0; setBadge();
  updateDoc(doc(db, "members", me.id), { lastReadAt: serverTimestamp() }).catch(() => {});
}

function reactHtml(d, id) {
  const reacts = d.reactions || {};
  const parts = REACT_EMOJIS.map((e) => {
    const users = reacts[e] || [];
    const on = users.includes(me?.id);
    const count = users.length;
    return `<button type="button" class="react ${on ? "on" : ""}" data-react="${e}" data-mid="${id}" title="${count ? count + " reaction(s)" : "React"}">${e}${count ? " " + count : ""}</button>`;
  }).join("");
  return `<div class="reacts">${parts}</div>`;
}

function buildNode(id, d, pending) {
  const mine = d.senderPhone === me.id, el = document.createElement("div");
  el.className = "row " + (mine ? "mine" : "other"); el.dataset.id = id; el.dataset.ts = tsOf(d);
  el.dataset.text = ((d.senderName || "") + " " + (d.text || "") + (d.imageURL ? " photo image" : "")).toLowerCase();
  const ms = tsOf(d), time = ms === Number.MAX_SAFE_INTEGER ? "" : fmtTime(ms);
  let body;
  if (d.deleted) body = `<div class="txt gone">🚫 This message was deleted</div>`;
  else body = (d.imageURL ? `<img class="pic" loading="lazy" src="${esc(d.imageURL)}" alt="photo">` : "") + (d.text ? `<div class="txt">${linkify(d.text)}</div>` : "") + (d.deleted ? "" : reactHtml(d, id));
  el.innerHTML = `<div class="bub">${mine ? "" : `<div class="who" style="color:${colorOf(d.senderPhone)}">${esc(d.senderName || d.senderPhone)}</div>`}${body}<div class="meta"><span>${time}</span>${mine ? `<span>${pending ? "🕓" : "✓"}</span>` : ""}</div></div>`;
  el.querySelector(".bub").addEventListener("click", (e) => {
    if (e.target.closest("a") || e.target.closest(".react")) return;
    const img = e.target.closest(".pic"); if (img) return sheet(`<img class="full" src="${esc(img.src)}" alt=""><div class="acts"><button class="btn sm ghost" onclick="document.getElementById('scrim').classList.remove('on')">Close</button></div>`);
    if (d.deleted) return;
    const canDelete = mine || isAdmin;
    sheet(`<h3>Message options</h3>
      <div class="acts" style="flex-direction:column;align-items:stretch">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${REACT_EMOJIS.map((em) => `<button class="btn sm ghost" data-r="${em}">${em}</button>`).join("")}</div>
        ${canDelete ? `<button class="btn sm danger" id="msgDel">Delete for everyone</button>` : ""}
        <button class="btn sm ghost" id="msgReport">Report</button>
        <button class="btn sm ghost" onclick="document.getElementById('scrim').classList.remove('on')">Close</button>
      </div>`);
    $$("#sheet [data-r]").forEach((b) => b.onclick = () => { closeSheet(); toggleReact(id, d, b.dataset.r); });
    if (canDelete) $("#msgDel").onclick = () => { closeSheet(); confirmSheet("Delete message?", mine ? "This will delete the message for everyone." : "Delete this member's message for everyone?", "Delete", () =>
      updateDoc(doc(db, "messages", id), { deleted: true, text: "", imageURL: "", reactions: {} }).catch(() => toast("Could not delete"))); };
    $("#msgReport").onclick = () => { closeSheet(); toast("Reported to admin. Thank you."); };
  });
  el.querySelectorAll(".react").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); toggleReact(id, d, btn.dataset.react); });
  });
  return el;
}
async function toggleReact(id, d, emoji) {
  const reacts = { ...(d.reactions || {}) };
  const arr = [...(reacts[emoji] || [])];
  const i = arr.indexOf(me.id);
  if (i >= 0) arr.splice(i, 1); else arr.push(me.id);
  if (arr.length) reacts[emoji] = arr; else delete reacts[emoji];
  try { await updateDoc(doc(db, "messages", id), { reactions: reacts }); } catch { toast("Could not react"); }
}
function insertNode(id, d, pending) {
  const el = buildNode(id, d, pending), ts = +el.dataset.ts;
  let i = list.lastElementChild;
  while (i && (i.classList.contains("older") || +i.dataset.ts > ts)) { if (i.classList.contains("older")) break; i = i.previousElementSibling; }
  if (i && !i.classList.contains("older")) i.after(el); else { const o = list.querySelector(".older"); o ? o.after(el) : list.prepend(el); }
  nodes.set(id, el);
  applyChatSearch();
}
function startChat() {
  lastReadMs = me.lastReadAt?.toMillis ? me.lastReadAt.toMillis() : 0;
  const q = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(PAGE));
  unsubs.push(onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
    const stick = nearBottom() || firstLoad;
    let newFromOthers = 0, added = false;
    snap.docChanges().forEach((ch) => {
      const d = ch.doc.data(), id = ch.doc.id, pending = ch.doc.metadata.hasPendingWrites;
      if (ch.type === "added" && !nodes.has(id)) {
        insertNode(id, d, pending); added = true;
        if (!firstLoad && d.senderPhone !== me.id) {
          newFromOthers++;
          notifyNewMsg(d.senderName, d.text || (d.imageURL ? "📷 Photo" : "New message"));
        }
      } else if (ch.type === "modified" || nodes.has(id)) {
        const old = nodes.get(id); if (!old) return;
        const fresh = buildNode(id, d, pending);
        if (old.innerHTML !== fresh.innerHTML || old.dataset.ts !== fresh.dataset.ts) { old.replaceWith(fresh); nodes.set(id, fresh); applyChatSearch(); }
      }
    });
    if (firstLoad) {
      oldestSnap = snap.docs[snap.docs.length - 1] || null; hasMore = snap.size >= PAGE;
      if (hasMore) { const o = document.createElement("div"); o.className = "older"; o.textContent = "Scroll up for older messages"; list.prepend(o); }
      // count unread from lastReadAt
      let u = 0;
      snap.docs.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.senderPhone !== me.id && tsOf(d) > lastReadMs) u++;
      });
      unread = u; setBadge();
      firstLoad = false;
      if (!snap.metadata.fromCache || snap.size) scrollDown();
    } else if (added) {
      const lastMine = snap.docChanges().some((c) => c.type === "added" && c.doc.data().senderPhone === me.id);
      if (stick || lastMine) scrollDown(); else if (newFromOthers) $("#toBottom").classList.remove("hide");
      if (newFromOthers && curPage !== "chat") { unread += newFromOthers; setBadge(); }
      else if (curPage === "chat" && stick) markRead();
    }
  }, (err) => console.error("chat", err)));
}
function applyChatSearch() {
  const q = ($("#cSearch")?.value || "").trim().toLowerCase();
  let hits = 0, total = 0;
  nodes.forEach((el) => {
    total++;
    const show = !q || (el.dataset.text || "").includes(q);
    el.classList.toggle("hide-search", !show);
    if (show && q) hits++;
  });
  const hit = $("#chatSearchHit");
  if (!hit) return;
  if (!q) { hit.classList.add("hide"); hit.textContent = ""; }
  else { hit.classList.remove("hide"); hit.textContent = hits + " match" + (hits === 1 ? "" : "es"); }
}
$("#cSearch")?.addEventListener("input", applyChatSearch);
list.addEventListener("scroll", () => {
  if (nearBottom()) { $("#toBottom").classList.add("hide"); if (curPage === "chat") markRead(); }
  if (list.scrollTop < 100 && hasMore && !loadingOlder && oldestSnap) loadOlder();
}, { passive: true });
$("#toBottom").onclick = scrollDown;
async function loadOlder() {
  loadingOlder = true;
  try {
    const s = await getDocs(query(collection(db, "messages"), orderBy("createdAt", "desc"), startAfter(oldestSnap), limit(PAGE)));
    const before = list.scrollHeight, top = list.scrollTop;
    s.docs.forEach((d) => { if (!nodes.has(d.id)) insertNode(d.id, d.data(), false); });
    if (s.docs.length) oldestSnap = s.docs[s.docs.length - 1];
    hasMore = s.size >= PAGE; if (!hasMore) list.querySelector(".older")?.remove();
    list.scrollTop = top + (list.scrollHeight - before);
  } catch (e) { console.error(e); }
  loadingOlder = false;
}
let chatOnlyAdmins = false;
function applyChatSendLock() {
  const locked = chatOnlyAdmins && !isAdmin;
  const composer = document.querySelector(".composer");
  if (composer) composer.classList.toggle("disabled", locked);
  const banner = $("#chatOnlyAdminsBanner");
  if (banner) banner.classList.toggle("hide", !locked);
  const msg = $("#msg");
  if (msg) {
    msg.disabled = locked;
    msg.placeholder = locked ? "Only admins can send messages" : "Message";
  }
  if ($("#attachBtn")) $("#attachBtn").disabled = locked;
  if ($("#sendBtn")) $("#sendBtn").disabled = locked;
}
function startChatSettings() {
  $("#chatSettingsBtn")?.classList.toggle("hide", !isAdmin);
  unsubs.push(onSnapshot(doc(db, "settings", "chat"), (s) => {
    chatOnlyAdmins = !!(s.exists() && s.data().onlyAdminsCanSend);
    applyChatSendLock();
  }, () => {}));
}
$("#chatSettingsBtn")?.addEventListener("click", () => {
  if (!isAdmin) return;
  sheet(`<h3>Chat settings</h3>
    <p style="margin:0 0 14px;font-size:13px;color:var(--muted)">Control who can send messages in the group chat (like WhatsApp group admin).</p>
    <label class="check-row" style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;cursor:pointer">
      <input type="checkbox" id="setOnlyAdmins" ${chatOnlyAdmins ? "checked" : ""} style="margin-top:3px">
      <span>Only admins can send messages<br><small style="color:var(--muted);font-weight:400">Members can still read and react</small></span>
    </label>
    <div class="acts">
      <button class="btn sm" id="chatSetSave">Save</button>
      <button class="btn sm ghost" onclick="document.getElementById('scrim').classList.remove('on')">Cancel</button>
    </div>`);
  $("#chatSetSave").onclick = async () => {
    const val = !!$("#setOnlyAdmins")?.checked;
    try {
      await setDoc(doc(db, "settings", "chat"), { onlyAdminsCanSend: val, updatedAt: serverTimestamp(), updatedBy: me.id }, { merge: true });
      closeSheet();
      toast(val ? "Only admins can send messages now" : "Everyone can send messages again");
    } catch { toast("Could not save settings"); }
  };
});

async function sendMsg(extra = {}) {
  if (chatOnlyAdmins && !isAdmin) return toast("Only admins can send messages right now");
  const t = $("#msg").value.trim();
  if (!t && !extra.imageURL) return;
  const data = { senderPhone: me.id, senderName: me.name || me.id, createdAt: serverTimestamp(), deleted: false, reactions: {}, ...extra };
  if (t) data.text = t;
  $("#msg").value = ""; autosize();
  try { await addDoc(collection(db, "messages"), data); markRead(); } catch (e) { toast("Message not sent"); if (t) $("#msg").value = t; }
}
const autosize = () => { const m = $("#msg"); m.style.height = "auto"; m.style.height = Math.min(m.scrollHeight, 120) + "px"; };
$("#msg").addEventListener("input", autosize);
$("#msg").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(hover:hover)").matches) { e.preventDefault(); sendMsg(); } });
$("#sendBtn").onclick = () => { sendMsg(); $("#msg").focus(); };

/* Image attach for chat */
$("#attachBtn")?.addEventListener("click", () => {
  if (chatOnlyAdmins && !isAdmin) return toast("Only admins can send messages right now");
  $("#chatImgIn")?.click();
});
$("#chatImgIn")?.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  e.target.value = "";
  if (!f) return;
  // Some Android galleries return empty type for HEIC/JPEG — still try
  const looksImage = !f.type || f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name || "");
  if (!looksImage) return toast("Please choose an image");
  if (f.size > 12 * 1024 * 1024) return toast("Image too large (max 12 MB)");
  if (chatOnlyAdmins && !isAdmin) return toast("Only admins can send messages right now");
  if (!me?.id) return toast("Not signed in");
  try {
    toast("Uploading photo…");
    let blob;
    try {
      blob = await shrink(f, 1280, 0.82);
    } catch (shrinkErr) {
      console.warn("shrink failed, using original", shrinkErr);
      if (f.size >= 5 * 1024 * 1024) throw new Error("Image too large to upload without compression");
      blob = f;
    }
    if (!blob || blob.size < 10) throw new Error("Empty image data");
    const name = `${Date.now()}.jpg`;
    const r = sref(storage, `chat/${me.id}/${name}`);
    await uploadBytes(r, blob, { contentType: "image/jpeg" });
    const url = await getDownloadURL(r);
    await sendMsg({ imageURL: String(url) });
    toast("Photo sent");
  } catch (err) {
    console.error("chat photo upload", err);
    const code = err?.code || "";
    const msg = err?.message || String(err);
    if (code === "storage/unauthorized" || /permission|unauthorized/i.test(msg)) {
      toast("Upload blocked — deploy storage.rules or check login");
    } else if (code === "storage/canceled") {
      toast("Upload canceled");
    } else if (/network|offline|Failed to fetch/i.test(msg)) {
      toast("Network error — try again");
    } else {
      toast("Photo upload failed: " + (code || msg).slice(0, 80));
    }
  }
});

/* ==================== MEMBERS ==================== */
let membersMap = new Map(), membersStarted = false, membersReady = null;
let memberDesFilter = "all";
function startMembers() {
  if (membersStarted) return membersReady; membersStarted = true;
  membersReady = new Promise((res) => {
    unsubs.push(onSnapshot(collection(db, "members"), (s) => {
      membersMap = new Map(s.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
      // discover country codes from member phones and refresh login dropdown
      for (const id of membersMap.keys()) registerCCFromPhone(id);
      rebuildCCSelect();
      renderMembers(); renderAdmins(); res();
    }, () => res()));
  });
  return membersReady;
}
const avStyle = (m) => m.photoURL ? `background-image:url('${esc(m.photoURL)}')` : `background:${colorOf(m.id)}`;
/** Full number for admins; masked for everyone else (e.g. +91•••••4283) */
function displayPhone(phone, forceFull = false) {
  const p = String(phone || "");
  if (!p) return "";
  if (forceFull || isAdmin) return p;
  const digits = p.replace(/\D/g, "");
  if (digits.length < 6) return "••••••";
  const last = digits.slice(-4);
  const ccMatch = p.match(/^\+\d{1,3}/);
  const cc = ccMatch ? ccMatch[0] : (digits.length >= 12 ? "+" + digits.slice(0, digits.length - 10) : "");
  return (cc || "") + "•••••" + last;
}
function isOnline(m) {
  if (!m.lastActive?.toMillis) return false;
  return Date.now() - m.lastActive.toMillis() < 3 * 60 * 1000;
}
function lastSeenText(m) {
  if (isOnline(m)) return "Online";
  if (!m.lastActive?.toMillis) return "";
  const ms = m.lastActive.toMillis();
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 60) return `Last seen ${mins || 1}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last seen ${hrs}h ago`;
  return `Last seen ${fmtTime(ms)}`;
}
function uniqueDesignations() {
  const set = new Set();
  for (const m of membersMap.values()) {
    if (m.active === false) continue;
    const d = (m.designation || "").trim();
    if (d) set.add(d);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
function renderDesFilters() {
  const el = $("#mFilters");
  if (!el) return;
  const list = uniqueDesignations();
  const chips = [`<button type="button" class="chip ${memberDesFilter === "all" ? "on" : ""}" data-des="all">All</button>`];
  for (const d of list) {
    chips.push(`<button type="button" class="chip ${memberDesFilter === d ? "on" : ""}" data-des="${esc(d)}">${esc(d)}</button>`);
  }
  el.innerHTML = chips.join("");
}
let memberSelectMode = false;
const selectedMembers = new Set();

function updateMemberAdminBar() {
  const bar = $("#memberAdminBar");
  if (!bar) return;
  bar.classList.toggle("hide", !isAdmin);
  const tog = $("#mSelectToggle");
  const bulk = $("#mBulkDelete");
  const count = $("#mSelectCount");
  if (tog) tog.textContent = memberSelectMode ? "Cancel" : "Select";
  if (bulk) bulk.classList.toggle("hide", !memberSelectMode || selectedMembers.size === 0);
  if (count) {
    count.classList.toggle("hide", !memberSelectMode);
    count.textContent = memberSelectMode ? `${selectedMembers.size} selected` : "";
  }
}

function renderMembers() {
  const q = ($("#mSearch")?.value || "").trim().toLowerCase();
  renderDesFilters();
  updateMemberAdminBar();
  const arr = [...membersMap.values()].filter((m) => {
    if (m.active === false) return false;
    if (memberDesFilter !== "all") {
      const d = (m.designation || "").trim();
      if (d !== memberDesFilter) return false;
    }
    if (q && ![m.name, m.company, m.designation, m.department, m.mobile].join(" ").toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (isOnline(b) - isOnline(a)) || (a.name || "").localeCompare(b.name || ""));
  $("#mList").innerHTML = arr.length ? arr.map((m) => {
    const sel = selectedMembers.has(m.id);
    const check = (isAdmin && memberSelectMode)
      ? `<input type="checkbox" class="m-check" data-check="${esc(m.id)}" ${sel ? "checked" : ""} aria-label="Select">`
      : "";
    const sub = [m.company, m.designation, m.department].filter(Boolean).join(" · ") || displayPhone(m.mobile || m.id);
    return `<button class="item ${sel ? "selected" : ""}" data-id="${esc(m.id)}">${check}<div class="av" style="${avStyle(m)}">${m.photoURL ? "" : esc(initial(m.name))}</div><div><div class="t"><span class="dot ${isOnline(m) ? "" : "off"}"></span>${esc(m.name || displayPhone(m.id))}${m.role === "admin" ? '<span class="tag">Admin</span>' : ""}${m.openToMobility ? '<span class="mobility-badge">Open to mobility</span>' : ""}</div><div class="s">${esc(sub)}${lastSeenText(m) ? " · " + lastSeenText(m) : ""}</div></div></button>`;
  }).join("") : `<div class="empty">No members found.<br><small>Try a different search or designation filter.</small></div>`;
  // profile completeness banner
  const incomplete = me && (!me.photoURL || !me.about || !me.company);
  $("#profileBanner")?.classList.toggle("hide", !incomplete);
}
$("#mSearch").addEventListener("input", renderMembers);
$("#mFilters")?.addEventListener("click", (e) => {
  const c = e.target.closest(".chip");
  if (!c) return;
  memberDesFilter = c.dataset.des || "all";
  renderMembers();
});
$("#mSelectToggle")?.addEventListener("click", () => {
  if (!isAdmin) return;
  memberSelectMode = !memberSelectMode;
  if (!memberSelectMode) selectedMembers.clear();
  renderMembers();
});
$("#mBulkDelete")?.addEventListener("click", () => {
  if (!isAdmin || !selectedMembers.size) return;
  const ids = [...selectedMembers].filter((id) => id !== SUPER_ADMIN);
  if (!ids.length) return toast("Cannot remove the super admin");
  confirmSheet(
    `Delete ${ids.length} member${ids.length > 1 ? "s" : ""}?`,
    "They will be logged out and can no longer sign in. This cannot be undone.",
    "Delete",
    async () => {
      try {
        // Firestore batch max 500 ops; each member = 2 deletes
        const chunk = 200;
        for (let i = 0; i < ids.length; i += chunk) {
          const slice = ids.slice(i, i + chunk);
          const b = writeBatch(db);
          for (const id of slice) {
            b.delete(doc(db, "members", id));
            b.delete(doc(db, "memberPrivate", id));
          }
          await b.commit();
        }
        selectedMembers.clear();
        memberSelectMode = false;
        toast(`Removed ${ids.length} member${ids.length > 1 ? "s" : ""}`);
        renderMembers();
      } catch (e) {
        console.error(e);
        toast("Bulk delete failed");
      }
    }
  );
});
$("#mList").addEventListener("click", (e) => {
  const check = e.target.closest(".m-check");
  if (check) {
    e.preventDefault();
    e.stopPropagation();
    const id = check.dataset.check;
    if (selectedMembers.has(id)) selectedMembers.delete(id);
    else selectedMembers.add(id);
    renderMembers();
    return;
  }
  const b = e.target.closest(".item");
  if (!b) return;
  const id = b.dataset.id;
  if (memberSelectMode && isAdmin) {
    if (selectedMembers.has(id)) selectedMembers.delete(id);
    else selectedMembers.add(id);
    renderMembers();
    return;
  }
  openMember(id);
});

async function openMember(id) {
  const m = membersMap.get(id); if (!m) return;
  let priv = {};
  if (isAdmin) { try { const p = await getDoc(doc(db, "memberPrivate", id)); if (p.exists()) priv = p.data(); } catch {} }
  const kv = (k, v) => v ? `<div class="kv"><span>${k}</span><span>${esc(v)}</span></div>` : "";
  const isSuperM = id === SUPER_ADMIN;

  if (isAdmin) {
    // Editable admin form for any field
    sheet(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px"><div class="av big" style="${avStyle(m)};width:64px;height:64px;font-size:26px">${m.photoURL ? "" : esc(initial(m.name))}</div><div><h3 style="margin:0">${esc(m.name || id)}</h3><div class="s" style="color:var(--muted);margin-top:2px"><span class="dot ${isOnline(m) ? "" : "off"}"></span>${esc(lastSeenText(m) || "Offline")}</div><div class="s" style="color:var(--muted);font-size:12px;margin-top:2px">${esc(id)}</div></div></div>
      <p style="margin:0 0 10px;font-size:12px;color:var(--muted)">Tap any field to edit. Save when done.</p>
      <div class="field"><label>Name</label><input id="admName" maxlength="60" value="${esc(m.name || "")}"></div>
      <div class="field"><label>About</label><textarea id="admAbout" rows="2" maxlength="200">${esc(m.about || "")}</textarea></div>
      <div class="field"><label>Company</label><input id="admCompany" maxlength="80" value="${esc(m.company || "")}"></div>
      <div class="field"><label>Designation</label><input id="admDes" maxlength="60" value="${esc(m.designation || "")}"></div>
      <div class="field"><label>Department</label><input id="admDept" maxlength="60" value="${esc(m.department || "")}"></div>
      <div class="field"><label>Email (private)</label><input id="admEmail" type="email" maxlength="120" value="${esc(priv.email || "")}"></div>
      <div class="field"><label>CTC (private)</label><input id="admCtc" maxlength="40" value="${esc(priv.ctc || "")}"></div>
      <div class="field"><label>Start year</label><input id="admStartYear" type="number" min="1970" max="2030" value="${m.startYear ?? ""}"></div>
      <div class="field"><label>Date of birth</label><input id="admDob" type="date" value="${esc(m.dob || "")}"></div>
      <div class="field"><label>Target designation</label><input id="admTargetDes" maxlength="60" value="${esc(m.targetDesignation || "")}"></div>
      <div class="field"><label>Target CTC</label><input id="admTargetCtc" maxlength="40" value="${esc(m.targetCtc || "")}"></div>
      <label class="check-row" style="display:flex;align-items:center;gap:10px;margin:8px 0 14px;cursor:pointer">
        <input type="checkbox" id="admMobility" ${m.openToMobility ? "checked" : ""}>
        <span>Open to internal mobility / training</span>
      </label>
      <div class="acts" style="flex-wrap:wrap">
        <button class="btn sm" id="admSave">Save changes</button>
        <a class="btn sm" href="tel:${esc(id)}" style="text-decoration:none">Call</a>
        <a class="btn sm amber" href="https://wa.me/${esc(String(id).replace(/\D/g, ""))}" target="_blank" rel="noopener" style="text-decoration:none">WhatsApp</a>
        ${!isSuperM ? `<button class="btn sm ghost" id="mRole">${m.role === "admin" ? "Remove admin" : "Make admin"}</button><button class="btn sm danger" id="mDel">Remove member</button>` : ""}
        <button class="btn sm ghost" onclick="document.getElementById('scrim').classList.remove('on')">Close</button>
      </div>`);
    $("#admSave").onclick = async () => {
      const name = ($("#admName")?.value || "").trim();
      if (!name) return toast("Name cannot be empty");
      const data = {
        name,
        about: ($("#admAbout")?.value || "").trim(),
        company: ($("#admCompany")?.value || "").trim(),
        designation: ($("#admDes")?.value || "").trim(),
        department: ($("#admDept")?.value || "").trim(),
        startYear: ($("#admStartYear")?.value || "").trim() === "" ? null : Number($("#admStartYear").value),
        dob: ($("#admDob")?.value || "").trim(),
        targetDesignation: ($("#admTargetDes")?.value || "").trim(),
        targetCtc: ($("#admTargetCtc")?.value || "").trim(),
        openToMobility: !!$("#admMobility")?.checked
      };
      const email = ($("#admEmail")?.value || "").trim();
      const ctc = ($("#admCtc")?.value || "").trim();
      try {
        await updateDoc(doc(db, "members", id), data);
        await setDoc(doc(db, "memberPrivate", id), { email, ctc }, { merge: true });
        Object.assign(m, data);
        membersMap.set(id, { ...m, ...data });
        closeSheet();
        renderMembers();
        toast("Member updated");
      } catch (err) {
        console.error(err);
        toast("Could not save member");
      }
    };
    if (!isSuperM) {
      $("#mRole").onclick = () => { closeSheet(); updateDoc(doc(db, "members", id), { role: m.role === "admin" ? "member" : "admin" }).then(() => toast("Role updated")).catch(() => toast("Not allowed")); };
      $("#mDel").onclick = () => confirmSheet("Remove member?", `${m.name || id} will be logged out and can no longer sign in.`, "Remove", async () => {
        try { const b = writeBatch(db); b.delete(doc(db, "members", id)); b.delete(doc(db, "memberPrivate", id)); await b.commit(); toast("Member removed"); } catch { toast("Could not remove"); }
      });
    }
    return;
  }

  // Non-admin: read-only view — mobile number masked; no Call/WhatsApp (would expose full number)
  sheet(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><div class="av big" style="${avStyle(m)};width:64px;height:64px;font-size:26px">${m.photoURL ? "" : esc(initial(m.name))}</div><div><h3 style="margin:0">${esc(m.name || displayPhone(id))}${m.openToMobility ? ' <span class="mobility-badge">Open to mobility</span>' : ""}</h3><div class="s" style="color:var(--muted)">${esc(m.about || "")}</div><div class="s" style="color:var(--muted);margin-top:2px"><span class="dot ${isOnline(m) ? "" : "off"}"></span>${esc(lastSeenText(m) || "Offline")}</div></div></div>
    ${kv("Mobile", displayPhone(m.mobile || id))}${kv("Company", m.company)}${kv("Designation", m.designation)}${kv("Department", m.department)}
    ${m.startYear ? kv("Experience", (new Date().getFullYear() - Number(m.startYear)) + " years (since " + m.startYear + ")") : ""}
    ${m.dob ? kv("Date of birth", m.dob) : ""}
    ${m.targetDesignation ? kv("Target role", m.targetDesignation) : ""}
    ${m.targetCtc ? kv("Target CTC", m.targetCtc) : ""}
    <p style="margin:10px 0 0;font-size:12px;color:var(--muted)">Full mobile numbers are visible only to admins.</p>
    <div class="acts">
    <button class="btn sm ghost" onclick="document.getElementById('scrim').classList.remove('on')">Close</button></div>`);
}
function renderAdmins() {
  const a = [...membersMap.values()].filter((m) => m.role === "admin");
  $("#admList").innerHTML = a.map((m) => `<button class="item" data-id="${esc(m.id)}"><div class="av" style="${avStyle(m)}">${m.photoURL ? "" : esc(initial(m.name))}</div><div><div class="t">${esc(m.name || m.id)}</div><div class="s">${esc(m.mobile || m.id)}</div></div></button>`).join("") || `<div class="empty">No admins yet.</div>`;
}
$("#admList").addEventListener("click", (e) => { const b = e.target.closest(".item"); if (b) openMember(b.dataset.id); });

/* ---------- admin: pending access requests ---------- */
let pendingUnsub = null;
function startPending() {
  if (!isAdmin) return;
  if (pendingUnsub) return;
  pendingUnsub = onSnapshot(
    query(collection(db, "accessRequests"), orderBy("requestedAt", "desc"), limit(50)),
    (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.status === "pending" && !membersMap.has(r.id));
      const el = $("#pendingList");
      if (!el) return;
      if (!rows.length) {
        el.innerHTML = `<div class="empty">No pending requests.</div>`;
        return;
      }
      el.innerHTML = rows.map((r) => {
        const mob = r.mobile || r.id;
        const when = r.requestedAt?.toMillis ? fmtTime(r.requestedAt.toMillis()) : "";
        return `<div class="item" style="cursor:default">
          <div class="av" style="background:${colorOf(mob)}">${esc(initial(mob))}</div>
          <div style="flex:1">
            <div class="t">${esc(mob)}</div>
            <div class="s">Requested ${esc(when)}</div>
          </div>
          <button class="btn sm amber" data-approve="${esc(mob)}">Approve</button>
        </div>`;
      }).join("");
    },
    () => {}
  );
  unsubs.push(() => { if (pendingUnsub) { pendingUnsub(); pendingUnsub = null; } });
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-approve]");
  if (!btn || !isAdmin) return;
  const mob = btn.dataset.approve;
  if (!mob) return;
  btn.disabled = true;
  btn.textContent = "Approving…";
  try {
    await setDoc(doc(db, "members", mob), {
      mobile: mob,
      name: mob,
      company: "",
      designation: "",
      department: "",
      role: "member",
      active: true,
      addedBy: me.id,
      createdAt: serverTimestamp()
    }, { merge: true });
    await updateDoc(doc(db, "accessRequests", mob), { status: "approved", approvedAt: serverTimestamp(), approvedBy: me.id }).catch(() => {});
    // Open WhatsApp to the user with approval message (no API)
    const digits = String(mob).replace(/\D/g, "");
    const text = encodeURIComponent(
      `Your PackLink login has been approved.\n\nYou can now open the PackLink app and sign in with this mobile number.\n\nWelcome to the packaging professionals network.`
    );
    window.open(`https://wa.me/${digits}?text=${text}`, "_blank");
    toast("Member approved. WhatsApp opened.");
  } catch (err) {
    toast("Could not approve");
    btn.disabled = false;
    btn.textContent = "Approve";
  }
});

/* ---------- admin: Excel upload ---------- */
function normPhone(v) {
  const raw = String(v ?? "").trim(), d = raw.replace(/\D/g, "");
  let out = null;
  if (raw.startsWith("+") || raw.startsWith("00")) {
    const digits = raw.startsWith("00") ? d.replace(/^00/, "") : d;
    if (digits.length >= 8 && digits.length <= 15) out = "+" + digits;
  } else if (d.length === 10) {
    out = "+91" + d;
  } else if (d.length === 12 && d.startsWith("91")) {
    out = "+" + d;
  } else if (d.length === 11 && d[0] === "0") {
    out = "+91" + d.slice(1);
  }
  if (out) registerCCFromPhone(out);
  return out;
}
let parsed = [];
$("#xlIn").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  if (!window.XLSX) return toast("Excel reader still loading, try again");
  await startMembers();
  const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
  const seen = new Set(); parsed = []; let bad = 0, dup = 0;
  for (const r of rows) {
    const g = {}; Object.keys(r).forEach((k) => (g[k.toLowerCase().replace(/\s+/g, "")] = String(r[k]).trim()));
    const mob = normPhone(g["mobilenumber"] ?? g["mobile"] ?? g["phone"]);
    if (!mob) { bad++; continue; }
    if (seen.has(mob)) { dup++; continue; } seen.add(mob);
    parsed.push({ mob, name: g["name"] || mob, company: g["companyname"] || g["company"] || "", designation: g["designation"] || "", department: g["department"] || "", ctc: g["ctc"] || "", email: g["emailid"] || g["email"] || "", authority: g["authority"] || "", isNew: !membersMap.has(mob) });
  }
  const news = parsed.filter((p) => p.isNew).length;
  $("#xlPrev").innerHTML = `<p><b>${parsed.length}</b> valid numbers (${news} new, ${parsed.length - news} already added). ${bad} skipped (invalid number), ${dup} duplicates in file.</p>
    <div class="pw"><table class="prev"><tr><th>Mobile</th><th>Name</th><th>Company</th><th>Dept</th></tr>${parsed.slice(0, 8).map((p) => `<tr><td>${esc(p.mob)}</td><td>${esc(p.name)}</td><td>${esc(p.company)}</td><td>${esc(p.department)}</td></tr>`).join("")}</table></div>
    ${parsed.length ? `<button class="btn amber" id="xlGo">Add ${parsed.length} members</button>` : ""}`;
  $("#xlGo")?.addEventListener("click", uploadMembers);
});
async function uploadMembers() {
  const btn = $("#xlGo"); btn.disabled = true;
  try {
    const rows = parsed.filter((p) => p.mob !== SUPER_ADMIN); let done = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const b = writeBatch(db);
      rows.slice(i, i + 200).forEach((p) => {
        const pub = { mobile: p.mob, name: p.name, company: p.company, designation: p.designation, department: p.department, active: true, addedBy: me.id };
        if (p.isNew) { pub.role = "member"; pub.createdAt = serverTimestamp(); }
        b.set(doc(db, "members", p.mob), pub, { merge: true });
        b.set(doc(db, "memberPrivate", p.mob), { ctc: p.ctc, email: p.email, authority: p.authority }, { merge: true });
      });
      await b.commit(); done += Math.min(200, rows.length - i); btn.textContent = `Uploading ${done}/${rows.length}…`;
    }
    rows.forEach((p) => registerCCFromPhone(p.mob));
    rebuildCCSelect();
    toast(`${rows.length} members saved`); $("#xlPrev").innerHTML = ""; $("#xlIn").value = ""; parsed = [];
  } catch (e) { console.error(e); toast("Upload failed"); btn.disabled = false; }
}
$("#aAdd").onclick = async () => {
  const mob = normPhone($("#aMob").value); if (!mob) return toast("Enter a valid mobile number (add + and country code for non-India)");
  await startMembers();
  try {
    const isNew = !membersMap.has(mob);
    const d = { mobile: mob, name: $("#aName").value.trim() || mob, company: $("#aCo").value.trim(), designation: $("#aDes").value.trim(), department: $("#aDep").value.trim(), active: true, addedBy: me.id };
    if (isNew) { d.role = "member"; d.createdAt = serverTimestamp(); }
    await setDoc(doc(db, "members", mob), d, { merge: true });
    registerCCFromPhone(mob); rebuildCCSelect();
    ["#aMob", "#aName", "#aCo", "#aDes", "#aDep"].forEach((s) => ($(s).value = "")); toast("Member added");
  } catch { toast("Could not add member"); }
};

/* ---------- admin: Download members Excel ---------- */
$("#xlDownload")?.addEventListener("click", async () => {
  if (!window.XLSX) return toast("Excel library still loading, try again");
  await startMembers();
  const rows = [];
  for (const m of membersMap.values()) {
    if (m.active === false) continue;
    let priv = {};
    try {
      const p = await getDoc(doc(db, "memberPrivate", m.id));
      if (p.exists()) priv = p.data();
    } catch {}
    rows.push({
      "Mobile Number": m.mobile || m.id,
      "Name": m.name || "",
      "Company Name": m.company || "",
      "Designation": m.designation || "",
      "Department": m.department || "",
      "CTC": priv.ctc || "",
      "Email ID": priv.email || "",
      "Authority": priv.authority || "",
      "Start Year": m.startYear ?? "",
      "Experience Years": m.startYear ? (new Date().getFullYear() - Number(m.startYear)) : "",
      "Date of Birth": m.dob || "",
      "Target Designation": m.targetDesignation || "",
      "Target CTC": m.targetCtc || "",
      "Open to Mobility": m.openToMobility ? "Yes" : ""
    });
  }
  if (!rows.length) return toast("No members to download");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Members");
  XLSX.writeFile(wb, `PackLink-Members-${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast(`Downloaded ${rows.length} members`);
});

/* ==================== JOBS ==================== */
let jobsData = [], jobFilter = "all";
function startJobs() {
  unsubs.push(onSnapshot(query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(100)), (s) => { jobsData = s.docs.map((d) => ({ id: d.id, ...d.data() })); renderJobs(); }));
}
function renderJobs() {
  const q = ($("#jSearch")?.value || "").trim().toLowerCase();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let arr = jobsData.filter((j) => {
    if (jobFilter === "mine" && j.postedBy !== me?.id) return false;
    if (jobFilter === "recent" && !(j.createdAt?.toMillis && j.createdAt.toMillis() >= weekAgo)) return false;
    if (jobFilter === "urgent" && !j.urgent) return false;
    const skillText = Array.isArray(j.skills) ? j.skills.join(" ") : (j.skills || "");
    if (q && ![j.title, j.company, j.location, j.description, skillText].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
  $("#jList").innerHTML = arr.length ? arr.map((j) => {
    const interested = (j.interested || []).includes(me?.id);
    const icount = (j.interested || []).length;
    const skills = Array.isArray(j.skills) ? j.skills : (j.skills ? String(j.skills).split(",").map((s) => s.trim()).filter(Boolean) : []);
    const skillHtml = skills.length
      ? `<div class="job-skills">${skills.map((s) => `<span class="skill-chip">${esc(s)}</span>`).join("")}</div>`
      : "";
    const urgentTag = j.urgent ? `<span class="job-urgent">Urgent hire</span>` : "";
    return `<div class="card job"><h3>${esc(j.title)}${urgentTag}</h3><div class="co">${esc([j.company, j.location].filter(Boolean).join(" · "))}</div>${skillHtml}${j.description ? `<div class="d">${linkify(j.description)}</div>` : ""}
    <div class="f"><span>Posted by ${esc(j.postedByName || j.postedBy)}${j.createdAt?.toMillis ? " · " + fmtTime(j.createdAt.toMillis()) : ""}${icount ? " · " + icount + " interested" : ""}</span></div>
    <div class="acts" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">${j.contact ? `<a class="btn sm" style="text-decoration:none" href="tel:${esc(j.contact)}">Call</a><a class="btn sm amber" style="text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/${esc(String(j.contact).replace(/\D/g, ""))}">WhatsApp</a>` : ""}
    <button class="btn sm ${interested ? "amber" : "ghost"}" data-interest="${j.id}">${interested ? "✓ Interested" : "I'm interested"}</button>
    ${(j.postedBy === me?.id || isAdmin) ? `<button class="btn sm ghost" data-del="${j.id}">Delete</button>` : ""}</div></div>`;
  }).join("") : `<div class="empty">${jobsData.length ? "No jobs match your filters." : "No jobs posted yet. Tap “Post a job” to add the first one."}</div>`;
}
$("#jSearch")?.addEventListener("input", renderJobs);
document.querySelector(".filters")?.addEventListener("click", (e) => {
  const c = e.target.closest(".chip"); if (!c) return;
  jobFilter = c.dataset.filter;
  $$(".filters .chip").forEach((x) => x.classList.toggle("on", x === c));
  renderJobs();
});
$("#jList").addEventListener("click", async (e) => {
  const del = e.target.closest("[data-del]");
  if (del) return confirmSheet("Delete job?", "This removes the job for everyone.", "Delete", () => deleteDoc(doc(db, "jobs", del.dataset.del)).catch(() => toast("Not allowed")));
  const int = e.target.closest("[data-interest]");
  if (int) {
    const j = jobsData.find((x) => x.id === int.dataset.interest); if (!j) return;
    const arr = [...(j.interested || [])];
    const i = arr.indexOf(me.id);
    if (i >= 0) arr.splice(i, 1); else arr.push(me.id);
    try { await updateDoc(doc(db, "jobs", j.id), { interested: arr }); toast(i >= 0 ? "Removed interest" : "Marked interested"); } catch { toast("Could not update"); }
  }
});
$("#postJob").onclick = () => {
  sheet(`<h3>Post a job</h3>
   <p style="margin:0 0 12px;font-size:13px;color:var(--muted)">Any member (HR or individual) can post. Others can mark interested and contact you directly.</p>
   <div class="field"><label>Job title</label><input id="jT" maxlength="150" placeholder="e.g. Metallizer Operator"></div>
   <div class="field"><label>Company</label><input id="jC" value="${esc(me.company || "")}"></div>
   <div class="field"><label>Location</label><input id="jL"></div>
   <div class="field"><label>Required skills / tags</label><input id="jSkills" maxlength="200" placeholder="e.g. boat change, vacuum recovery, wire alignment"></div>
   <p style="margin:-6px 0 10px;font-size:12px;color:var(--muted)">Comma-separated. Helps candidates filter for trained operators.</p>
   <div class="field"><label>Details</label><textarea id="jD" rows="4" maxlength="2000"></textarea></div>
   <div class="field"><label>Contact number</label><input id="jN" type="tel" value="${esc(me.id)}"></div>
   <label class="check-row" style="display:flex;align-items:flex-start;gap:10px;margin:10px 0 14px;cursor:pointer">
     <input type="checkbox" id="jUrgent" style="margin-top:3px">
     <span>Mark as urgent hire<br><small style="color:var(--muted);font-weight:400">e.g. urgently need trained metallizer operators</small></span>
   </label>
   <div class="acts"><button class="btn sm" id="jGo">Post job</button><button class="btn sm ghost" id="jNo">Cancel</button></div>`);
  $("#jNo").onclick = closeSheet;
  $("#jGo").onclick = async () => {
    const title = $("#jT").value.trim(); if (!title) return toast("Enter a job title");
    const skillsRaw = ($("#jSkills")?.value || "").trim();
    const skills = skillsRaw ? skillsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    try {
      await addDoc(collection(db, "jobs"), {
        title,
        company: $("#jC").value.trim(),
        location: $("#jL").value.trim(),
        description: $("#jD").value.trim(),
        contact: $("#jN").value.trim(),
        skills,
        urgent: !!$("#jUrgent")?.checked,
        postedBy: me.id,
        postedByName: me.name || me.id,
        createdAt: serverTimestamp(),
        interested: []
      });
      closeSheet(); toast("Job posted");
    } catch { toast("Could not post job"); }
  };
};

/* ==================== PROFILE ==================== */
async function renderProfile() {
  if (!me) return;
  $("#who").textContent = me.name || "";
  const av = $("#pAv"); av.style.cssText = avStyle(me); av.textContent = me.photoURL ? "" : initial(me.name);
  $("#pName").textContent = me.name || me.id;
  $("#pMeta").textContent = [me.company, me.designation, me.department].filter(Boolean).join(" · ");
  $("#pMobile").textContent = me.id + (isAdmin ? " · Admin" : "");

  // Current role (read-only display)
  if ($("#pCurDes")) $("#pCurDes").textContent = me.designation || "—";
  if ($("#pCurCo")) $("#pCurCo").textContent = me.company || "—";
  let privCtc = "";
  try {
    const p = await getDoc(doc(db, "memberPrivate", me.id));
    if (p.exists() && p.data().ctc) privCtc = p.data().ctc;
  } catch {}
  if ($("#pCurCtc")) $("#pCurCtc").textContent = privCtc || "—";

  // Editable fields
  if (document.activeElement !== $("#eName")) $("#eName").value = me.name || "";
  if (document.activeElement !== $("#eAbout")) $("#eAbout").value = me.about || "";
  if ($("#eCompany") && document.activeElement !== $("#eCompany")) $("#eCompany").value = me.company || "";
  if ($("#eDes") && document.activeElement !== $("#eDes")) $("#eDes").value = me.designation || "";
  if ($("#eDept") && document.activeElement !== $("#eDept")) $("#eDept").value = me.department || "";
  if ($("#eStartYear") && document.activeElement !== $("#eStartYear")) $("#eStartYear").value = me.startYear ?? "";
  if ($("#eDob") && document.activeElement !== $("#eDob")) $("#eDob").value = me.dob || "";
  if ($("#eTargetDes") && document.activeElement !== $("#eTargetDes")) $("#eTargetDes").value = me.targetDesignation || "";
  if ($("#eTargetCtc") && document.activeElement !== $("#eTargetCtc")) $("#eTargetCtc").value = me.targetCtc || "";
  if ($("#eCurCtc") && document.activeElement !== $("#eCurCtc")) $("#eCurCtc").value = privCtc || "";
  if ($("#eOpenToMobility")) $("#eOpenToMobility").checked = !!me.openToMobility;

  const incomplete = !me.photoURL || !me.about || !me.company;
  $("#completeBanner")?.classList.toggle("hide", !incomplete);
  $("#profileBanner")?.classList.toggle("hide", !incomplete);
  refreshNotifBtn();
}
$("#saveProfile").onclick = async () => {
  const name = $("#eName").value.trim(); if (!name) return toast("Name cannot be empty");
  const data = {
    name,
    about: $("#eAbout").value.trim(),
    company: ($("#eCompany")?.value || "").trim(),
    designation: ($("#eDes")?.value || "").trim(),
    department: ($("#eDept")?.value || "").trim(),
    startYear: ($("#eStartYear")?.value || "").trim() === "" ? null : Number($("#eStartYear").value),
    dob: ($("#eDob")?.value || "").trim(),
    targetDesignation: ($("#eTargetDes")?.value || "").trim(),
    targetCtc: ($("#eTargetCtc")?.value || "").trim(),
    openToMobility: !!$("#eOpenToMobility")?.checked
  };
  const curCtc = ($("#eCurCtc")?.value || "").trim();
  try {
    await updateDoc(doc(db, "members", me.id), data);
    // Save current CTC privately (owner can write only this field)
    if (curCtc) {
      await setDoc(doc(db, "memberPrivate", me.id), { ctc: curCtc }, { merge: true });
    } else {
      // clear if emptied
      try {
        const p = await getDoc(doc(db, "memberPrivate", me.id));
        if (p.exists() && p.data().ctc) {
          await setDoc(doc(db, "memberPrivate", me.id), { ctc: "" }, { merge: true });
        }
      } catch {}
    }
    Object.assign(me, data);
    renderProfile();
    toast("Profile saved");
  } catch (e) {
    console.error(e);
    toast("Could not save");
  }
};
$("#avIn").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    toast("Uploading photo…");
    const r = sref(storage, `profiles/${me.id}/avatar.jpg`);
    await uploadBytes(r, await shrink(f, 384, 0.8), { contentType: "image/jpeg" });
    await updateDoc(doc(db, "members", me.id), { photoURL: (await getDownloadURL(r)) + "" });
    toast("Photo updated");
  } catch { toast("Photo upload failed"); }
});

/* ==================== RESUME (lazy) ==================== */
let resumeMod = null;
async function loadResume() {
  try {
    if (!resumeMod) resumeMod = await import("./resume.js");
    resumeMod.initResume(me);
  } catch (e) {
    console.error(e);
    toast("Could not load Resume builder");
  }
}

