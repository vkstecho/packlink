export const $ = (s) => document.querySelector(s);
export const $$ = (s) => [...document.querySelectorAll(s)];

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const LINK_RE =
  /(https?:\/\/[^\s<]+|www\.[^\s<]+)|([A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,})|(\+?\d[\d ()\-]{6,}\d)/g;

export function linkify(text = "") {
  const keep = [];
  const hold = (h) => "\uE000" + (keep.push(h) - 1) + "\uE001";
  let t = esc(text);
  t = t.replace(LINK_RE, (m, url, mail, tel, off, str) => {
    if (url) {
      const tail = (m.match(/[.,;:!?)\]]+$/) || [""])[0],
        u = tail ? m.slice(0, -tail.length) : m;
      return hold(`<a href="${/^www\./i.test(u) ? "https://" + u : u}" target="_blank" rel="noopener">${u}</a>`) + tail;
    }
    if (mail) return hold(`<a href="mailto:${mail}">${mail}</a>`);
    if (tel) {
      const prev = off > 0 ? str[off - 1] : "";
      const digits = tel.replace(/\D/g, "");
      if (/[\w@.\/]/.test(prev) || digits.length < 8 || digits.length > 15) return m;
      return hold(`<a href="tel:${(tel.trim().startsWith("+") ? "+" : "") + digits}">${tel}</a>`);
    }
    return m;
  });
  t = t.replace(/```([\s\S]+?)```/g, (m, c) => hold("<code>" + c + "</code>"));
  t = t
    .replace(/(^|[^\w*])\*([^*\n]+)\*(?![\w*])/g, "$1<b>$2</b>")
    .replace(/(^|[^\w_])_([^_\n]+)_(?![\w_])/g, "$1<i>$2</i>")
    .replace(/(^|[^\w~])~([^~\n]+)~(?![\w~])/g, "$1<s>$2</s>");
  return t.replace(/\uE000(\d+)\uE001/g, (m, i) => keep[+i]);
}

export const colors = ["#e26b00", "#1f7aec", "#a832c9", "#00897b", "#c2185b", "#6d4c41", "#5e35b1", "#2e7d32"];
export const colorOf = (s = "") => colors[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
export const initial = (n = "?") => (n.trim()[0] || "?").toUpperCase();

let toastT;
export const toast = (m) => {
  const t = $("#toast");
  if (!t) return;
  t.textContent = m;
  t.style.display = "block";
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.style.display = "none"), 2800);
};

export function sheet(html) {
  $("#sheet").innerHTML = html;
  $("#scrim").classList.add("on");
}
export function closeSheet() {
  $("#scrim").classList.remove("on");
}

export function confirmSheet(title, text, okLabel, fn, danger = true) {
  sheet(
    `<h3>${esc(title)}</h3><p style="color:var(--muted)">${esc(text)}</p><div class="acts"><button class="btn sm ${danger ? "danger" : ""}" id="cOk">${esc(okLabel)}</button><button class="btn sm ghost" id="cNo">Cancel</button></div>`
  );
  $("#cNo").onclick = closeSheet;
  $("#cOk").onclick = async () => {
    closeSheet();
    await fn();
  };
}

export const fmtTime = (ms) => {
  const d = new Date(ms),
    t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString()
    ? t
    : d.toLocaleDateString([], { day: "numeric", month: "short" }) + ", " + t;
};

export async function shrink(file, max, q) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, "image/jpeg", q));
}
