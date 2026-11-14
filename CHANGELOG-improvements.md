# PackLink Improvements (implemented)

Date: 2026-11-08

## 1. Image sending in group chat ✅
- Attach button (paperclip) next to the message box.
- Images are compressed (max ~1280px, JPEG) and uploaded to `chat/{phone}/{timestamp}.jpg`.
- Message bubbles already supported `imageURL`; sending is now enabled for all members (unless admin lock is on).
- Tap a photo in chat to view full-size.

## 2. WhatsApp-style admin chat controls ✅
- Admins see a **⚙ Settings** button in the chat toolbar.
- Toggle: **Only admins can send messages**.
- When locked:
  - Non-admins see a banner and the composer is disabled.
  - Firestore rules also block non-admin creates.
- Existing powers remain: delete any message, remove members, change roles.

## 3. User-editable Current CTC ✅
- Profile → “Your target & mobility” section now has **Current salary (CTC)**.
- Stored in `memberPrivate` (private: only the member + admins can see it).
- Rules updated so owners can write only the `ctc` field on their own private doc.
- Still shown in admin member view and Excel export.

## 4. Internal mobility signal (from blog) ✅
- Profile checkbox: **Open to internal training / cross-plant movement**.
- Saved as `openToMobility` on the member document.
- Shown as a blue badge on the Members list and in member detail sheet.
- Included in admin Excel export.

## 5. Skill-tagged job posts (from blog) ✅
- When posting a job:
  - **Required skills / tags** (comma-separated, e.g. `boat change, vacuum recovery`).
  - **Mark as urgent hire** checkbox.
- Job cards show skill chips and an “Urgent hire” tag.
- Search includes skills.
- New filter chip: **Urgent hire**.

## Files touched
- `index.html` — chat composer, profile fields, jobs search placeholder + urgent filter
- `css/app.css` — attach button, skill chips, urgent tag, mobility badge, composer disabled state
- `js/app.js` — image upload, chat settings, profile CTC/mobility, jobs skills/urgent, member badges
- `firestore.rules` — self CTC write, chat only-admins rule, `settings` collection, `openToMobility` allowed on self profile

## Deploy notes
1. Deploy updated `firestore.rules` and `storage.rules` (storage already allowed chat images).
2. Deploy the web assets (index.html, css, js).
3. No new indexes required for the settings doc or job skills (client-side filter/search).
4. First admin who opens Chat Settings will create `settings/chat` automatically.

## 6. Members multi-filter (Type → Company → Designation) ✅
- Three filter rows on Members page:
  1. **Type**: All / Employees / Vendors / Suppliers / Service Providers
  2. **Company**: dynamic chips from member `company` field (Uflex, Jindal, Bobst, YSR Engineering, …)
  3. **Designation**: job titles only (Operator, Engineer, TTE, Manager, …) — pure Vendor/Supplier labels moved under Type
- Type is derived client-side from designation + known vendor company names
- Free-text search still works across name/company/designation/department
- Excel export now includes a **Type** column

## 7. Excel data cleanup (companion file)
- Extracted real company names from Name when Company was "Vendor"/"Supplier"
  (Bobst, YSR Engineering, Shriram Enterprises, Aegios, Copeland, Seva Enterprises, etc.)
- Cleaned person name vs company name
- Added Type column in cleaned Excel for reference


## 8. Landing: 2600+ members + install choice ✅
- Hero shows **2600+ Verified Packaging Industry Members** and “Get yourself also verified”
- Eyebrow: **Made in India · For Indian Packaging Industry only**
- Install app opens a choice modal:
  - **Android** → Google Play Store (official-style Play icon) → https://play.google.com/store/apps/details?id=com.vkstech.packlink
  - **iOS / Windows** → existing PWA install prompt / help steps (Apple + Windows icons)
- Fixed install modal ID mismatch (`plInstallModal`)


## 9. Welcome + verify details after OTP ✅
- Registered members see a **Welcome** screen after OTP (once per device, or when name/company missing)
- Pre-filled: Name, Company, Designation, Department from database
- **Looks good — Continue** saves updates to Firestore
- **Skip for now** enters the app; can edit later in Profile
- Engaging greeting uses their name when available


## 10. Members filters: dropdowns (not chip walls) ✅
- Removed long Company / Designation chip lists that filled the screen
- Compact **alphabetical dropdowns**: Company · Department · Designation
- Type stays as short chips (All / Employees / Vendors / Suppliers / Service Providers)
- Active filter tags with clear (×) and Clear all
- Name filtering via the search box


## 11. Cascade filter dropdowns + Packaging Members label ✅
- **Employees** chip renamed to **Packaging Members**
- Company / Department / Designation dropdowns only list values that exist for the **selected Type**
- Cascade: Type → Company → Department → Designation (changing a parent clears children)
- Vendors / Suppliers / Service Providers show only their own companies, not plant companies


## 12. Profile photo not showing (white circle) ✅
- Root cause: `esc()` turned `&` in Firebase download URLs into `&amp;`, breaking `background-image`
- Fixed CSS URL helper; upload now updates `me.photoURL` and re-renders immediately
- Instant local preview while uploading; clearer error toasts
- Storage rules for `profiles/` slightly more tolerant of mobile content-types


## 13. Profile “Your current role” spacing fix (PackLink 3.0) ✅
- Labels and values were concatenating (e.g. `Current designationManager`) because `.kv` styles only applied inside `#sheet`.
- Added global `.kv` styles: flex row, gap, muted label, right-aligned value, subtle bottom border.
- Profile card and member detail sheets now share the same clean key-value layout.

## 14. PackLink 3.1 – Language, Plant field & Jobs polish ✅
- **Simpler language** across Profile (Career goals, Open to transfer / training, clearer CTC helpers)
- **New field: Plant / City** on profile (edit + display in current role card and header)
- Plant included in Members search
- Firestore rules updated so members can save `plant` on their own profile
- **Job form improved**: added Salary / CTC field, clearer labels and placeholders
- Job cards now show Exp · CTC · Qualification when available
- Better empty state and search placeholders (Members + Jobs)
- Profile banner copy simplified

## 15. PackLink 3.2 – Company mates & discovery ✅
- **My company** quick filter on Members (chip + active tag)
- Green banner: “X people from [Your Company] are already on PackLink” with one-tap **Show them**
- Company mates count updates live as members load
- Plant / City shown on member detail sheet and editable in admin member form
- Mobility label consistent: “Open to transfer”
- Filters reset cleanly on logout

## 16. PackLink 3.3 – Ease of use & discovery ✅
- **Welcome insight toast** after login: company colleagues count or new jobs this week
- Members directory starts loading in background (faster first open)
- **Jobs insight banner**: “X new jobs this week” / “X urgent hires” with one-tap View
- Clearer empty states on Jobs & Members with action buttons (Clear filters / Post a job)
- Smarter Profile completeness nudges (photo, about, company, plant)
- Job filter chips scoped correctly (#jFilters)

## 17. PackLink 3.4 – Landing page upgrade (mobile + desktop) ✅
- Clearer hero: “Find colleagues. Find packaging jobs.”
- Trust grid: company mates, jobs, no 1024 limit, free
- Feature cards updated for directory (plant/company), jobs (skills/urgent), WhatsApp limit
- New “Why not only WhatsApp?” comparison section
- Simpler “How to join” steps for pre-registered numbers
- Extra mid-page Log in CTA
- Responsive polish: 1-col mobile, 2-col tablet, 3-col desktop; full-width CTAs on small phones

## 18. PackLink 3.5 – Landing Hindi + WhatsApp invite ✅
- EN / हिन्दी language toggle on landing (saved in localStorage)
- Full landing copy in Hindi
- “Share with your WhatsApp group” block with live preview
- Share on WhatsApp (pre-filled message) + Copy message
- Invite text follows selected language and includes current site URL
