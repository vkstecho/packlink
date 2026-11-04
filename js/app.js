
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limit, startAfter, serverTimestamp, writeBatch }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref as sref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { firebaseConfig, SUPER_ADMIN } from "./config.js";
import { $, $$, esc, linkify, colors, colorOf, initial, toast, sheet, closeSheet, confirmSheet, fmtTime, shrink } from "./utils.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); auth.languageCode = "en";
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const storage = getStorage(app);

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

onAuthStateChanged(auth, async (user) => {
  if (!user) { teardown(); $("#app").classList.add("hide"); $("#login").classList.add("hide"); $("#landing")?.classList.remove("hide"); showSplash(false); refreshInstallUI(); return; }
  try {
    const phone = user.phoneNumber;
    const mref = doc(db, "members", phone);
    let snap = null;
    try { snap = await getDoc(mref); } catch {}
    if (phone === SUPER_ADMIN && !(snap && snap.exists())) {
      await setDoc(mref, { mobile: phone, name: "Admin", company: "", designation: "", department: "", role: "admin", active: true, createdAt: serverTimestamp() });
      snap = await getDoc(mref);
    }
    if (!snap || !snap.exists() || snap.data().active === false) {
      await signOut(auth); loginErr("This number has not been added by the admin."); return;
    }
    if (booted) return;
    booted = true; me = { id: phone, ...snap.data() }; isAdmin = me.role === "admin" || phone === SUPER_ADMIN;
    $("#login").classList.add("hide"); $("#landing")?.classList.add("hide"); $("#app").classList.remove("hide"); refreshInstallUI();
    $("#tabAdmin").classList.toggle("hide", !isAdmin);
    // mark online / last active
    updateDoc(mref, { lastActive: serverTimestamp() }).catch(() => {});
    setInterval(() => { if (me) updateDoc(doc(db, "members", me.id), { lastActive: serverTimestamp() }).catch(() => {}); }, 120000);
    renderProfile(); startChat(); startJobs(); refreshNotifBtn();
    // live watch of own record: removed or role changed by admin -> apply instantly
    unsubs.push(onSnapshot(mref, (d) => {
      if (!d.exists() || d.data().active === false) { if (phone !== SUPER_ADMIN) { signOut(auth); toast("You were removed by the admin"); } return; }
      me = { id: phone, ...d.data() }; const a = me.role === "admin" || phone === SUPER_ADMIN;
      if (a !== isAdmin) { isAdmin = a; $("#tabAdmin").classList.toggle("hide", !a); renderJobs(); }
      renderProfile();
    }, () => { signOut(auth); }));
  } catch (e) { loginErr(niceErr(e)); await signOut(auth); }
  finally { showSplash(false); }
});
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
$("#logout").onclick = () => confirmSheet("Log out?", "You will need a new OTP to sign in again.", "Log out", () => signOut(auth));

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
  el.dataset.text = ((d.senderName || "") + " " + (d.text || "")).toLowerCase();
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
async function sendMsg(extra = {}) {
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


$("#imgIn").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    toast("Sending photo…");
    const blob = await shrink(f, 1280, 0.75);
    const r = sref(storage, `chat/${me.id}/${Date.now()}.jpg`);
    await uploadBytes(r, blob, { contentType: "image/jpeg" });
    await sendMsg({ imageURL: await getDownloadURL(r) });
  } catch (err) { toast("Photo failed to send"); }
});

/* ==================== MEMBERS ==================== */
let membersMap = new Map(), membersStarted = false, membersReady = null;
let memberDesFilter = "all";
function startMembers() {
  if (membersStarted) return membersReady; membersStarted = true;
  membersReady = new Promise((res) => {
    unsubs.push(onSnapshot(collection(db, "members"), (s) => {
      membersMap = new Map(s.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
      renderMembers(); renderAdmins(); res();
    }, () => res()));
  });
  return membersReady;
}
const avStyle = (m) => m.photoURL ? `background-image:url('${esc(m.photoURL)}')` : `background:${colorOf(m.id)}`;
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
function renderMembers() {
  const q = ($("#mSearch")?.value || "").trim().toLowerCase();
  renderDesFilters();
  const arr = [...membersMap.values()].filter((m) => {
    if (m.active === false) return false;
    if (memberDesFilter !== "all") {
      const d = (m.designation || "").trim();
      if (d !== memberDesFilter) return false;
    }
    if (q && ![m.name, m.company, m.designation, m.department, m.mobile].join(" ").toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (isOnline(b) - isOnline(a)) || (a.name || "").localeCompare(b.name || ""));
  $("#mList").innerHTML = arr.length ? arr.map((m) => `<button class="item" data-id="${esc(m.id)}"><div class="av" style="${avStyle(m)}">${m.photoURL ? "" : esc(initial(m.name))}</div><div><div class="t"><span class="dot ${isOnline(m) ? "" : "off"}"></span>${esc(m.name || m.id)}${m.role === "admin" ? '<span class="tag">Admin</span>' : ""}</div><div class="s">${esc([m.company, m.designation, m.department].filter(Boolean).join(" · ") || m.mobile)}${lastSeenText(m) ? " · " + lastSeenText(m) : ""}</div></div></button>`).join("") : `<div class="empty">No members found.<br><small>Try a different search or designation filter.</small></div>`;
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
$("#mList").addEventListener("click", (e) => { const b = e.target.closest(".item"); if (b) openMember(b.dataset.id); });

async function openMember(id) {
  const m = membersMap.get(id); if (!m) return;
  let priv = {};
  if (isAdmin) { try { const p = await getDoc(doc(db, "memberPrivate", id)); if (p.exists()) priv = p.data(); } catch {} }
  const kv = (k, v) => v ? `<div class="kv"><span>${k}</span><span>${esc(v)}</span></div>` : "";
  const isSuperM = id === SUPER_ADMIN;
  sheet(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><div class="av big" style="${avStyle(m)};width:64px;height:64px;font-size:26px">${m.photoURL ? "" : esc(initial(m.name))}</div><div><h3 style="margin:0">${esc(m.name || id)}</h3><div class="s" style="color:var(--muted)">${esc(m.about || "")}</div><div class="s" style="color:var(--muted);margin-top:2px"><span class="dot ${isOnline(m) ? "" : "off"}"></span>${esc(lastSeenText(m) || "Offline")}</div></div></div>
    ${kv("Mobile", m.mobile || id)}${kv("Company", m.company)}${kv("Designation", m.designation)}${kv("Department", m.department)}
    ${isAdmin ? kv("Email", priv.email) + kv("CTC", priv.ctc) + kv("Authority", priv.authority) : ""}
    <div class="acts"><a class="btn sm" href="tel:${esc(id)}" style="text-decoration:none">Call</a>
    <a class="btn sm amber" href="https://wa.me/${esc(String(id).replace(/\D/g, ""))}" target="_blank" rel="noopener" style="text-decoration:none">WhatsApp</a>
    ${isAdmin && !isSuperM ? `<button class="btn sm ghost" id="mRole">${m.role === "admin" ? "Remove admin" : "Make admin"}</button><button class="btn sm danger" id="mDel">Remove member</button>` : ""}
    <button class="btn sm ghost" onclick="document.getElementById('scrim').classList.remove('on')">Close</button></div>`);
  if (isAdmin && !isSuperM) {
    $("#mRole").onclick = () => { closeSheet(); updateDoc(doc(db, "members", id), { role: m.role === "admin" ? "member" : "admin" }).then(() => toast("Role updated")).catch(() => toast("Not allowed")); };
    $("#mDel").onclick = () => confirmSheet("Remove member?", `${m.name || id} will be logged out and can no longer sign in.`, "Remove", async () => {
      try { const b = writeBatch(db); b.delete(doc(db, "members", id)); b.delete(doc(db, "memberPrivate", id)); await b.commit(); toast("Member removed"); } catch { toast("Could not remove"); }
    });
  }
}
function renderAdmins() {
  const a = [...membersMap.values()].filter((m) => m.role === "admin");
  $("#admList").innerHTML = a.map((m) => `<button class="item" data-id="${esc(m.id)}"><div class="av" style="${avStyle(m)}">${m.photoURL ? "" : esc(initial(m.name))}</div><div><div class="t">${esc(m.name || m.id)}</div><div class="s">${esc(m.mobile || m.id)}</div></div></button>`).join("") || `<div class="empty">No admins yet.</div>`;
}
$("#admList").addEventListener("click", (e) => { const b = e.target.closest(".item"); if (b) openMember(b.dataset.id); });

/* ---------- admin: Excel upload ---------- */
function normPhone(v) {
  const raw = String(v ?? "").trim(), d = raw.replace(/\D/g, "");
  if (raw.startsWith("+") && !d.startsWith("91")) return d.length >= 8 && d.length <= 15 ? "+" + d : null;   // other countries
  if (raw.startsWith("00") && !d.startsWith("0091")) return d.length >= 10 && d.length <= 17 ? "+" + d.slice(2) : null;
  if (d.length === 10) return "+91" + d;
  if (d.length === 12 && d.startsWith("91")) return "+" + d;
  if (d.length === 11 && d[0] === "0") return "+91" + d.slice(1);
  return null;
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
    ["#aMob", "#aName", "#aCo", "#aDes", "#aDep"].forEach((s) => ($(s).value = "")); toast("Member added");
  } catch { toast("Could not add member"); }
};

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
    if (q && ![j.title, j.company, j.location, j.description].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
  $("#jList").innerHTML = arr.length ? arr.map((j) => {
    const interested = (j.interested || []).includes(me?.id);
    const icount = (j.interested || []).length;
    return `<div class="card job"><h3>${esc(j.title)}</h3><div class="co">${esc([j.company, j.location].filter(Boolean).join(" · "))}</div>${j.description ? `<div class="d">${linkify(j.description)}</div>` : ""}
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
   <div class="field"><label>Job title</label><input id="jT" maxlength="150"></div>
   <div class="field"><label>Company</label><input id="jC" value="${esc(me.company || "")}"></div>
   <div class="field"><label>Location</label><input id="jL"></div>
   <div class="field"><label>Details</label><textarea id="jD" rows="4" maxlength="2000"></textarea></div>
   <div class="field"><label>Contact number</label><input id="jN" type="tel" value="${esc(me.id)}"></div>
   <div class="acts"><button class="btn sm" id="jGo">Post job</button><button class="btn sm ghost" id="jNo">Cancel</button></div>`);
  $("#jNo").onclick = closeSheet;
  $("#jGo").onclick = async () => {
    const title = $("#jT").value.trim(); if (!title) return toast("Enter a job title");
    try {
      await addDoc(collection(db, "jobs"), { title, company: $("#jC").value.trim(), location: $("#jL").value.trim(), description: $("#jD").value.trim(), contact: $("#jN").value.trim(), postedBy: me.id, postedByName: me.name || me.id, createdAt: serverTimestamp(), interested: [] });
      closeSheet(); toast("Job posted");
    } catch { toast("Could not post job"); }
  };
};

/* ==================== PROFILE ==================== */
function renderProfile() {
  if (!me) return;
  $("#who").textContent = me.name || "";
  const av = $("#pAv"); av.style.cssText = avStyle(me); av.textContent = me.photoURL ? "" : initial(me.name);
  $("#pName").textContent = me.name || me.id;
  $("#pMeta").textContent = [me.company, me.designation, me.department].filter(Boolean).join(" · ");
  $("#pMobile").textContent = me.id + (isAdmin ? " · Admin" : "");
  if (document.activeElement !== $("#eName")) $("#eName").value = me.name || "";
  if (document.activeElement !== $("#eAbout")) $("#eAbout").value = me.about || "";
  if ($("#eCompany") && document.activeElement !== $("#eCompany")) $("#eCompany").value = me.company || "";
  if ($("#eDes") && document.activeElement !== $("#eDes")) $("#eDes").value = me.designation || "";
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
    designation: ($("#eDes")?.value || "").trim()
  };
  try { await updateDoc(doc(db, "members", me.id), data); toast("Profile saved"); } catch { toast("Could not save"); }
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

